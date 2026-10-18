import type { Statistics as StatisticsType } from '../types'

export function Statistics({ statistics, onReset }: { statistics: StatisticsType; onReset: () => void }) {
  const average = statistics.total ? Math.round(statistics.totalAccuracy / statistics.total) : 0
  const frequent = Object.entries(statistics.errors).sort((a, b) => b[1] - a[1]).slice(0, 4)
  return <section className="statistics-card">
    <div className="section-heading"><div><div className="section-kicker">학습 기록</div><h2>진행 상황</h2></div><button className="text-button" onClick={onReset}>초기화</button></div>
    <div className="metric-grid"><div><strong>{statistics.total}</strong><span>풀이 문제</span></div><div><strong>{statistics.perfect}</strong><span>완전 정답</span></div><div><strong>{average}%</strong><span>평균 정확도</span></div><div><strong>{statistics.streak}</strong><span>연속 정답</span></div></div>
    <div className="level-rates"><span>난이도별 완전 정답</span>{([1, 2, 3, 4, 5] as const).map((level) => { const value = statistics.byLevel[level]; return <div key={level}><b>L{level}</b><i><em style={{ width: `${value.total ? value.perfect / value.total * 100 : 0}%` }} /></i><small>{value.perfect}/{value.total}</small></div> })}</div>
    {frequent.length > 0 && <div className="mistakes"><span>자주 틀린 문자</span>{frequent.map(([letter, count]) => <b key={letter}>{letter} <small>{count}</small></b>)}</div>}
  </section>
}
