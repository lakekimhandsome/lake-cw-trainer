export type Level = 1 | 2 | 3 | 4 | 5

export type Settings = {
  characterWpm: number
  effectiveWpm: number
  tone: number
  volume: number
  autoPlay: boolean
  level: Level
}

export type Problem = { text: string; level: Level }

export type GradePart = { value: string; kind: 'correct' | 'substitution' | 'missing' | 'extra' }

export type Grade = {
  normalizedAnswer: string
  normalizedInput: string
  parts: GradePart[]
  correct: boolean
  accuracy: number
  errors: string[]
}

export type Statistics = {
  total: number
  perfect: number
  totalAccuracy: number
  streak: number
  byLevel: Record<Level, { total: number; perfect: number }>
}

export type Preset = {
  id: string
  characterWpm: number
  effectiveWpm: number
  statistics: Statistics
}

export type Training = {
  activePresetId: string
  presets: Preset[]
  errors: Record<string, number>
}
