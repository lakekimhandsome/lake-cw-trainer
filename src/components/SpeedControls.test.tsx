import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import { defaultSettings, defaultStatistics, presetId } from '../lib/storage'
import { SpeedControls } from './SpeedControls'

it('sorts preset options by CH then EF without mutating presets or changing selection', () => {
  const presets = [[30, 5], [20, 15], [5, 5], [20, 10], [10, 10]].map(([characterWpm, effectiveWpm]) => ({
    id: presetId(characterWpm, effectiveWpm), characterWpm, effectiveWpm, statistics: defaultStatistics(),
  }))
  const original = presets.map((preset) => preset.id)
  const html = renderToStaticMarkup(<SpeedControls settings={defaultSettings} presets={presets} activePresetId="20-10" onApplyPreset={vi.fn()} onChange={vi.fn()} />)
  expect([...html.matchAll(/<option value="([^"]+)"/g)].map((match) => match[1])).toEqual(['5-5', '10-10', '20-10', '20-15', '30-5'])
  expect(html).toContain('<option value="20-10" selected="">')
  expect(presets.map((preset) => preset.id)).toEqual(original)
})
