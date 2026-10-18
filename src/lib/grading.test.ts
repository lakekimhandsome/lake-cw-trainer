import { describe, expect, it } from 'vitest'
import { gradeAnswer, normalizeAnswer } from './grading'

describe('grading', () => {
  it('normalizes case, spaces, and prosign notation', () => expect(normalizeAnswer(' cq  < ar > ')).toBe('CQ <AR>'))
  it('recognizes an exact answer', () => {
    const grade = gradeAnswer('CQ DE K', 'cq  de k')
    expect(grade).toMatchObject({ correct: true, accuracy: 100 })
  })
  it('aligns inserted, missing, and substituted characters', () => {
    const grade = gradeAnswer('CQ DE K', 'CQ XE KK')
    expect(grade.correct).toBe(false)
    expect(grade.parts.some((part) => part.kind === 'substitution')).toBe(true)
    expect(grade.parts.some((part) => part.kind === 'extra')).toBe(true)
  })
})
