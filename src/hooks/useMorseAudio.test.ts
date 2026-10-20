import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useMorseAudio } from './useMorseAudio'
import { defaultSettings } from '../lib/storage'

vi.mock('react', () => ({
  useCallback: (callback: unknown) => callback,
  useEffect: vi.fn(),
  useRef: (current: unknown) => ({ current }),
  useState: vi.fn((initial: unknown) => [initial, vi.fn()]),
}))

beforeEach(() => vi.clearAllMocks())
afterEach(() => vi.unstubAllGlobals())

describe.each(['play', 'startTone'] as const)('%s audio recovery', (method) => {
  it.each(['suspended', 'interrupted'])('resumes a %s context before sounding', async (state) => {
    const oscillator = { frequency: { value: 0, setValueAtTime: vi.fn() }, connect: vi.fn(() => ({ connect: vi.fn() })), start: vi.fn(), stop: vi.fn() }
    const gain = { gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() } }
    const ctx = { state, currentTime: 0, destination: {}, resume: vi.fn(async () => { ctx.state = 'running' }), createOscillator: vi.fn(() => oscillator), createGain: vi.fn(() => gain) }
    vi.stubGlobal('window', { AudioContext: vi.fn(function () { return ctx }), setTimeout: vi.fn(), clearTimeout: vi.fn(), requestAnimationFrame: vi.fn(), cancelAnimationFrame: vi.fn() })
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


describe('receive signal indicator', () => {
  function setup() {
    const oscillator = { frequency: { setValueAtTime: vi.fn() }, connect: vi.fn(() => ({ connect: vi.fn() })), start: vi.fn(), stop: vi.fn() }
    const gain = { gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() } }
    const ctx = { state: 'running', currentTime: 0, destination: {}, createOscillator: () => oscillator, createGain: () => gain }
    let frame: FrameRequestCallback
    let finish: () => void
    vi.stubGlobal('window', {
      AudioContext: vi.fn(function () { return ctx }),
      requestAnimationFrame: vi.fn((callback: FrameRequestCallback) => { frame = callback; return 1 }),
      cancelAnimationFrame: vi.fn(),
      setTimeout: vi.fn((callback: () => void) => { finish = callback; return 1 }),
      clearTimeout: vi.fn(),
    })
    const audio = useMorseAudio()
    const signal = vi.mocked(useState).mock.results[0].value[1]
    const tick = (seconds: number) => { ctx.currentTime = seconds; frame(0) }
    return { audio, ctx, gain, signal, tick, finish: () => finish() }
  }

  it('follows dots, dashes, element/letter/word gaps at zero volume', async () => {
    const { audio, gain, signal, tick } = setup()
    await audio.play('AE E', { ...defaultSettings, characterWpm: 20, effectiveWpm: 20, volume: 0 })
    // A: dot .035–.095, dash .155–.335; E: .515–.575; word gap; E: .995–1.055.
    for (const [time, on] of [[0, false], [.04, true], [.1, false], [.16, true], [.3, true], [.34, false], [.52, true], [.58, false], [1, true], [1.06, false]] as const) {
      tick(time)
      expect(signal).toHaveBeenLastCalledWith(on)
    }
    expect(gain.gain.linearRampToValueAtTime.mock.calls.every(([level]) => level === 0)).toBe(true)
  })

  it('uses the audio clock and switches off immediately on stop', async () => {
    const { audio, ctx, signal, tick } = setup()
    await audio.play('T', defaultSettings)
    tick(.04)
    expect(signal).toHaveBeenLastCalledWith(true)
    ctx.state = 'interrupted'
    tick(.04)
    expect(signal).toHaveBeenLastCalledWith(false)
    ctx.state = 'running'
    tick(.04)
    expect(signal).toHaveBeenLastCalledWith(true)
    audio.stop()
    expect(signal).toHaveBeenLastCalledWith(false)
    expect(window.cancelAnimationFrame).toHaveBeenCalledWith(1)
    signal.mockClear()
    tick(.05)
    expect(signal).not.toHaveBeenCalled()
  })

  it('clears the light on completion and ignores frames from replaced playback', async () => {
    const { audio, signal, tick, finish } = setup()
    await audio.play('T', defaultSettings)
    const oldFrame = vi.mocked(window.requestAnimationFrame).mock.calls[0][0]
    tick(.04)
    finish()
    expect(signal).toHaveBeenLastCalledWith(false)
    await audio.play('E', defaultSettings)
    signal.mockClear()
    oldFrame(0)
    expect(signal).not.toHaveBeenCalled()
    audio.stop()
  })
})
