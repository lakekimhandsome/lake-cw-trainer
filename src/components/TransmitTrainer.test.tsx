import type { ReactElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { gradeAnswer } from '../lib/grading'
import { defaultSettings } from '../lib/storage'
import { transmissionTiming } from '../lib/transmission'
import { TransmitTrainer } from './TransmitTrainer'

vi.mock('react', () => ({
  useEffect: vi.fn(),
  useRef: (current: unknown) => ({ current }),
  useState: (initial: unknown) => [initial, vi.fn()],
}))
vi.mock('../hooks/useMorseAudio', () => ({ useMorseAudio: () => ({ startTone: vi.fn(), stop: vi.fn(), error: null }) }))
vi.mock('../lib/grading', () => ({ gradeAnswer: vi.fn() }))

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] })
  vi.stubGlobal('window', { setTimeout, clearTimeout })
})
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.clearAllMocks() })

function trainer() {
  const settings = { ...defaultSettings, effectiveWpm: 6 }
  const view = TransmitTrainer({ problem: { text: 'TEST', translation: '', level: 1 }, settings, onNext: vi.fn() })
  const children = view.props.children as ReactElement[]
  const pad = children.find((child) => (child?.props as { className?: string })?.className?.startsWith('key-pad'))!
  const controls = children.find((child) => (child?.props as { className?: string })?.className === 'controls')!
  // Exercise the actual component handlers without adding a DOM test dependency.
  const handlers = pad.props as {
    onPointerDown: (event: object) => void
    onPointerUp: (event: object) => void
    onPointerCancel: (event: object) => void
    onLostPointerCapture: (event: object) => void
    onTouchStart: (event: object) => void
    onTouchEnd: (event: object) => void
    onTouchCancel: (event: object) => void
    onBlur: () => void
  }
  const submit = (controls.props as { children: ReactElement<{ onClick: () => void }>[] }).children[0].props.onClick
  const timing = transmissionTiming(settings.characterWpm, settings.effectiveWpm)
  const target = { focus: vi.fn(), setPointerCapture: vi.fn() }
  const down = (pointerId = 1) => handlers.onPointerDown({ button: 0, pointerId, preventDefault: vi.fn(), currentTarget: target })
  const up = (pointerId = 1) => handlers.onPointerUp({ pointerId })
  const send = (code: string, blur = false) => {
    for (const mark of code) {
      down()
      vi.advanceTimersByTime(mark === '.' ? timing.dit : timing.dah)
      up()
      if (blur) handlers.onBlur()
      handlers.onLostPointerCapture({ pointerId: 1 })
      vi.advanceTimersByTime(timing.dit)
    }
  }
  return { handlers, submit, timing, down, up, send }
}

describe('touch transmission', () => {
  it.each([['....', 'H'], ['---', 'O'], ['.-', 'A']])('keeps %s together across touch focus changes', (code, letter) => {
    const { send, submit } = trainer()
    send(code, true)
    submit()
    expect(gradeAnswer).toHaveBeenLastCalledWith('TEST', letter)
  })

  it('still separates letters and words by their pauses', () => {
    const { send, submit, timing } = trainer()
    send('....', true)
    vi.advanceTimersByTime(timing.letterGap)
    send('..', true)
    vi.advanceTimersByTime(timing.wordGap)
    send('---', true)
    submit()
    expect(gradeAnswer).toHaveBeenLastCalledWith('TEST', 'HI O')
  })

  it('does not let an unrelated pointer release cancel the held key', () => {
    const { handlers, down, up, submit, timing } = trainer()
    down(1)
    handlers.onLostPointerCapture({ pointerId: 2 })
    handlers.onPointerCancel({ pointerId: 2 })
    vi.advanceTimersByTime(timing.dah)
    up(1)
    submit()
    expect(gradeAnswer).toHaveBeenLastCalledWith('TEST', 'T')
  })

  it('keeps earlier marks pending when the next touch is cancelled', () => {
    const { send, handlers, down, submit, timing } = trainer()
    send('.')
    down()
    handlers.onPointerCancel({ pointerId: 1 })
    send('...')
    vi.advanceTimersByTime(timing.letterGap)
    submit()
    expect(gradeAnswer).toHaveBeenLastCalledWith('TEST', 'H')
  })

  it.each([['....', 'H'], ['---', 'O']])('reads native touch %s without focus or pointer capture', (code, letter) => {
    const { handlers, timing, submit } = trainer()
    const target = { focus: vi.fn(), setPointerCapture: vi.fn(() => { throw new Error('Pointer capture unavailable') }) }
    const pointer = { pointerType: 'touch', pointerId: 0, button: 0, currentTarget: target, preventDefault: vi.fn() }
    const touch = { changedTouches: [{ identifier: 1 }] }
    for (const mark of code) {
      handlers.onPointerDown(pointer)
      handlers.onTouchStart(touch)
      handlers.onBlur()
      handlers.onLostPointerCapture(pointer)
      handlers.onTouchCancel({ changedTouches: [{ identifier: 2 }] })
      vi.advanceTimersByTime(mark === '.' ? timing.dit : timing.dah)
      handlers.onPointerUp(pointer)
      handlers.onTouchEnd(touch)
      vi.advanceTimersByTime(timing.dit)
    }
    submit()
    expect(target.focus).not.toHaveBeenCalled()
    expect(target.setPointerCapture).not.toHaveBeenCalled()
    expect(gradeAnswer).toHaveBeenLastCalledWith('TEST', letter)
  })
})
