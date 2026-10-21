import type { ReactElement } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import App from './App'
import { Statistics } from './components/Statistics'
import { GradingResult } from './components/GradingResult'
import { AudioControls } from './components/AudioControls'
import { applyPreset } from './lib/storage'
import { gradeAnswer } from './lib/grading'

const { state, audio } = vi.hoisted(() => ({
  state: { values: [] as unknown[], index: 0 },
  audio: { isPlaying: false, isSignalOn: false, activeCharacterIndex: 0, error: null, play: vi.fn(), stop: vi.fn() },
}))
vi.mock('react', () => ({
  useEffect: vi.fn(),
  useRef: (current: unknown) => ({ current }),
  useState: (initial: unknown) => {
    const index = state.index++
    if (!(index in state.values)) state.values[index] = typeof initial === 'function' ? initial() : initial
    return [state.values[index], (value: unknown) => { state.values[index] = value }]
  },
}))
vi.mock('./hooks/useMorseAudio', () => ({ useMorseAudio: () => audio }))

function findElement<T>(node: unknown, type: unknown): ReactElement<T> | undefined {
  if (Array.isArray(node)) return node.map((child) => findElement<T>(child, type)).find(Boolean)
  if (!node || typeof node !== 'object' || !('props' in node)) return
  const element = node as ReactElement<{ children?: unknown }>
  return element.type === type ? element as ReactElement<T> : findElement<T>(element.props.children, type)
}
function view() { state.index = 0; return App() }

beforeEach(() => {
  state.values = []
  vi.clearAllMocks()
  vi.stubGlobal('window', { clearTimeout: vi.fn() })
})

afterEach(() => vi.unstubAllGlobals())

it.each([[20, 10], [30, 15]])('previews a character or prosign once at the active %i/%i preset without highlighting the answer', (characterWpm, effectiveWpm) => {
  view()
  state.values[2] = applyPreset(state.values[2] as Parameters<typeof applyPreset>[0], characterWpm, effectiveWpm)
  state.values[6] = gradeAnswer('A', 'B')
  for (const letter of ['A', '<AR>']) {
    const statistics = findElement<Parameters<typeof Statistics>[0]>(view(), Statistics)!
    audio.play.mockClear()
    statistics.props.onPlayCharacter(letter)
    expect(audio.stop).toHaveBeenCalled()
    expect(audio.play).toHaveBeenCalledExactlyOnceWith(letter, expect.objectContaining({ characterWpm, effectiveWpm }))
    expect(findElement<Parameters<typeof GradingResult>[0]>(view(), GradingResult)!.props.activeCharacterIndex).toBeNull()
  }
  findElement<Parameters<typeof AudioControls>[0]>(view(), AudioControls)!.props.onPlay()
  expect(findElement<Parameters<typeof GradingResult>[0]>(view(), GradingResult)!.props.activeCharacterIndex).toBe(0)
})
