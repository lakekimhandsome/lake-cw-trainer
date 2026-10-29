import { createClient } from '@supabase/supabase-js'
import { defaultSettings } from './storage'
import type { Settings, Training } from '../types'

// Public project key; row access is restricted to the signed-in owner by RLS.
export const supabase = createClient('https://pbmzjxjtctwhgxxbcgxl.supabase.co', 'sb_publishable_unUQNuQ1GsBBT6W45Gmgfg_I12SXTF9', {
  auth: { storageKey: 'cw-trainer_auth', flowType: 'pkce' },
})
export const accountTable = 'cw-trainer_accounts'
export type Snapshot = { settings: Settings; training: Training }
export type Account = Snapshot & { revision: number }
export const pendingKey = (userId: string) => `cw-trainer_pending:${userId}`
export const fingerprint = (snapshot: Snapshot) => JSON.stringify({ settings: snapshot.settings, training: snapshot.training })

const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const count = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
const speed = (ch: unknown, ef: unknown) => count(ch) && count(ef) && ch >= 5 && ch <= 40 && ef >= 5 && ef <= ch

export function parseSnapshot(value: unknown): Snapshot {
  if (!object(value) || !object(value.settings) || !object(value.training)) throw new Error('저장된 데이터 형식이 올바르지 않습니다.')
  const s = { ...defaultSettings, ...value.settings }
  const t = value.training
  if (!speed(s.characterWpm, s.effectiveWpm) || !Number.isInteger(s.level) || s.level < 1 || s.level > 6 || !Number.isFinite(s.tone) || s.tone < 300 || s.tone > 1000 || !Number.isFinite(s.volume) || s.volume < 0 || s.volume > 100 || typeof s.autoPlay !== 'boolean' || typeof s.callsignsOnly !== 'boolean' || !Array.isArray(t.presets) || !t.presets.length || !object(t.errors) || !Object.values(t.errors).every(count)) throw new Error('저장된 설정 또는 기록이 올바르지 않습니다.')
  const ids = new Set<string>()
  for (const p of t.presets) {
    if (!object(p) || !speed(p.characterWpm, p.effectiveWpm) || p.id !== `${p.characterWpm}-${p.effectiveWpm}` || ids.has(p.id as string) || !object(p.statistics)) throw new Error('저장된 프리셋이 올바르지 않습니다.')
    ids.add(p.id as string)
    const stats = p.statistics
    if (![stats.total, stats.perfect, stats.streak, stats.infiniteBest ?? 0].every(count) || (stats.perfect as number) > (stats.total as number) || typeof stats.totalAccuracy !== 'number' || !Number.isFinite(stats.totalAccuracy) || stats.totalAccuracy < 0 || !object(stats.byLevel)) throw new Error('저장된 통계가 올바르지 않습니다.')
    for (const level of [1, 2, 3, 4, 5]) {
      const item = stats.byLevel[level]
      if (!object(item) || !count(item.total) || !count(item.perfect) || item.perfect > item.total) throw new Error('저장된 난이도별 통계가 올바르지 않습니다.')
    }
  }
  if (!ids.has(t.activePresetId as string)) throw new Error('현재 프리셋을 찾을 수 없습니다.')
  return { settings: s, training: t as Training }
}

export async function readAccount(userId: string): Promise<Account | null> {
  const { data, error } = await supabase.from(accountTable).select('settings,training,revision').eq('user_id', userId).maybeSingle()
  if (error) throw error
  if (!data) return null
  if (!count(data.revision)) throw new Error('기록 버전이 올바르지 않습니다.')
  return { ...parseSnapshot(data), revision: data.revision }
}

export async function createAccount(userId: string, snapshot: Snapshot): Promise<Account> {
  const validated = parseSnapshot(snapshot)
  // Insert only: a second device can never replace the first imported history.
  const { data, error } = await supabase.from(accountTable).insert({ user_id: userId, ...validated }).select('revision').single()
  if (error) throw error
  return { ...validated, revision: data.revision }
}

export async function saveAccount(userId: string, snapshot: Snapshot, revision: number): Promise<number> {
  const { data, error } = await supabase.from(accountTable).update({ ...parseSnapshot(snapshot), revision: revision + 1 }).eq('user_id', userId).eq('revision', revision).select('revision').maybeSingle()
  if (error) throw error
  if (!data) throw new Error('다른 기기에서 기록이 변경되었습니다. 이 기기의 미저장 기록을 백업한 뒤 계정 기록을 다시 불러오세요.')
  return data.revision
}
