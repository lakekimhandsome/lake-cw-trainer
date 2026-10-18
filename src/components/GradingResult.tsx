import type { Grade } from '../types'

export function GradingResult({ grade }: { grade: Grade }) {
  return <section className={`result ${grade.correct ? 'perfect' : ''}`} aria-live="polite">
    <div className="result-top"><span>{grade.correct ? '완벽합니다' : '다시 확인해 보세요'}</span><strong>{grade.accuracy}%</strong></div>
    <p className="answer-label">정답 <code>{grade.normalizedAnswer}</code></p>
    <p className="diff" aria-label="입력 비교 결과">{grade.parts.map((part, index) => <span key={`${part.value}-${index}`} className={part.kind}>{part.kind === 'missing' ? `(${part.value})` : part.value}</span>)}</p>
    <small>초록: 일치 · 앰버: 치환 · 밑줄: 누락 · 빨강: 추가</small>
  </section>
}
