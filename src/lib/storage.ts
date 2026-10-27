import type { Grade, Level, Settings, Statistics, Training } from '../types'

const settingsKey = 'lake-cw-settings'
const statsKey = 'lake-cw-statistics'
const trainingKey = 'lake-cw-training-v1'

export const defaultSettings: Settings = { characterWpm: 20, effectiveWpm: 10, tone: 700, volume: 50, autoPlay: false, level: 1, callsignsOnly: false }
export const defaultStatistics = (): Statistics => ({ infiniteBest: 0, total: 0, perfect: 0, totalAccuracy: 0, streak: 0, byLevel: { 1: { total: 0, perfect: 0 }, 2: { total: 0, perfect: 0 }, 3: { total: 0, perfect: 0 }, 4: { total: 0, perfect: 0 }, 5: { total: 0, perfect: 0 } } })

function load<T>(key: string, fallback: T): T {
  try { return { ...fallback, ...JSON.parse(localStorage.getItem(key) ?? '{}') } } catch { return fallback }
}
export const loadSettings = () => load(settingsKey, defaultSettings)
export const saveSettings = (value: Settings) => localStorage.setItem(settingsKey, JSON.stringify(value))
export const saveTraining = (value: Training) => localStorage.setItem(trainingKey, JSON.stringify(value))

export const presetId = (characterWpm: number, effectiveWpm: number) => `${characterWpm}-${effectiveWpm}`

export function loadTraining(): Training {
  try {
    const saved = JSON.parse(localStorage.getItem(trainingKey) ?? 'null') as Training | null
    if (saved && Array.isArray(saved.presets) && saved.presets.length && saved.presets.some((preset) => preset.id === saved.activePresetId)) return saved
  } catch { /* Recover from unreadable storage using the original records. */ }
  const settings = loadSettings()
  const { errors, ...statistics } = load(statsKey, { ...defaultStatistics(), errors: {} as Record<string, number> })
  const id = presetId(settings.characterWpm, settings.effectiveWpm)
  return { activePresetId: id, presets: [{ id, characterWpm: settings.characterWpm, effectiveWpm: settings.effectiveWpm, statistics }], errors }
}

export function applyPreset(training: Training, characterWpm: number, effectiveWpm: number): Training {
  if (!Number.isInteger(characterWpm) || characterWpm < 5 || characterWpm > 40 || !Number.isInteger(effectiveWpm) || effectiveWpm < 5 || effectiveWpm > characterWpm) throw new Error('Invalid preset speed')
  const id = presetId(characterWpm, effectiveWpm)
  return { ...training, activePresetId: id, presets: training.presets.some((preset) => preset.id === id) ? training.presets : [...training.presets, { id, characterWpm, effectiveWpm, statistics: defaultStatistics() }] }
}

export function recordGrade(training: Training, level: Level, result: Grade): Training {
  const errors = { ...training.errors }
  result.errors.filter((letter) => letter.trim()).forEach((letter) => { errors[letter] = (errors[letter] ?? 0) + 1 })
  return { ...training, errors, presets: training.presets.map((preset) => {
    if (preset.id !== training.activePresetId) return preset
    const current = preset.statistics
    const levelStats = current.byLevel[level]
    return { ...preset, statistics: { ...current, total: current.total + 1, perfect: current.perfect + Number(result.correct), totalAccuracy: current.totalAccuracy + result.accuracy, streak: result.correct ? current.streak + 1 : 0, byLevel: { ...current.byLevel, [level]: { total: levelStats.total + 1, perfect: levelStats.perfect + Number(result.correct) } } } }
  }) }
}

export function recordInfinite(training: Training, count: number): Training {
  return { ...training, presets: training.presets.map((preset) => preset.id === training.activePresetId
    ? { ...preset, statistics: { ...preset.statistics, infiniteBest: Math.max(preset.statistics.infiniteBest ?? 0, count) } }
    : preset) }
}
