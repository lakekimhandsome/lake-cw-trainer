import { beforeEach, describe, expect, it, vi } from 'vitest'
import { gradeAnswer } from './grading'
import { applyPreset, defaultStatistics, loadSettings, loadTraining, recordGrade, recordInfinite, saveSettings, saveTraining } from './storage'

describe('preset storage', () => {
  beforeEach(() => {
    const values = new Map<string, string>()
    vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) })
  })

  it('moves legacy progress to the current speed and keeps shared mistakes', () => {
    localStorage.setItem('lake-cw-settings', JSON.stringify({ characterWpm: 25, effectiveWpm: 15, tone: 800, volume: 30, autoPlay: true }))
    const statistics = { ...defaultStatistics(), total: 4, perfect: 2, totalAccuracy: 300, streak: 2 }
    localStorage.setItem('lake-cw-statistics', JSON.stringify({ ...statistics, errors: { C: 3 } }))
    const training = loadTraining()
    expect(training).toEqual({ activePresetId: '25-15', presets: [{ id: '25-15', characterWpm: 25, effectiveWpm: 15, statistics }], errors: { C: 3 } })
    saveTraining(training)
    expect(loadTraining()).toEqual(training)
    expect(localStorage.getItem('lake-cw-statistics')).not.toBeNull()
  })

  it('isolates every metric, restores streaks, and accumulates shared mistakes', () => {
    let training = recordGrade(loadTraining(), 2, gradeAnswer('CQ', 'CQ'))
    training = recordGrade(training, 2, gradeAnswer('CQ', 'CQ'))
    const first = training.presets[0].statistics
    training = applyPreset(training, 30, 15)
    expect(training.presets[1].statistics).toEqual(defaultStatistics())
    training = recordGrade(training, 3, gradeAnswer('CQ', 'CX'))
    expect(training.presets[0].statistics).toEqual(first)
    expect(training.presets[1].statistics).toMatchObject({ total: 1, perfect: 0, totalAccuracy: 50, streak: 0, byLevel: { 3: { total: 1, perfect: 0 } } })
    expect(training.errors).toEqual({ Q: 1 })
    training = applyPreset(training, 20, 10)
    expect(training.presets).toHaveLength(2)
    expect(training.presets[0].statistics).toMatchObject({ total: 2, perfect: 2, totalAccuracy: 200, streak: 2, byLevel: { 2: { total: 2, perfect: 2 } } })
    saveTraining(training)
    expect(loadTraining()).toEqual(training)
  })

  it('keeps signal settings across preset switches and reloads', () => {
    const settings = { ...loadSettings(), tone: 900, volume: 25, autoPlay: true }
    saveSettings(settings)
    saveTraining(applyPreset(loadTraining(), 35, 20))
    expect(loadSettings()).toEqual(settings)
    expect(loadTraining().activePresetId).toBe('35-20')
  })

  it('rejects invalid speed pairs', () => {
    for (const [character, effective] of [[4, 5], [41, 10], [20, 21], [20, 0], [NaN, 10], [20, 5.5]]) {
      expect(() => applyPreset(loadTraining(), character, effective)).toThrow('Invalid preset speed')
    }
  })

  it('recovers when the saved preset data is unreadable', () => {
    localStorage.setItem('lake-cw-training-v1', '{broken')
    expect(loadTraining().activePresetId).toBe('20-10')
    localStorage.setItem('lake-cw-training-v1', JSON.stringify({ activePresetId: 'missing', presets: [] }))
    expect(loadTraining().presets).toHaveLength(1)
  })

  it('persists Level 6 bests per preset without lowering them or changing other metrics', () => {
    let training = loadTraining()
    delete training.presets[0].statistics.infiniteBest
    training = recordInfinite(training, 12)
    training = recordInfinite(training, 3)
    training = applyPreset(training, 30, 15)
    training = recordInfinite(training, 7)
    saveTraining(training)
    const restored = loadTraining()
    expect(restored.presets.map((preset) => preset.statistics.infiniteBest)).toEqual([12, 7])
    expect(restored.presets[0].statistics.total).toBe(0)
  })

})
