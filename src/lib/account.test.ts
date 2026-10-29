import { beforeEach, expect, it, vi } from 'vitest'
import { createAccount, parseSnapshot, readAccount, saveAccount, accountTable } from './account'
import { applyPreset, defaultSettings, defaultStatistics, recordInfinite } from './storage'
import type { Snapshot } from './account'

const { query, from } = vi.hoisted(() => {
  const query = { select: vi.fn(), eq: vi.fn(), insert: vi.fn(), update: vi.fn(), single: vi.fn(), maybeSingle: vi.fn() }
  return { query, from: vi.fn(() => query) }
})
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ from }) }))
const snapshot = (): Snapshot => ({ settings: { ...defaultSettings }, training: {
  activePresetId: '20-10', presets: [{ id: '20-10', characterWpm: 20, effectiveWpm: 10, statistics: defaultStatistics() }], errors: { A: 2 },
} })
beforeEach(() => {
  vi.clearAllMocks()
  for (const fn of [query.select, query.eq, query.insert, query.update]) fn.mockReturnValue(query)
})

it('preserves all presets, legacy bests and shared errors when importing', async () => {
  const data = snapshot()
  data.training = recordInfinite(applyPreset(data.training, 30, 15), 58)
  delete data.training.presets[0].statistics.infiniteBest
  query.single.mockResolvedValue({ data: { revision: 0 }, error: null })
  expect(await createAccount('mac-user', data)).toEqual({ ...data, revision: 0 })
  expect(from).toHaveBeenCalledWith(accountTable)
  expect(query.insert).toHaveBeenCalledWith({ user_id: 'mac-user', ...data })
  expect(query.update).not.toHaveBeenCalled()
})
it('refuses a second import instead of replacing the Mac history', async () => {
  const error = new Error('duplicate key')
  query.single.mockResolvedValue({ data: null, error })
  await expect(createAccount('phone-user', snapshot())).rejects.toBe(error)
  expect(query.update).not.toHaveBeenCalled()
})
it('loads only the signed-in account and treats a missing row as migration required', async () => {
  query.maybeSingle.mockResolvedValue({ data: null, error: null })
  expect(await readAccount('owner')).toBeNull()
  expect(query.eq).toHaveBeenCalledWith('user_id', 'owner')
  expect(query.insert).not.toHaveBeenCalled()
  query.maybeSingle.mockResolvedValue({ data: { ...snapshot(), revision: 4 }, error: null })
  expect(await readAccount('owner')).toEqual({ ...snapshot(), revision: 4 })
})
it('uses a version check to reject stale writes from another device', async () => {
  query.maybeSingle.mockResolvedValue({ data: null, error: null })
  await expect(saveAccount('owner', snapshot(), 4)).rejects.toThrow('다른 기기')
  expect(query.eq).toHaveBeenCalledWith('revision', 4)
  expect(query.update).toHaveBeenCalledWith({ ...snapshot(), revision: 5 })
  query.maybeSingle.mockResolvedValue({ data: { revision: 5 }, error: null })
  expect(await saveAccount('owner', snapshot(), 4)).toBe(5)
})
it('propagates network errors without pretending the data was saved', async () => {
  const error = new Error('offline')
  query.maybeSingle.mockResolvedValue({ data: null, error })
  await expect(readAccount('owner')).rejects.toBe(error)
  await expect(saveAccount('owner', snapshot(), 0)).rejects.toBe(error)
})
it('rejects malformed cloud data before it can replace usable local data', () => {
  const data = snapshot()
  for (const bad of [null, {}, { ...data, settings: { ...data.settings, level: 99 } }, { ...data, training: { ...data.training, activePresetId: 'missing' } }, { ...data, training: { ...data.training, errors: { A: -1 } } }, { ...data, training: { ...data.training, presets: [{ ...data.training.presets[0], statistics: {} }] } }]) expect(() => parseSnapshot(bad)).toThrow()
  expect(parseSnapshot(data)).toEqual(data)
})
