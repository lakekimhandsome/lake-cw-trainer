import { useEffect, useRef, useState } from 'react'
import { Radio } from 'lucide-react'
import { AnswerInput } from './components/AnswerInput'
import { AudioControls } from './components/AudioControls'
import { GradingResult } from './components/GradingResult'
import { SpeedControls } from './components/SpeedControls'
import { Statistics } from './components/Statistics'
import { useMorseAudio } from './hooks/useMorseAudio'
import { generateProblem } from './lib/generator'
import { LEVEL_GUIDES } from './data/templates'
import { gradeAnswer } from './lib/grading'
import { applyPreset, defaultStatistics, loadSettings, loadTraining, recordGrade, saveSettings, saveTraining } from './lib/storage'
import type { Grade, Level, Settings } from './types'

export default function App() {
  const [commonSettings, setSettings] = useState<Settings>(loadSettings)
  const [training, setTraining] = useState(loadTraining)
  const preset = training.presets.find((item) => item.id === training.activePresetId)!
  const settings = { ...commonSettings, characterWpm: preset.characterWpm, effectiveWpm: preset.effectiveWpm }
  const autoPlayTimer = useRef<number | null>(null)
  const [problem, setProblem] = useState(() => generateProblem(loadSettings().level))
  const [input, setInput] = useState('')
  const [grade, setGrade] = useState<Grade | null>(null)
  const { isPlaying, error: audioError, play, stop } = useMorseAudio()

  useEffect(() => saveSettings(commonSettings), [commonSettings])
  useEffect(() => saveTraining(training), [training])
  useEffect(() => () => { if (autoPlayTimer.current !== null) window.clearTimeout(autoPlayTimer.current) }, [])

  const stopPlayback = () => {
    if (autoPlayTimer.current !== null) window.clearTimeout(autoPlayTimer.current)
    stop()
  }

  useEffect(() => {
    const handleEnter = (event: KeyboardEvent) => {
      if (grade && event.key === 'Enter' && !event.isComposing) {
        event.preventDefault()
        nextProblem()
      }
    }
    window.addEventListener('keydown', handleEnter)
    return () => window.removeEventListener('keydown', handleEnter)
  })

  const nextProblem = () => {
    stopPlayback()
    const next = generateProblem(settings.level, problem.text)
    setProblem(next); setInput(''); setGrade(null)
    if (settings.autoPlay) autoPlayTimer.current = window.setTimeout(() => void play(next.text, settings), 60)
  }

  const updateSettings = (update: Partial<Settings>) => {
    stopPlayback()
    const next = { ...settings, ...update }
    setSettings(next)
    if (update.level && update.level !== settings.level) {
      setProblem(generateProblem(update.level, problem.text)); setInput(''); setGrade(null)
    }
  }

  const selectPreset = (characterWpm: number, effectiveWpm: number) => {
    stopPlayback()
    setTraining((current) => applyPreset(current, characterWpm, effectiveWpm))
    const next = generateProblem(settings.level, problem.text)
    setProblem(next); setInput(''); setGrade(null)
  }

  const submit = () => {
    if (grade) { nextProblem(); return }
    const result = gradeAnswer(problem.text, input)
    setGrade(result)
    setTraining((current) => recordGrade(current, problem.level, result))
  }

  return <main className="app-shell">
    <header><a className="brand" href="/" aria-label="Lake CW Trainer 처음으로"><span className="brand-mark"><Radio size={22} aria-hidden="true" /></span><span>LAKE <b>CW TRAINER</b></span></a><div className="mode-pill"><i /> RX MODE</div></header>
    <div className="layout">
      <section className="trainer-card">
        <div className="lesson-head"><div><div className="section-kicker">수신 훈련</div><h1>소리를 듣고<br />교신을 읽으세요.</h1></div><label className="level-select">난이도 <select value={settings.level} onChange={(event) => updateSettings({ level: Number(event.target.value) as Level })}>{[1, 2, 3, 4, 5].map((level) => <option key={level} value={level}>Level {level} · {LEVEL_GUIDES[level as Level].title}</option>)}</select></label></div>
        <p className="level-guide" aria-live="polite"><strong>Level {settings.level} · {LEVEL_GUIDES[settings.level].title}</strong><span>{LEVEL_GUIDES[settings.level].description}</span></p>
        <div className={`signal-panel ${isPlaying ? 'active' : ''}`}><div className="signal-label"><span>{isPlaying ? 'RECEIVING' : 'READY'}</span><time>CH {settings.characterWpm} · EF {settings.effectiveWpm} WPM</time></div><div className="wave" aria-hidden="true">·· ·· ··· ·· ···· · ··· ·· ···</div><p>원문은 채점 후 표시됩니다.</p></div>
        <AudioControls isPlaying={isPlaying} onPlay={() => void play(problem.text, settings)} onStop={stopPlayback} onNext={() => nextProblem()} />
        {audioError && <p className="audio-error" role="alert">{audioError}</p>}
        <AnswerInput value={input} disabled={Boolean(grade)} onChange={setInput} onSubmit={submit} />
        {grade && <GradingResult grade={grade} translation={problem.translation} />}
      </section>
      <aside><SpeedControls key={preset.id} settings={settings} presets={training.presets} activePresetId={preset.id} onApplyPreset={selectPreset} onChange={updateSettings} /><Statistics statistics={preset.statistics} presetLabel={`${preset.characterWpm} / ${preset.effectiveWpm} WPM`} errors={training.errors} onReset={() => {
        if (window.confirm('현재 프리셋의 학습 기록을 초기화할까요? 공통 오답 기록은 유지됩니다.')) setTraining((current) => ({ ...current, presets: current.presets.map((item) => item.id === current.activePresetId ? { ...item, statistics: defaultStatistics() } : item) }))
      }} /></aside>
    </div>
    <footer>International Morse · Farnsworth timing · 브라우저 로컬 저장</footer>
  </main>
}
