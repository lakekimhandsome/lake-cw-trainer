import { afterEach, describe, expect, it, vi } from 'vitest'
import { generateProblem } from './generator'
import { tokenizeMorse } from './morse'
import type { Level } from '../types'

afterEach(() => vi.restoreAllMocks())

describe('problem generation', () => {
  it.each<Level>([1, 2, 3, 4, 5])('generates playable text on initial load at level %d', (level) => {
    const problem = generateProblem(level)
    expect(problem.level).toBe(level)
    expect(problem.text.length).toBeGreaterThan(0)
    expect(problem.translation.length).toBeGreaterThan(0)
    expect(problem.text).not.toMatch(/[{}]/)
    expect(tokenizeMorse(problem.text).length).toBeGreaterThan(0)
  })

  it('retries a repeated problem and stops after six attempts', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0)
    expect(generateProblem(1, 'CQ').text).toBe('CQ')
    // Each attempt chooses a template, three RST digits, a QTH, and a name.
    expect(random).toHaveBeenCalledTimes(6 * 6)
  })

  it('generates a next problem when the previous text is empty', () => {
    expect(generateProblem(1, '').text.length).toBeGreaterThan(0)
  })
})
