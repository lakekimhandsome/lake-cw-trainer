import { CALL_PREFIXES, NAMES, QTHS, SUFFIXES } from '../data/vocabulary'
import { TEMPLATES } from '../data/templates'
import type { Level, Problem } from '../types'

const pick = <T,>(values: readonly T[]) => values[Math.floor(Math.random() * values.length)]
const call = () => `${pick(CALL_PREFIXES)}${pick(SUFFIXES)}`
const rst = () => `${pick(['5', '5', '5', '5', '4'])}${pick(['9', '9', '7', '5'])}${pick(['9', '9', '9', '7', '5'])}`

export function generateProblem(level: Level, previous?: string): Problem {
  let text = previous ?? ''
  let translation = ''
  for (let attempt = 0; attempt < 6 && (attempt === 0 || text === previous); attempt += 1) {
    const template = pick(TEMPLATES[level])
    const values = { '{CALL}': template.text.includes('{CALL}') ? call() : '', '{RST}': rst(), '{QTH}': pick(QTHS), '{NAME}': pick(NAMES) }
    text = Object.entries(values).reduce((result, [key, value]) => result.replaceAll(key, value), template.text)
    translation = Object.entries(values).reduce((result, [key, value]) => result.replaceAll(key, value), template.translation)
  }
  return { text, translation, level }
}
