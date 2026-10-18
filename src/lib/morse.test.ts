import { describe, expect, it } from 'vitest'
import { tokenizeMorse } from './morse'

describe('Morse tokenization', () => {
  it('keeps prosigns atomic and preserves word gaps', () => {
    expect(tokenizeMorse('CQ <AR>')).toEqual([
      { code: '-.-.', gapAfter: 'letter' },
      { code: '--.-', gapAfter: 'word' },
      { code: '.-.-.', gapAfter: 'none' },
    ])
  })
})
