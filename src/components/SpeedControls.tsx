import { useState } from 'react'
import type { Preset, Settings } from '../types'

type Props = { settings: Settings; presets: Preset[]; activePresetId: string; onApplyPreset: (characterWpm: number, effectiveWpm: number) => void; onChange: (next: Partial<Settings>) => void }
const Slider = ({ label, value, min, max, unit, onChange }: { label: string; value: number; min: number; max: number; unit: string; onChange: (value: number) => void }) => <label className="slider-row">
  <span><strong>{label}</strong><em>{value} {unit}</em></span>
  <input type="range" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} />
</label>

export function SpeedControls({ settings, presets, activePresetId, onApplyPreset, onChange }: Props) {
  const [speed, setSpeed] = useState({ characterWpm: settings.characterWpm, effectiveWpm: settings.effectiveWpm })
  const changed = speed.characterWpm !== settings.characterWpm || speed.effectiveWpm !== settings.effectiveWpm
  return <section className="settings-card" aria-label="CW 설정">
    <div className="section-kicker">속도 프리셋</div>
    <label className="preset-select">프리셋<select value={activePresetId} onChange={(event) => { const preset = presets.find((item) => item.id === event.target.value)!; onApplyPreset(preset.characterWpm, preset.effectiveWpm) }}>{presets.map((preset) => <option key={preset.id} value={preset.id}>{preset.characterWpm} / {preset.effectiveWpm} WPM</option>)}</select></label>
    <Slider label="문자 속도" value={speed.characterWpm} min={5} max={40} unit="WPM" onChange={(characterWpm) => setSpeed({ characterWpm, effectiveWpm: Math.min(characterWpm, speed.effectiveWpm) })} />
    <Slider label="실효 속도" value={speed.effectiveWpm} min={5} max={speed.characterWpm} unit="WPM" onChange={(effectiveWpm) => setSpeed({ ...speed, effectiveWpm })} />
    <button className="secondary-button preset-save" disabled={!changed} onClick={() => onApplyPreset(speed.characterWpm, speed.effectiveWpm)}>프리셋 저장 및 적용</button>
    <p className="preset-hint">저장 및 적용하면 새 문제로 시작합니다.</p>
    <div className="section-kicker common-heading">신호 설정</div>
    <Slider label="톤" value={settings.tone} min={400} max={1000} unit="Hz" onChange={(tone) => onChange({ tone })} />
    <Slider label="볼륨" value={settings.volume} min={0} max={100} unit="%" onChange={(volume) => onChange({ volume })} />
    <label className="switch-row"><span><strong>자동 재생</strong><small>다음 문제에서 자동으로 시작</small></span><input className="toggle-switch" type="checkbox" checked={settings.autoPlay} onChange={(event) => onChange({ autoPlay: event.target.checked })} /></label>
  </section>
}
