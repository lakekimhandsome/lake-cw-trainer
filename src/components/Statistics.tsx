import { Trash2 } from 'lucide-react'
import type { Statistics as StatisticsType } from '../types'

export function Statistics({ statistics, presetLabel, errors, onReset }: { statistics: StatisticsType; presetLabel: string; errors: Record<string, number>; onReset: () => void }) {
  const average = statistics.total ? Math.round(statistics.totalAccuracy / statistics.total) : 0
  const frequent = Object.entries(errors).sort((a, b) => b[1] - a[1])
  return <section className="statistics-card">
    <div className="section-heading"><div><div className="section-kicker">학습 기록</div><h2>진행 상황</h2><p className="preset-hint">{presetLabel} 프리셋</p></div><button className="text-button" onClick={onReset} aria-label="학습 기록 초기화" title="학습 기록 초기화"><Trash2 size={18} aria-hidden="true" /></button></div>
    <div className="metric-grid"><div><strong>{statistics.total}</strong><span>풀이 문제</span></div><div><strong>{statistics.perfect}</strong><span>완전 정답</span></div><div><strong>{average}%</strong><span>평균 정확도</span></div><div><strong>{statistics.streak}</strong><span>연속 정답</span></div></div>
    <div className="level-rates"><span>난이도별 완전 정답</span>{([1, 2, 3, 4, 5] as const).map((level) => { const value = statistics.byLevel[level]; return <div key={level}><b>L{level}</b><i><em style={{ width: `${value.total ? value.perfect / value.total * 100 : 0}%` }} /></i><small>{value.perfect}/{value.total}</small></div> })}</div>
    {frequent.length > 0 && <div className="mistakes"><span>자주 틀린 문자</span>{frequent.map(([letter, count]) => <b key={letter}>{letter} <small>{count}</small></b>)}</div>}
  </section>
}
