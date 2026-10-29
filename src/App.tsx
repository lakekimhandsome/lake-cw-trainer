import { useEffect, useRef, useState } from 'react'
import { InfiniteReceiver } from './components/InfiniteReceiver'
import { Radio } from 'lucide-react'
import { AnswerInput } from './components/AnswerInput'
import { AudioControls } from './components/AudioControls'
import { GradingResult } from './components/GradingResult'
import { SpeedControls } from './components/SpeedControls'
import { TransmitTrainer } from './components/TransmitTrainer'
import { Statistics } from './components/Statistics'
import { useMorseAudio } from './hooks/useMorseAudio'
import { generateProblem } from './lib/generator'
import { LEVEL_GUIDES } from './data/templates'
import { gradeAnswer } from './lib/grading'
import { applyPreset, defaultStatistics, loadSettings, loadTraining, recordGrade, recordInfinite, saveSettings, saveTraining } from './lib/storage'
import type { Grade, Settings } from './types'
import type { Snapshot } from './lib/account'

export default function App({ initialSnapshot, onSnapshot }: { initialSnapshot?: Snapshot; onSnapshot?: (snapshot: Snapshot) => void } = {}) {
  const [mode, setMode] = useState<'rx' | 'tx'>('rx')
  const [commonSettings, setSettings] = useState<Settings>(() => initialSnapshot?.settings ?? loadSettings())
  const [training, setTraining] = useState(() => initialSnapshot?.training ?? loadTraining())
  const preset = training.presets.find((item) => item.id === training.activePresetId)!
  const settings = { ...commonSettings, characterWpm: preset.characterWpm, effectiveWpm: preset.effectiveWpm }
  const autoPlayTimer = useRef<number | null>(null)
  const [problem, setProblem] = useState(() => generateProblem(commonSettings.level === 6 ? 1 : commonSettings.level, undefined, commonSettings.callsignsOnly))
  const [input, setInput] = useState('')
  const [previewingCharacter, setPreviewingCharacter] = useState(false)
  const [grade, setGrade] = useState<Grade | null>(null)
  const { isPlaying, isSignalOn, activeCharacterIndex, error: audioError, play, stop } = useMorseAudio()

  useEffect(() => { document.title = `Lake CW Trainer — ${mode.toUpperCase()} Mode` }, [mode])
  const snapshotChanged = useRef(onSnapshot)
  snapshotChanged.current = onSnapshot
  useEffect(() => {
    if (snapshotChanged.current) snapshotChanged.current({ settings: commonSettings, training })
    else { saveSettings(commonSettings); saveTraining(training) }
  }, [commonSettings, training])
  useEffect(() => () => { if (autoPlayTimer.current !== null) window.clearTimeout(autoPlayTimer.current) }, [])

  const stopPlayback = () => {
    if (autoPlayTimer.current !== null) window.clearTimeout(autoPlayTimer.current)
    stop()
    setPreviewingCharacter(false)
  }

  useEffect(() => {
    const handleEnter = (event: KeyboardEvent) => {
      if (mode === 'rx' && grade && event.key === 'Enter' && !event.isComposing) {
        event.preventDefault()
        nextProblem()
      }
    }
    window.addEventListener('keydown', handleEnter)
    return () => window.removeEventListener('keydown', handleEnter)
  })

  const nextProblem = () => {
    stopPlayback()
    const next = generateProblem(settings.level === 6 ? 1 : settings.level, problem.text, settings.callsignsOnly)
    setProblem(next); setInput(''); setGrade(null)
    if (mode === 'rx' && settings.autoPlay) autoPlayTimer.current = window.setTimeout(() => void play(next.text, settings), 60)
  }

  const updateSettings = (update: Partial<Settings>) => {
    stopPlayback()
    const next = { ...settings, ...update }
    setSettings(next)
    if ((update.level && update.level !== settings.level) || update.callsignsOnly !== undefined) {
      setProblem(generateProblem(next.level === 6 ? 1 : next.level, problem.text, next.callsignsOnly)); setInput(''); setGrade(null)
    }
  }

  const selectPreset = (characterWpm: number, effectiveWpm: number) => {
    stopPlayback()
    setTraining((current) => applyPreset(current, characterWpm, effectiveWpm))
    const next = generateProblem(settings.level === 6 ? 1 : settings.level, problem.text, settings.callsignsOnly)
    setProblem(next); setInput(''); setGrade(null)
  }

  const submit = () => {
    if (grade) { nextProblem(); return }
    const result = gradeAnswer(problem.text, input)
    setGrade(result)
    setTraining((current) => recordGrade(current, problem.level, result))
  }

  return <main className="app-shell">
    <header><a className="brand" href="/" aria-label="Lake CW Trainer 처음으로"><span className="brand-mark"><Radio size={22} aria-hidden="true" /></span><span>LAKE <b>CW TRAINER</b></span></a><div className="mode-switch" role="group" aria-label="훈련 모드"><button aria-pressed={mode === 'rx'} onClick={() => { stopPlayback(); setMode('rx') }}>수신 RX</button><button aria-pressed={mode === 'tx'} onClick={() => { stopPlayback(); if (settings.level === 6) updateSettings({ level: 1 }); setMode('tx') }}>송신 TX</button></div></header>
    <div className="layout">
      <section className="trainer-card">
        <div className="lesson-head"><div><div className="section-kicker">{mode === 'rx' ? '수신 훈련' : '송신 훈련'}</div><h1>{mode === 'rx' ? <>소리를 듣고<br />교신을 읽으세요.</> : <>키를 눌러<br />교신을 보내세요.</>}</h1></div><label className="level-select">난이도 <select value={settings.level} onChange={(event) => updateSettings({ level: Number(event.target.value) as Settings['level'] })}>{(mode === 'rx' ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5]).map((level) => <option key={level} value={level}>Level {level} · {LEVEL_GUIDES[level as Settings['level']].title}</option>)}</select></label></div>
        <p className="level-guide" aria-live="polite"><strong>Level {settings.level} · {LEVEL_GUIDES[settings.level].title}</strong><span>{mode === 'rx' ? LEVEL_GUIDES[settings.level].description : '제시된 교신을 모스 부호로 송신하세요. 단점·장점과 문자·단어 사이 간격을 연습합니다.'}</span></p>
        {mode === 'rx' && settings.level === 6 ? <InfiniteReceiver key={`${preset.id}:${settings.tone}:${settings.volume}`} settings={settings} best={preset.statistics.infiniteBest ?? 0} onGrade={(count) => setTraining((current) => recordInfinite(current, count))} /> : mode === 'tx' ? <TransmitTrainer key={`${problem.text}:${settings.characterWpm}:${settings.effectiveWpm}`} problem={problem} settings={settings} onNext={nextProblem} /> : <>
        <div className={`signal-panel ${isPlaying ? 'active' : ''}`}><div className="signal-label"><span className="signal-status"><i className={`signal-light${isSignalOn ? ' on' : ''}`} role="img" aria-label={isSignalOn ? '수신 신호 켜짐' : '수신 신호 꺼짐'} />{isPlaying ? 'RECEIVING' : 'READY'}</span><time>CH {settings.characterWpm} · EF {settings.effectiveWpm} WPM</time></div><div className="wave" aria-hidden="true">·· ·· ··· ·· ···· · ··· ·· ···</div><p>원문은 채점 후 표시됩니다.</p></div>
        <AudioControls isPlaying={isPlaying} onPlay={() => { stopPlayback(); void play(problem.text, settings) }} onStop={stopPlayback} onNext={() => nextProblem()} />
        <AnswerInput value={input} disabled={Boolean(grade)} onChange={setInput} onSubmit={submit} />
        {grade && <GradingResult grade={grade} translation={problem.translation} activeCharacterIndex={previewingCharacter ? null : activeCharacterIndex} />}
        </>}
      </section>
      <aside><SpeedControls key={preset.id} settings={settings} presets={training.presets} activePresetId={preset.id} onApplyPreset={selectPreset} onChange={updateSettings} showAutoPlay={mode === 'rx' && settings.level !== 6} showCallsignsOnly={settings.level === 2} /><Statistics statistics={preset.statistics} presetLabel={`${preset.characterWpm} / ${preset.effectiveWpm} WPM`} errors={training.errors} onPlayCharacter={(letter) => { stopPlayback(); setPreviewingCharacter(true); void play(letter, settings) }} onReset={() => {
        if (window.confirm('현재 프리셋의 학습 기록과 레벨 6 최고 기록을 초기화할까요? 공통 오답 기록은 유지됩니다.')) setTraining((current) => ({ ...current, presets: current.presets.map((item) => item.id === current.activePresetId ? { ...item, statistics: defaultStatistics() } : item) }))
      }} />{audioError && <p className="audio-error" role="alert">{audioError}</p>}</aside>
    </div>
    <footer>International Morse · Farnsworth timing · {onSnapshot ? 'Google 계정 저장' : '브라우저 로컬 저장'}</footer>
  </main>
}
