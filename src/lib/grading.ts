import type { Grade, GradePart } from '../types'

export function normalizeAnswer(value: string): string {
  return value.toUpperCase().trim().replace(/\s+/g, ' ').replace(/<\s*(AR|SK|BT)\s*>/g, '<$1>')
}

export function gradeAnswer(answer: string, input: string): Grade {
  const expected = normalizeAnswer(answer)
  const actual = normalizeAnswer(input)
  const rows: number[][] = Array.from({ length: expected.length + 1 }, (_, i) => [i])
  for (let j = 1; j <= actual.length; j += 1) rows[0][j] = j
  for (let i = 1; i <= expected.length; i += 1) {
    for (let j = 1; j <= actual.length; j += 1) {
      rows[i][j] = expected[i - 1] === actual[j - 1] ? rows[i - 1][j - 1] : Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + 1)
    }
  }
  const parts: GradePart[] = []
  const errors: string[] = []
  let i = expected.length
  let j = actual.length
  let matches = 0
  while (i || j) {
    if (i && j && expected[i - 1] === actual[j - 1] && rows[i][j] === rows[i - 1][j - 1]) {
      parts.unshift({ value: expected[i - 1], kind: 'correct' }); matches += 1; i -= 1; j -= 1
    } else if (i && j && rows[i][j] === rows[i - 1][j - 1] + 1) {
      parts.unshift({ value: actual[j - 1], kind: 'substitution' }); errors.push(expected[i - 1]); i -= 1; j -= 1
    } else if (i && rows[i][j] === rows[i - 1][j] + 1) {
      parts.unshift({ value: expected[i - 1], kind: 'missing' }); errors.push(expected[i - 1]); i -= 1
    } else {
      parts.unshift({ value: actual[j - 1], kind: 'extra' }); errors.push(actual[j - 1]); j -= 1
    }
  }
  return { normalizedAnswer: expected, normalizedInput: actual, parts, correct: expected === actual, accuracy: expected.length ? Math.round((matches / expected.length) * 100) : 100, errors }
}
