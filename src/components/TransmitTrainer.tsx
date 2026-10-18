import { useEffect, useRef, useState } from 'react'
import { useMorseAudio } from '../hooks/useMorseAudio'
import { gradeAnswer } from '../lib/grading'
import { applyTransmission, transmissionTiming } from '../lib/transmission'
import { GradingResult } from './GradingResult'
import type { Grade, Problem, Settings } from '../types'

type Props = { problem: Problem; settings: Settings; onNext: () => void }

export function TransmitTrainer({ problem, settings, onNext }: Props) {
  const [text, setText] = useState('')
  const [marks, setMarks] = useState('')
  const [pressed, setPressed] = useState(false)
  const [grade, setGrade] = useState<Grade | null>(null)
  const decoded = useRef('')
  const pending = useRef('')
  const active = useRef<{ source: string; at: number } | null>(null)
  const timers = useRef<number[]>([])
  const pad = useRef<HTMLButtonElement>(null)
  const { startTone, stop, error } = useMorseAudio()
  const timing = transmissionTiming(settings.characterWpm, settings.effectiveWpm)

  const clearTimers = () => { timers.current.forEach(window.clearTimeout); timers.current = [] }
  const flushLetter = () => {
    if (!pending.current) return
    decoded.current = applyTransmission(decoded.current, pending.current)
    pending.current = ''
    setText(decoded.current); setMarks('')
  }
  const cancel = () => {
    active.current = null
    clearTimers(); stop(); setPressed(false)
    flushLetter()
  }
  const down = (source: string) => {
    if (active.current || grade) return
    clearTimers()
    active.current = { source, at: performance.now() }
    setPressed(true)
    void startTone(settings)
  }
  const up = (source: string) => {
    if (active.current?.source !== source) return
    const duration = performance.now() - active.current.at
    active.current = null
    stop(); setPressed(false)
    pending.current += timing.mark(duration)
    setMarks(pending.current)
    timers.current = [
      window.setTimeout(flushLetter, timing.letterGap),
      window.setTimeout(() => {
        flushLetter()
        if (decoded.current && !decoded.current.endsWith(' ')) {
          decoded.current += ' '
          setText(decoded.current)
        }
      }, timing.wordGap),
    ]
  }

  useEffect(() => {
    const keyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && !event.isComposing) {
        event.preventDefault()
        if (!event.repeat) grade ? onNext() : submit()
        return
      }
      // Tab keeps the controls reachable; browser and OS shortcuts keep their normal behavior.
      if (event.key === 'Tab' || event.isComposing || event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (target?.closest('input, select, textarea, a, button, [contenteditable="true"]') && target !== pad.current) return
      event.preventDefault()
      if (!event.repeat) down(`key:${event.code}`)
    }
    const keyUp = (event: KeyboardEvent) => {
      if (active.current?.source === `key:${event.code}`) { event.preventDefault(); up(`key:${event.code}`) }
    }
    const hide = () => { if (document.hidden) cancel() }
    window.addEventListener('keydown', keyDown)
    window.addEventListener('keyup', keyUp)
    window.addEventListener('blur', cancel)
    document.addEventListener('visibilitychange', hide)
    return () => {
      window.removeEventListener('keydown', keyDown)
      window.removeEventListener('keyup', keyUp)
      window.removeEventListener('blur', cancel)
      document.removeEventListener('visibilitychange', hide)
    }
  })
  useEffect(() => () => { clearTimers(); stop() }, [stop])
  useEffect(() => { if (!grade) pad.current?.focus() }, [grade])

  const reset = () => {
    cancel(); decoded.current = ''; pending.current = ''
    setText(''); setMarks(''); setGrade(null)
    pad.current?.focus()
  }
  const submit = () => {
    cancel()
    setGrade(gradeAnswer(problem.text, decoded.current))
  }

  return <div className="transmit-trainer">
    <div className="tx-prompt"><span className="section-kicker">이 문장을 송신하세요</span><p>{problem.text}</p><small>{problem.translation}</small></div>
    <p className="tx-guide">Enter를 제외한 키를 짧게 누르면 단점(·), 길게 누르면 장점(−)입니다. Enter는 채점하고, 채점 후에는 다음 문제로 넘어갑니다. 모바일에서는 아래 키 영역을 누르세요. 문자와 단어는 쉬는 시간으로 구분합니다. 단점 8개(........)를 이어 보내면 직전 문자를 지웁니다.</p>
    <p className="tx-timing">단점 {Math.round(timing.dit)} ms · 장점 {Math.round(timing.dah)} ms<br />문자 사이 {Math.round(timing.letterPause)} ms · 단어 사이 {Math.round(timing.wordPause)} ms</p>
    <button ref={pad} type="button" className={`key-pad ${pressed ? 'pressed' : ''}`} aria-label="모스 송신 키" aria-pressed={pressed} disabled={Boolean(grade)}
      onPointerDown={(event) => { if (event.button !== 0) return; event.preventDefault(); event.currentTarget.focus(); event.currentTarget.setPointerCapture(event.pointerId); down(`pointer:${event.pointerId}`) }}
      onPointerUp={(event) => up(`pointer:${event.pointerId}`)}
      onPointerCancel={cancel} onLostPointerCapture={() => { if (active.current?.source.startsWith('pointer:')) cancel() }}
      onContextMenu={(event) => event.preventDefault()} onBlur={cancel}>
      <span>{pressed ? 'TRANSMITTING' : grade ? 'COMPLETE' : 'HOLD TO SEND'}</span>
      <strong>{pressed ? '송신 중' : '키 영역'}</strong><small>Enter 외 키보드 · 터치 · 마우스</small>
    </button>
    <div className="tx-output"><span className="section-kicker">판독 결과</span><p aria-live="polite">{text || (marks ? '' : '입력한 부호가 여기에 표시됩니다.')}<b>{marks.replaceAll('.', '·').replaceAll('-', '−')}</b></p></div>
    {error && <p className="audio-error" role="alert">{error}</p>}
    <div className="controls"><button className="play-button" disabled={!text.trim() && !marks} onClick={grade ? onNext : submit}>{grade ? '다음 문제' : '송신 채점'}</button><button className="secondary-button" onClick={reset}>다시 입력</button>{!grade && <button className="secondary-button" onClick={onNext}>다음 문제</button>}</div>
    {grade && <GradingResult grade={grade} translation={problem.translation} />}
    <p className="preset-hint">속도 설정에 맞춰 판독합니다. Tab으로 설정을 이동할 수 있으며 시스템 단축키는 제외됩니다. 송신 결과는 수신 통계에 포함되지 않습니다.</p>
  </div>
}
