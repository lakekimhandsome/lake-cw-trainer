import { useRef, useState } from 'react'
import { useMorseAudio } from '../hooks/useMorseAudio'
import { gradeInfinite, randomCharacter } from '../lib/infinite'
import type { Settings } from '../types'

export function InfiniteReceiver({ settings }: { settings: Settings }) {
  const { isPlaying, isSignalOn, error, play, stop } = useMorseAudio()
  const [input, setInput] = useState('')
  const [started, setStarted] = useState(false)
  const [result, setResult] = useState<ReturnType<typeof gradeInfinite> | null>(null)
  const field = useRef<HTMLTextAreaElement>(null)

  const start = () => {
    setInput(''); setResult(null); setStarted(true)
    void play(randomCharacter, settings)
    field.current?.focus()
  }
  const finish = () => {
    const answer = stop()
    setResult(gradeInfinite(answer, input))
    setStarted(false)
  }

  return <div className="infinite-receiver">
    <div className={`signal-panel ${isPlaying ? 'active' : ''}`}>
      <div className="signal-label"><span className="signal-status"><i className={`signal-light${isSignalOn ? ' on' : ''}`} role="img" aria-label={isSignalOn ? '수신 신호 켜짐' : '수신 신호 꺼짐'} />{isPlaying ? 'RECEIVING ∞' : 'READY'}</span><time>CH {settings.characterWpm} · EF {settings.effectiveWpm} WPM</time></div>
      <div className="wave" aria-hidden="true">·· ·· ··· ·· ···· · ··· ·· ···</div>
      <p>알파벳 A–Z · 숫자 0–9 · 종료할 때까지 계속 수신</p>
    </div>
    <div className="controls">
      <button className="play-button" onClick={started && !error ? finish : start}>{started && !error ? '종료 및 채점' : result ? '다시 시작' : '수신 시작'}</button>
      <button className="secondary-button" onClick={() => {
        if (result?.expected) void play(result.expected, settings)
      }} disabled={!result?.expected}>다시 듣기</button>
    </div>
    {error && <p className="audio-error" role="alert">{error}</p>}
    <div className="answer-form">
      <label htmlFor="infinite-answer">들은 내용을 띄어쓰기 없이 입력하세요</label>
      <textarea ref={field} id="infinite-answer" value={input} readOnly={!started} autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="예: A7KB2Z" onChange={(event) => setInput(event.target.value.toUpperCase())} />
    </div>
    <p className="preset-hint">종료 시 끝까지 들은 문자만 채점합니다. 공백과 대소문자는 구분하지 않습니다. 설정을 바꾸면 현재 수신이 초기화됩니다.</p>
    {result && <section className={`result ${result.correct ? 'perfect' : ''}`} aria-live="polite">
      <div className="result-top"><span>연속 정답</span><strong>{result.count}자</strong></div>
      <p className="answer-label">{result.correct ? '전체 일치' : `${result.count + 1}번째 문자에서 최초 불일치`}</p>
      <p className="answer-label">정답</p><pre className="diff">{result.expected || '(없음)'}{!result.correct && result.expected.length === result.count && ' [끝]'}</pre>
      <p className="answer-label">답안</p><pre className="diff">{result.actual || '(없음)'}{!result.correct && result.actual.length === result.count && ' [누락]'}</pre>
    </section>}
  </div>
}
