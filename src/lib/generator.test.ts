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
    expect(problem.translation).not.toMatch(/[{}]/)
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

  it('generates one callsign with three random suffix letters when Level 2 callsigns-only mode is enabled', () => {
    const problem = generateProblem(2, undefined, true)
    expect(problem.text).toMatch(/^(HL[12]|JA[12]|K1|W1|DL1|VK2)[A-Z]{3}$/)
    expect(problem.translation).toBe(problem.text)
  })

  it('repeats the same station callsign in a CQ call and its translation', () => {
    let draws = 0
    vi.spyOn(Math, 'random').mockImplementation(() => draws++ === 0 ? 0.5 : draws % 2 ? 0.1 : 0.9)
    const problem = generateProblem(5)
    const match = problem.text.match(/^CQ CQ DE (\S+) (\S+) K$/)
    expect(match).not.toBeNull()
    expect(match![1]).toBe(match![2])
    expect(problem.translation).toBe(`전체 호출, 전체 호출. ${match![1]} ${match![1]}입니다. 응답 바랍니다.`)
  })

  it('generates separate recipient and sender callsigns for a directed call', () => {
    let draws = 0
    vi.spyOn(Math, 'random').mockImplementation(() => draws++ < 10 ? 0 : 0.99)
    const problem = generateProblem(5)
    const [recipient, , sender] = problem.text.split(' ')
    expect(recipient).not.toBe(sender)
    expect(problem.translation).toContain(`${recipient}에서 ${sender} 호출합니다.`)
  })
})
