import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PlaybackText } from './PlaybackText'
import { GradingResult } from './GradingResult'
import { gradeAnswer } from '../lib/grading'

describe('answer playback highlighting', () => {
  it('preserves spaces and highlights a whole prosign at its audio token index', () => {
    const html = renderToStaticMarkup(<PlaybackText text="A <AR>E" activeCharacterIndex={1} />)
    expect(html).toBe('A <mark class="playing-character">&lt;AR&gt;</mark>E')
  })

  it('ignores unsupported characters when matching the audio index', () => {
    expect(renderToStaticMarkup(<PlaybackText text="A ! E" activeCharacterIndex={1} />))
      .toBe('A ! <mark class="playing-character">E</mark>')
  })

  it('leaves the answer plain when playback is idle', () => {
    expect(renderToStaticMarkup(<PlaybackText text="A E" activeCharacterIndex={null} />)).toBe('A E')
  })

  it('highlights the correct answer in grading results', () => {
    const html = renderToStaticMarkup(<GradingResult grade={gradeAnswer('A E', 'A E')} translation="test" activeCharacterIndex={1} />)
    expect(html).toContain('<code>A <mark class="playing-character">E</mark></code>')
  })
})
