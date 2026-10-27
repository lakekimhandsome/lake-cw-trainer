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
    const character = vi.mocked(useState).mock.results[3].value[1]
    const tick = (seconds: number) => { ctx.currentTime = seconds; frame(0) }
    return { audio, ctx, gain, signal, character, tick, finish: () => finish() }
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

  it('tracks characters through element gaps, clears letter/word gaps, and treats prosigns as one character', async () => {
    const { audio, ctx, character, tick, finish } = setup()
    await audio.play('A <AR>E', { ...defaultSettings, characterWpm: 20, effectiveWpm: 20 })
    // A ends at .335; word gap ends at .755; <AR> ends at 1.535; E starts at 1.715.
    for (const [time, index] of [[0, null], [.04, 0], [.1, 0], [.3, 0], [.34, null], [.76, 1], [.82, 1], [1.54, null], [1.72, 2], [1.78, null]] as const) {
      tick(time)
      expect(character).toHaveBeenLastCalledWith(index)
    }
    ctx.state = 'interrupted'
    tick(.04)
    expect(character).toHaveBeenLastCalledWith(null)
    finish()
    expect(character).toHaveBeenLastCalledWith(null)
    ctx.state = 'running'
    ctx.currentTime = 0
    await audio.play('T', defaultSettings)
    tick(.04)
    expect(character).toHaveBeenLastCalledWith(0)
    audio.stop()
    expect(character).toHaveBeenLastCalledWith(null)
    ctx.currentTime = 0
    await audio.play('E', defaultSettings)
    expect(character).toHaveBeenLastCalledWith(null)
    tick(.04)
    expect(character).toHaveBeenLastCalledWith(0)
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


describe('continuous reception', () => {
  it('keeps preset letter gaps, collects completed characters, and cancels future scheduling', async () => {
    const starts: number[] = []
    const ctx = {
      state: 'running', currentTime: 0, destination: {},
      createOscillator: () => ({ frequency: { setValueAtTime: vi.fn() }, connect: () => ({ connect: vi.fn() }), start: (at: number) => starts.push(at), stop: vi.fn() }),
      createGain: () => ({ gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() } }),
    }
    let fill: () => void = () => {}
    let frame: FrameRequestCallback = () => {}
    vi.stubGlobal('window', {
      AudioContext: vi.fn(function () { return ctx }),
      setTimeout: vi.fn((callback: () => void) => { fill = callback; return 1 }), clearTimeout: vi.fn(),
      requestAnimationFrame: vi.fn((callback: FrameRequestCallback) => { frame = callback; return 1 }), cancelAnimationFrame: vi.fn(),
    })
    const audio = useMorseAudio()
    const next = vi.fn(() => 'E')
    await audio.play(next, { ...defaultSettings, characterWpm: 20, effectiveWpm: 20 })
    const character = vi.mocked(useState).mock.results[3].value[1]
    frame(0)
    expect(character).toHaveBeenLastCalledWith(null)
    ctx.currentTime = .04
    frame(0)
    expect(character).toHaveBeenLastCalledWith(0)
    expect(starts[0]).toBeCloseTo(.035)
    // The second E follows the 60ms dot and 180ms letter gap, without a chunk pause.
    ctx.currentTime = .1
    fill()
    frame(0)
    expect(character).toHaveBeenLastCalledWith(0)
    expect(starts[1]).toBeCloseTo(.275)
    ctx.currentTime = .3 // The second dot is still sounding and must not be graded.
    frame(0)
    expect(character).toHaveBeenLastCalledWith(1)
    expect(audio.stop()).toBe('E')
    expect(character).toHaveBeenLastCalledWith(null)
    const calls = next.mock.calls.length
    fill()
    expect(next).toHaveBeenCalledTimes(calls)
    expect(window.clearTimeout).toHaveBeenCalledWith(1)
    // A new session starts with an empty received string.
    await audio.play(next, defaultSettings)
    ctx.currentTime += .04
    frame(0)
    expect(character).toHaveBeenLastCalledWith(0)
    expect(audio.stop()).toBe('')
  })
})
