import { afterEach, describe, expect, it, vi } from 'vitest'
import { useMorseAudio } from './useMorseAudio'
import { defaultSettings } from '../lib/storage'

vi.mock('react', () => ({
  useCallback: (callback: unknown) => callback,
  useEffect: vi.fn(),
  useRef: (current: unknown) => ({ current }),
  useState: (initial: unknown) => [initial, vi.fn()],
}))

afterEach(() => vi.unstubAllGlobals())

describe.each(['play', 'startTone'] as const)('%s audio recovery', (method) => {
  it.each(['suspended', 'interrupted'])('resumes a %s context before sounding', async (state) => {
    const oscillator = { frequency: { value: 0, setValueAtTime: vi.fn() }, connect: vi.fn(() => ({ connect: vi.fn() })), start: vi.fn(), stop: vi.fn() }
    const gain = { gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() } }
    const ctx = { state, currentTime: 0, destination: {}, resume: vi.fn(async () => { ctx.state = 'running' }), createOscillator: vi.fn(() => oscillator), createGain: vi.fn(() => gain) }
    vi.stubGlobal('window', { AudioContext: vi.fn(function () { return ctx }), setTimeout: vi.fn(), clearTimeout: vi.fn() })
    const audio = useMorseAudio()
    const sound = () => method === 'play' ? audio.play('E', defaultSettings) : audio.startTone(defaultSettings)
    await sound()
    expect(ctx.resume).toHaveBeenCalledOnce()
    expect(oscillator.start).toHaveBeenCalledOnce()
    // A later interruption must recover using the existing context too.
    ctx.state = state
    await sound()
    expect(ctx.resume).toHaveBeenCalledTimes(2)
    expect(oscillator.start).toHaveBeenCalledTimes(2)
  })

  it('does not report playback when resume leaves audio interrupted', async () => {
    const ctx = { state: 'interrupted', resume: vi.fn(async () => {}), createOscillator: vi.fn() }
    vi.stubGlobal('window', { AudioContext: vi.fn(function () { return ctx }), clearTimeout: vi.fn() })
    const audio = useMorseAudio()
    await (method === 'play' ? audio.play('E', defaultSettings) : audio.startTone(defaultSettings))
    expect(ctx.resume).toHaveBeenCalledOnce()
    expect(ctx.createOscillator).not.toHaveBeenCalled()
  })
})
