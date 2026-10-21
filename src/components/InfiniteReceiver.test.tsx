import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultSettings } from '../lib/storage'
import { randomCharacter } from '../lib/infinite'
import { InfiniteReceiver } from './InfiniteReceiver'

const { state, audio } = vi.hoisted(() => ({
  state: { values: [] as unknown[], index: 0 },
  audio: { isPlaying: false, isSignalOn: false, activeCharacterIndex: null as number | null, error: null, play: vi.fn(), stop: vi.fn() },
}))
vi.mock('react', () => ({
  useRef: (current: unknown) => ({ current }),
  useState: (initial: unknown) => {
    const index = state.index++
    if (!(index in state.values)) state.values[index] = initial
    return [state.values[index], (value: unknown) => { state.values[index] = value }]
  },
}))
vi.mock('../hooks/useMorseAudio', () => ({ useMorseAudio: () => audio }))

function controls() {
  state.index = 0
  const view = InfiniteReceiver({ settings: defaultSettings })
  const children = view.props.children as ReactElement<{ className?: string; children: unknown }>[]
  const controls = children.find((child) => child?.props?.className === 'controls')!
  return controls.props.children as ReactElement<{ children: string; disabled?: boolean; onClick: () => void }>[]
}

beforeEach(() => { state.values = []; audio.activeCharacterIndex = null; vi.clearAllMocks() })

describe('Level 6 controls', () => {
  it('starts reception with the left button and disables replay before grading', () => {
    const [left, right] = controls()
    expect(left.props.children).toBe('수신 시작')
    expect(left.props.disabled).toBeFalsy()
    expect(right.props.children).toBe('다시 듣기')
    expect(right.props.disabled).toBe(true)
    left.props.onClick()
    expect(audio.play).toHaveBeenCalledWith(randomCharacter, defaultSettings)
    const [receiving, replay] = controls()
    expect(receiving.props.children).toBe('종료 및 채점')
    expect(receiving.props.disabled).toBeFalsy()
    expect(replay.props.disabled).toBe(true)
  })

  it('grades with the left button and replays only the displayed answer through the first mismatch', () => {
    controls()[0].props.onClick()
    state.values[0] = 'AXCD'
    audio.stop.mockReturnValue('ABCD')
    controls()[0].props.onClick()
    const [left, replay] = controls()
    expect(left.props.children).toBe('다시 시작')
    expect(replay.props.disabled).toBe(false)
    replay.props.onClick()
    expect(audio.play).toHaveBeenLastCalledWith('AB', defaultSettings)
    expect(state.values[2]).toEqual({ count: 1, correct: false, expected: 'AB', actual: 'AX' })
    left.props.onClick()
    expect(controls()[1].props.disabled).toBe(true)
  })

  it('highlights the replaying character in the Level 6 answer', () => {
    controls()[0].props.onClick()
    state.values[0] = 'AX'
    audio.stop.mockReturnValue('AB')
    controls()[0].props.onClick()
    audio.activeCharacterIndex = 1
    state.index = 0
    const html = renderToStaticMarkup(InfiniteReceiver({ settings: defaultSettings }))
    expect(html).toContain('A<mark class="playing-character">B</mark>')
    expect(html).toContain('AX')
  })

  it('keeps replay disabled when the displayed answer is empty', () => {
    controls()[0].props.onClick()
    audio.stop.mockReturnValue('')
    controls()[0].props.onClick()
    expect(controls()[1].props.disabled).toBe(true)
  })
})
