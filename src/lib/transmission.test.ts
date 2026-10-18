import { describe, expect, it } from 'vitest'
import { MORSE, PROSIGNS, tokenizeMorse } from './morse'
import { decodeMorse, transmissionTiming } from './transmission'
import { getTiming } from './timing'

describe('straight key decoding', () => {
  it('decodes supported characters, preferring procedure signs for shared codes', () => {
    for (const [letter, code] of Object.entries({ ...MORSE, ...PROSIGNS })) {
      expect(decodeMorse(code)).toBe(code === '-...-' ? '<BT>' : letter)
    }
    expect(decodeMorse('........')).toBe('�')
  })
  it.each([[20, 20], [20, 10], [40, 5], [5, 5]])('separates marks and gaps at %d/%d WPM', (character, effective) => {
    const standard = getTiming(character, effective)
    const timing = transmissionTiming(character, effective)
    expect(timing.mark(standard.dit)).toBe('.')
    expect(timing.mark(standard.dah)).toBe('-')
    expect(timing.mark(standard.dit * 1.9)).toBe('.')
    expect(timing.mark(standard.dit * 2)).toBe('-')
    expect(timing.letterGap).toBeGreaterThan(standard.elementGap)
    expect(timing.letterGap).toBeLessThan(standard.letterGap)
    expect(timing.wordGap).toBeGreaterThan(standard.letterGap)
    expect(timing.wordGap).toBeLessThan(standard.wordGap)
    const text = 'CQ DE HL1ABC <BT> 73 <AR> <SK>'
    expect(tokenizeMorse(text).map(({ code, gapAfter }) => decodeMorse(code) + (gapAfter === 'word' ? ' ' : '')).join('')).toBe(text)
  })
})
