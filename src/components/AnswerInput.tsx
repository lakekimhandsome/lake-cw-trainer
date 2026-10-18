import { useEffect, useRef } from 'react'
import { CornerDownLeft } from 'lucide-react'

type Props = { value: string; disabled: boolean; onChange: (value: string) => void; onSubmit: () => void }
export function AnswerInput({ value, disabled, onChange, onSubmit }: Props) {
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => { if (!disabled) input.current?.focus() }, [disabled])
  return <form className="answer-form" onSubmit={(event) => { event.preventDefault(); onSubmit() }}>
    <label htmlFor="answer">들은 내용을 입력하세요</label>
    <div className="answer-line"><input ref={input} id="answer" value={value} disabled={disabled} autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="예: CQ CQ DE HL1ABC K" onChange={(event) => onChange(event.target.value.toUpperCase())} />
      <button className="submit-button" type="submit" disabled={disabled || !value.trim()}>정답 확인 <kbd aria-label="Enter"><CornerDownLeft size={12} aria-hidden="true" /></kbd></button></div>
  </form>
}
