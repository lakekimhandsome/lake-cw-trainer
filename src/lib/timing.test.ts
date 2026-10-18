import { describe, expect, it } from 'vitest'
import { getTiming } from './timing'

describe('Farnsworth timing', () => {
  it('matches standard timing when character and effective WPM match', () => {
    const timing = getTiming(20, 20)
    expect(timing.dit).toBe(60)
    expect(timing.dah).toBe(180)
    expect(timing.elementGap).toBe(60)
    expect(timing.letterGap).toBe(180)
    expect(timing.wordGap).toBe(420)
  })
  it.each([[20, 15], [20, 10], [30, 10], [40, 5]])('keeps element speed but expands gaps for %d/%d WPM', (character, effective) => {
    const slow = getTiming(character, effective)
    const standard = getTiming(character, character)
    expect(slow.dit).toBe(1200 / character)
    expect(slow.dah).toBe(slow.dit * 3)
    expect(slow.elementGap).toBe(slow.dit)
    expect(slow.letterGap).toBeGreaterThanOrEqual(standard.letterGap)
    expect(slow.wordGap).toBeGreaterThanOrEqual(standard.wordGap)
  })
})
