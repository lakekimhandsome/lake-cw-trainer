import { describe, expect, it, vi } from 'vitest'
import { gradeInfinite, randomCharacter } from './infinite'

describe('infinite receive grading', () => {
  it('counts only the matching prefix and includes the first wrong character', () => {
    expect(gradeInfinite('A7B2CD', 'A7X2CD')).toEqual({ count: 2, correct: false, expected: 'A7B', actual: 'A7X' })
    expect(gradeInfinite('ABC', 'XBC').count).toBe(0)
  })
  it('handles missing and extra characters at the end', () => {
    expect(gradeInfinite('ABC9', 'ABC')).toEqual({ count: 3, correct: false, expected: 'ABC9', actual: 'ABC' })
    expect(gradeInfinite('ABC', 'ABC9')).toEqual({ count: 3, correct: false, expected: 'ABC', actual: 'ABC9' })
  })
  it('normalizes case and whitespace without interpreting procedure signs', () => {
    expect(gradeInfinite('AR7SK', 'ar 7\nsk')).toEqual({ count: 5, correct: true, expected: 'AR7SK', actual: 'AR7SK' })
    expect(gradeInfinite('ABC', 'AB?').count).toBe(2)
  })
  it('handles empty answers and a long session without edit-distance allocation', () => {
    expect(gradeInfinite('', '')).toEqual({ count: 0, correct: true, expected: '', actual: '' })
    expect(gradeInfinite('A', '').count).toBe(0)
    const text = 'AB79'.repeat(25000)
    expect(gradeInfinite(text, text).count).toBe(100000)
  })
  it('can generate every letter and digit', () => {
    const random = vi.spyOn(Math, 'random')
    for (let index = 0; index < 36; index += 1) {
      random.mockReturnValue((index + 0.5) / 36)
      expect(randomCharacter()).toBe('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[index])
    }
    random.mockRestore()
  })
})
