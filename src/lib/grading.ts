import type { Grade, GradePart } from '../types'

const units = (value: string) => value.match(/<(?:AR|SK|BT)>|./g) ?? []

export function normalizeAnswer(value: string): string {
  return value.toUpperCase().trim().replace(/\s+/g, ' ').replace(/<\s*(AR|SK|BT)\s*>/g, '<$1>')
}

export function gradeAnswer(answer: string, input: string): Grade {
  const expected = normalizeAnswer(answer)
  const actual = normalizeAnswer(input)
  const expectedUnits = units(expected)
  const actualUnits = units(actual)
  const rows: number[][] = Array.from({ length: expectedUnits.length + 1 }, (_, i) => [i])
  for (let j = 1; j <= actualUnits.length; j += 1) rows[0][j] = j
  for (let i = 1; i <= expectedUnits.length; i += 1) {
    for (let j = 1; j <= actualUnits.length; j += 1) {
      rows[i][j] = expectedUnits[i - 1] === actualUnits[j - 1] ? rows[i - 1][j - 1] : Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + 1)
    }
  }
  const parts: GradePart[] = []
  const errors: string[] = []
  let i = expectedUnits.length
  let j = actualUnits.length
  let matches = 0
  while (i || j) {
    if (i && j && expectedUnits[i - 1] === actualUnits[j - 1] && rows[i][j] === rows[i - 1][j - 1]) {
      parts.unshift({ value: expectedUnits[i - 1], kind: 'correct' }); matches += 1; i -= 1; j -= 1
    } else if (i && j && rows[i][j] === rows[i - 1][j - 1] + 1) {
      parts.unshift({ value: actualUnits[j - 1], kind: 'substitution' }); errors.push(expectedUnits[i - 1]); i -= 1; j -= 1
    } else if (i && rows[i][j] === rows[i - 1][j] + 1) {
      parts.unshift({ value: expectedUnits[i - 1], kind: 'missing' }); errors.push(expectedUnits[i - 1]); i -= 1
    } else {
      parts.unshift({ value: actualUnits[j - 1], kind: 'extra' }); errors.push(actualUnits[j - 1]); j -= 1
    }
  }
  return { normalizedAnswer: expected, normalizedInput: actual, parts, correct: expected === actual, accuracy: expectedUnits.length ? Math.round((matches / expectedUnits.length) * 100) : 100, errors }
}
