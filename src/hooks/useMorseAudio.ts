import { useCallback, useEffect, useRef, useState } from 'react'
import { tokenizeMorse } from '../lib/morse'
import { getTiming } from '../lib/timing'
import type { Settings } from '../types'

export function useMorseAudio() {
  const context = useRef<AudioContext | null>(null)
  const revision = useRef(0)
  const nodes = useRef<OscillatorNode[]>([])
  const finishTimer = useRef<number | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const stop = useCallback(() => {
    revision.current += 1
    nodes.current.forEach((node) => { try { node.stop() } catch { /* Already stopped. */ } })
    nodes.current = []
    if (finishTimer.current) window.clearTimeout(finishTimer.current)
    finishTimer.current = null
    setIsPlaying(false)
  }, [])

  const play = useCallback(async (text: string, settings: Settings) => {
    stop()
    const request = revision.current
    setError(null)
    const AudioContextClass = window.AudioContext ?? window.webkitAudioContext
    if (!AudioContextClass) {
      setError('이 브라우저에서는 Web Audio를 사용할 수 없습니다.')
      return
    }
    try {
      context.current ??= new AudioContextClass()
      if (context.current.state === 'suspended') await context.current.resume()
    } catch {
      setError('오디오를 시작하지 못했습니다. 재생 버튼을 다시 눌러 주세요.')
      return
    }
    if (request !== revision.current) return
    const ctx = context.current
    const timing = getTiming(settings.characterWpm, settings.effectiveWpm)
    const start = ctx.currentTime + 0.035
    let at = start
    tokenizeMorse(text).forEach(({ code, gapAfter }) => {
      code.split('').forEach((mark, index) => {
        const duration = (mark === '.' ? timing.dit : timing.dah) / 1000
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
        nodes.current.push(oscillator)
        at += duration + (index < code.length - 1 ? timing.elementGap / 1000 : 0)
      })
      if (gapAfter === 'letter') at += timing.letterGap / 1000
      if (gapAfter === 'word') at += timing.wordGap / 1000
    })
    setIsPlaying(true)
    finishTimer.current = window.setTimeout(() => { nodes.current = []; setIsPlaying(false) }, Math.max(0, (at - ctx.currentTime) * 1000 + 30))
  }, [stop])

  const startTone = useCallback(async (settings: Settings) => {
    stop()
    const request = revision.current
    setError(null)
    try {
      const AudioContextClass = window.AudioContext ?? window.webkitAudioContext
      if (!AudioContextClass) throw new Error('Web Audio unavailable')
      context.current ??= new AudioContextClass()
      const ctx = context.current
      if (ctx.state === 'suspended') await ctx.resume()
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
  return { isPlaying, error, play, stop, startTone }
}
