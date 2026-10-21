const ALPHANUMERIC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

export const randomCharacter = () => ALPHANUMERIC[Math.floor(Math.random() * ALPHANUMERIC.length)]

export function gradeInfinite(answer: string, input: string) {
  const actual = input.toUpperCase().replace(/\s/g, '')
  let count = 0
  while (count < answer.length && count < actual.length && answer[count] === actual[count]) count += 1
  const correct = answer === actual
  return { count, correct, expected: answer.slice(0, count + 1), actual: actual.slice(0, count + 1) }
}
