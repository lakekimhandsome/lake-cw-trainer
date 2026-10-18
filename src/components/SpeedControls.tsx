import type { Settings } from '../types'

type Props = { settings: Settings; onChange: (next: Partial<Settings>) => void }
const Slider = ({ label, value, min, max, unit, onChange }: { label: string; value: number; min: number; max: number; unit: string; onChange: (value: number) => void }) => <label className="slider-row">
  <span><strong>{label}</strong><em>{value} {unit}</em></span>
  <input type="range" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} />
</label>

export function SpeedControls({ settings, onChange }: Props) {
  return <section className="settings-card" aria-label="CW 설정">
    <div className="section-kicker">송신 설정</div>
    <Slider label="Character Speed" value={settings.characterWpm} min={5} max={40} unit="WPM" onChange={(characterWpm) => onChange({ characterWpm, effectiveWpm: Math.min(characterWpm, settings.effectiveWpm) })} />
    <Slider label="Effective Speed" value={settings.effectiveWpm} min={5} max={settings.characterWpm} unit="WPM" onChange={(effectiveWpm) => onChange({ effectiveWpm })} />
    <Slider label="Tone" value={settings.tone} min={400} max={1000} unit="Hz" onChange={(tone) => onChange({ tone })} />
    <Slider label="Volume" value={settings.volume} min={0} max={100} unit="%" onChange={(volume) => onChange({ volume })} />
    <label className="switch-row"><span><strong>자동 재생</strong><small>다음 문제에서 자동으로 시작</small></span><input type="checkbox" checked={settings.autoPlay} onChange={(event) => onChange({ autoPlay: event.target.checked })} /></label>
  </section>
}
