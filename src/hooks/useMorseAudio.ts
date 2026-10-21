import { useCallback, useEffect, useRef, useState } from 'react'
import { tokenizeMorse } from '../lib/morse'
import { getTiming } from '../lib/timing'
import type { Settings } from '../types'

export function useMorseAudio() {
  const context = useRef<AudioContext | null>(null)
  const revision = useRef(0)
  const nodes = useRef<OscillatorNode[]>([])
  const finishTimer = useRef<number | null>(null)
  const streamTimer = useRef<number | null>(null)
  const received = useRef('')
  const pending = useRef<{ value: string; end: number }[]>([])
  const collectReceived = () => {
    while (pending.current.length && pending.current[0].end <= (context.current?.currentTime ?? 0)) received.current += pending.current.shift()!.value
    return received.current
  }
  const signalFrame = useRef<number | null>(null)
  const [isSignalOn, setIsSignalOn] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeCharacterIndex, setActiveCharacterIndex] = useState<number | null>(null)

  const stop = useCallback(() => {
    const text = collectReceived()
    revision.current += 1
    if (streamTimer.current !== null) window.clearTimeout(streamTimer.current)
    streamTimer.current = null
    pending.current = []
    nodes.current.forEach((node) => { try { node.stop() } catch { /* Already stopped. */ } })
    nodes.current = []
    if (finishTimer.current) window.clearTimeout(finishTimer.current)
    finishTimer.current = null
    if (signalFrame.current !== null) window.cancelAnimationFrame(signalFrame.current)
    signalFrame.current = null
    setActiveCharacterIndex(null)
    setIsSignalOn(false)
    setIsPlaying(false)
    return text
  }, [])

  const play = useCallback(async (text: string | (() => string), settings: Settings) => {
    stop()
    const request = revision.current
    received.current = ''
    setError(null)
    const AudioContextClass = window.AudioContext ?? window.webkitAudioContext
    if (!AudioContextClass) {
      setError('이 브라우저에서는 Web Audio를 사용할 수 없습니다.')
      return
    }
    try {
      if (!context.current || context.current.state === 'closed') context.current = new AudioContextClass()
      if (context.current.state !== 'running') await context.current.resume()
      if (context.current.state !== 'running') throw new Error('Audio did not resume')
    } catch {
      setError('오디오를 시작하지 못했습니다. 재생 버튼을 다시 눌러 주세요.')
      return
    }
    if (request !== revision.current) return
    const ctx = context.current
    const timing = getTiming(settings.characterWpm, settings.effectiveWpm)
    const start = ctx.currentTime + 0.035
    const marks: { start: number; end: number }[] = []
    const characters: { start: number; end: number; index: number }[] = []
    let at = start
    const schedule = (value: string, continuous = false) => {
      tokenizeMorse(value).forEach(({ code, gapAfter }, index) => {
        const characterStart = at
        code.split('').forEach((mark, index) => {
          const duration = (mark === '.' ? timing.dit : timing.dah) / 1000
          marks.push({ start: at, end: at + duration })
          const oscillator = ctx.createOscillator()
          const gain = ctx.createGain()
          oscillator.type = 'sine'
          oscillator.frequency.setValueAtTime(settings.tone, at)
          const level = settings.volume / 100 * 0.8
          const ramp = Math.min(0.005, duration / 4)
          gain.gain.setValueAtTime(0, at)
          gain.gain.linearRampToValueAtTime(level, at + ramp)
          gain.gain.setValueAtTime(level, at + Math.max(ramp, duration - ramp))
          gain.gain.linearRampToValueAtTime(0, at + duration)
          oscillator.connect(gain).connect(ctx.destination)
          oscillator.start(at)
          oscillator.stop(at + duration + 0.01)
          oscillator.onended = () => {
            oscillator.disconnect(); gain.disconnect()
            nodes.current = nodes.current.filter((node) => node !== oscillator)
          }
          nodes.current.push(oscillator)
          at += duration + (index < code.length - 1 ? timing.elementGap / 1000 : 0)
        })
        if (!continuous) characters.push({ start: characterStart, end: at, index })
        if (continuous) pending.current.push({ value, end: at })
        if (continuous || gapAfter === 'letter') at += timing.letterGap / 1000
        if (gapAfter === 'word') at += timing.wordGap / 1000
      })
    }
    if (typeof text === 'string') schedule(text)
    else {
      const fill = () => {
        if (request !== revision.current) return
        collectReceived()
        while (marks.length && ctx.currentTime >= marks[0].end) marks.shift()
        // Keep only a short lookahead; never build an unbounded audio queue.
        at = Math.max(at, ctx.currentTime + 0.035)
        while (at < ctx.currentTime + 0.25) schedule(text(), true)
        streamTimer.current = window.setTimeout(fill, 25)
      }
      fill()
    }
    // Follow the scheduled marks, independent of output gain or device mute.
    const updateSignal = () => {
      if (request !== revision.current) return
      const now = ctx.currentTime
      while (marks.length && now >= marks[0].end) marks.shift()
      while (characters.length && now >= characters[0].end) characters.shift()
      setActiveCharacterIndex(ctx.state === 'running' && characters.length > 0 && now >= characters[0].start ? characters[0].index : null)
      setIsSignalOn(ctx.state === 'running' && marks.length > 0 && now >= marks[0].start)
      signalFrame.current = marks.length || typeof text === 'function' ? window.requestAnimationFrame(updateSignal) : null
    }
    signalFrame.current = window.requestAnimationFrame(updateSignal)
    setIsPlaying(true)
    if (typeof text === 'string') finishTimer.current = window.setTimeout(() => {
      nodes.current = []
      if (signalFrame.current !== null) window.cancelAnimationFrame(signalFrame.current)
      signalFrame.current = null
      setActiveCharacterIndex(null)
      setIsSignalOn(false)
      setIsPlaying(false)
    }, Math.max(0, (at - ctx.currentTime) * 1000 + 30))
  }, [stop])

  const startTone = useCallback(async (settings: Settings) => {
    stop()
    const request = revision.current
    setError(null)
    try {
      const AudioContextClass = window.AudioContext ?? window.webkitAudioContext
      if (!AudioContextClass) throw new Error('Web Audio unavailable')
      if (!context.current || context.current.state === 'closed') context.current = new AudioContextClass()
      const ctx = context.current
      if (ctx.state !== 'running') await ctx.resume()
      if (ctx.state !== 'running') throw new Error('Audio did not resume')
      if (request !== revision.current) return
      const oscillator = ctx.createOscillator()
      const gain = ctx.createGain()
      oscillator.frequency.value = settings.tone
      gain.gain.setValueAtTime(0, ctx.currentTime)
      gain.gain.linearRampToValueAtTime(settings.volume / 100 * 0.8, ctx.currentTime + 0.004)
      oscillator.connect(gain).connect(ctx.destination)
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect() }
      oscillator.start()
      nodes.current.push(oscillator)
      setIsPlaying(true)
    } catch {
      if (request === revision.current) setError('오디오를 시작하지 못했습니다. 키 영역을 다시 눌러 주세요.')
    }
  }, [stop])

  useEffect(() => () => { stop(); void context.current?.close(); context.current = null }, [stop])
  return { isPlaying, isSignalOn, activeCharacterIndex, error, play, stop, startTone }
}
