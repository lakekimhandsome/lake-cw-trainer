import { useCallback, useEffect, useRef, useState } from 'react'
import { tokenizeMorse } from '../lib/morse'
import { getTiming } from '../lib/timing'
import type { Settings } from '../types'

export function useMorseAudio() {
  const context = useRef<AudioContext | null>(null)
  const nodes = useRef<OscillatorNode[]>([])
  const finishTimer = useRef<number | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const stop = useCallback(() => {
    nodes.current.forEach((node) => { try { node.stop() } catch { /* Already stopped. */ } })
    nodes.current = []
    if (finishTimer.current) window.clearTimeout(finishTimer.current)
    finishTimer.current = null
    setIsPlaying(false)
  }, [])

  const play = useCallback(async (text: string, settings: Settings) => {
    stop()
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
        const level = settings.volume / 100 * 0.18
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

  useEffect(() => () => { stop(); void context.current?.close() }, [stop])
  return { isPlaying, error, play, stop }
}
