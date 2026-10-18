import { CALL_PREFIXES, NAMES, QTHS } from '../data/vocabulary'
import { TEMPLATES } from '../data/templates'
import type { Level, Problem } from '../types'

const pick = <T,>(values: readonly T[]) => values[Math.floor(Math.random() * values.length)]
const letter = () => String.fromCharCode(65 + Math.floor(Math.random() * 26))
const call = () => `${pick(CALL_PREFIXES)}${letter()}${letter()}${letter()}`
const rst = () => `${pick(['5', '5', '5', '5', '4'])}${pick(['9', '9', '7', '5'])}${pick(['9', '9', '9', '7', '5'])}`

export function generateProblem(level: Level, previous?: string, callsignsOnly = false): Problem {
  let text = previous ?? ''
  let translation = ''
  for (let attempt = 0; attempt < 6 && (attempt === 0 || text === previous); attempt += 1) {
    if (level === 2 && callsignsOnly) {
      text = call()
      translation = text
      continue
    }
    const template = pick(TEMPLATES[level])
    const values = { '{RST}': rst(), '{QTH}': pick(QTHS), '{NAME}': pick(NAMES) }
    const calls: string[] = []
    text = template.text.replaceAll('{CALL}', () => {
      const value = call()
      calls.push(value)
      return value
    })
    text = Object.entries(values).reduce((result, [key, value]) => result.replaceAll(key, value), text)
    let callIndex = 0
    translation = template.translation.replaceAll('{CALL}', () => calls[callIndex++] ?? '')
    translation = Object.entries(values).reduce((result, [key, value]) => result.replaceAll(key, value), translation)
  }
  return { text, translation, level }
}
