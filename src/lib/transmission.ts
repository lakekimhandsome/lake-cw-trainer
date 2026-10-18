import { MORSE, PROSIGNS } from './morse'
import { getTiming } from './timing'

const characters = Object.fromEntries([...Object.entries(MORSE), ...Object.entries(PROSIGNS)].map(([letter, code]) => [code, letter]))

export function decodeMorse(code: string): string {
  return characters[code] ?? '�'
}

export function transmissionTiming(characterWpm: number, effectiveWpm: number) {
  const timing = getTiming(characterWpm, effectiveWpm)
  return {
    mark: (duration: number) => duration < timing.dit * 2 ? '.' : '-',
    letterGap: (timing.elementGap + timing.letterGap) / 2,
    wordGap: (timing.letterGap + timing.wordGap) / 2,
    dit: timing.dit,
    dah: timing.dah,
    letterPause: timing.letterGap,
    wordPause: timing.wordGap,
  }
}
