export type Timing = { dit: number; dah: number; elementGap: number; letterGap: number; wordGap: number; gapUnit: number }

export function getTiming(characterWpm: number, effectiveWpm: number): Timing {
  const dit = 1200 / characterWpm
  const effective = Math.min(characterWpm, effectiveWpm)
  const gapUnit = (60000 / effective - 31 * dit) / 19
  return { dit, dah: dit * 3, elementGap: dit, letterGap: gapUnit * 3, wordGap: gapUnit * 7, gapUnit }
}
