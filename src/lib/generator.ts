import { CALL_PREFIXES, NAMES, QTHS, SUFFIXES } from '../data/vocabulary'
import { TEMPLATES } from '../data/templates'
import type { Level, Problem } from '../types'

const pick = <T,>(values: readonly T[]) => values[Math.floor(Math.random() * values.length)]
const call = () => `${pick(CALL_PREFIXES)}${pick(SUFFIXES)}`
const rst = () => `${pick(['5', '5', '5', '5', '4'])}${pick(['9', '9', '7', '5'])}${pick(['9', '9', '9', '7', '5'])}`

export function generateProblem(level: Level, previous?: string): Problem {
  let text = previous ?? ''
  for (let attempt = 0; attempt < 6 && text === previous; attempt += 1) {
    text = pick(TEMPLATES[level]).replaceAll('{CALL}', call).replace('{RST}', rst()).replace('{QTH}', pick(QTHS)).replace('{NAME}', pick(NAMES))
  }
  return { text, level }
}
