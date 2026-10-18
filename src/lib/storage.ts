import type { Settings, Statistics } from '../types'

const settingsKey = 'lake-cw-settings'
const statsKey = 'lake-cw-statistics'

export const defaultSettings: Settings = { characterWpm: 20, effectiveWpm: 10, tone: 700, volume: 50, autoPlay: false, level: 1 }
export const defaultStatistics = (): Statistics => ({ total: 0, perfect: 0, totalAccuracy: 0, streak: 0, errors: {}, byLevel: { 1: { total: 0, perfect: 0 }, 2: { total: 0, perfect: 0 }, 3: { total: 0, perfect: 0 }, 4: { total: 0, perfect: 0 }, 5: { total: 0, perfect: 0 } } })

function load<T>(key: string, fallback: T): T {
  try { return { ...fallback, ...JSON.parse(localStorage.getItem(key) ?? '{}') } } catch { return fallback }
}
export const loadSettings = () => load(settingsKey, defaultSettings)
export const loadStatistics = () => load(statsKey, defaultStatistics())
export const saveSettings = (value: Settings) => localStorage.setItem(settingsKey, JSON.stringify(value))
export const saveStatistics = (value: Statistics) => localStorage.setItem(statsKey, JSON.stringify(value))
