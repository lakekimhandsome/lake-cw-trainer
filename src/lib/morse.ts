export const MORSE: Record<string, string> = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..',
  '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-', '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
  '/': '-..-.', '?': '..--..', '.': '.-.-.-', '=': '-...-'
}

export const PROSIGNS: Record<string, string> = { '<AR>': '.-.-.', '<SK>': '...-.-', '<BT>': '-...-' }

export type MorseToken = { code: string; gapAfter: 'letter' | 'word' | 'none' }

export function tokenizeMorse(text: string): MorseToken[] {
  const words = text.toUpperCase().trim().split(/\s+/)
  return words.flatMap((word, wordIndex) => (word.match(/<[^>]+>|[^\s]/g) ?? []).flatMap((value, charIndex, values) => {
    const code = PROSIGNS[value] ?? MORSE[value]
    if (!code) return []
    const gapAfter: MorseToken['gapAfter'] = charIndex < values.length - 1 ? 'letter' : wordIndex < words.length - 1 ? 'word' : 'none'
    return [{ code, gapAfter }]
  }))
}
