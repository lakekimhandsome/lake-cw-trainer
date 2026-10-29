import type { ReactElement } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { AccountApp } from './AccountApp'
import App from '../App'
import { defaultSettings, defaultStatistics, saveSettings, saveTraining } from '../lib/storage'
import type { Account, Snapshot } from '../lib/account'

const mock = vi.hoisted(() => ({
  values: [] as unknown[], index: 0, changed: false,
  effects: [] as (() => void)[],
  read: vi.fn(), create: vi.fn(), save: vi.fn(), session: vi.fn(), listener: vi.fn(),
}))
vi.mock('react', () => ({
  useState: (initial: unknown) => {
    const i = mock.index++
    if (!(i in mock.values)) mock.values[i] = typeof initial === 'function' ? initial() : initial
    return [mock.values[i], (update: unknown) => {
      const next = typeof update === 'function' ? update(mock.values[i]) : update
      if (!Object.is(next, mock.values[i])) { mock.changed = true; mock.values[i] = next }
    }]
  },
  useRef: (current: unknown) => {
    const i = mock.index++
    if (!(i in mock.values)) mock.values[i] = { current }
    return mock.values[i]
  },
  useEffect: (effect: () => (() => void) | undefined, deps: unknown[]) => {
    const i = mock.index++
    const previous = mock.values[i] as { deps: unknown[]; cleanup?: () => void } | undefined
    if (!previous || deps.some((dep, n) => !Object.is(dep, previous.deps[n]))) {
      mock.values[i] = { deps }
      mock.effects.push(() => { previous?.cleanup?.(); (mock.values[i] as { cleanup?: () => void }).cleanup = effect() })
    }
  },
}))
vi.mock('../App', () => ({ default: () => null }))
vi.mock('../lib/account', async (original) => {
  const actual = await original<typeof import('../lib/account')>()
  return { ...actual, readAccount: mock.read, createAccount: mock.create, saveAccount: mock.save, supabase: { auth: {
    getSession: mock.session,
    onAuthStateChange: (listener: unknown) => { mock.listener.mockImplementation(listener as () => void); return { data: { subscription: { unsubscribe: vi.fn() } } } },
  } } }
})
const snapshot = (): Snapshot => ({ settings: { ...defaultSettings }, training: { activePresetId: '20-10', presets: [{ id: '20-10', characterWpm: 20, effectiveWpm: 10, statistics: defaultStatistics() }], errors: {} } })
function find(node: unknown, predicate: (element: ReactElement<Record<string, unknown>>) => boolean): ReactElement<Record<string, unknown>> | undefined {
  if (Array.isArray(node)) return node.map((child) => find(child, predicate)).find(Boolean)
  if (!node || typeof node !== 'object' || !('props' in node)) return
  const element = node as ReactElement<Record<string, unknown>>
  return predicate(element) ? element : find(element.props.children, predicate)
}
let tree: unknown
async function render() {
  for (let i = 0; i < 12; i++) {
    mock.index = 0; mock.changed = false; tree = AccountApp()
    for (const effect of mock.effects.splice(0)) effect()
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve()
    if (!mock.changed) break
  }
}
const app = () => find(tree, (element) => element.type === App)
const button = (label: string) => find(tree, (element) => element.type === 'button' && element.props.children === label)!
const change = (data: Snapshot) => (app()!.props.onSnapshot as (snapshot: Snapshot) => void)(data)

beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks()
  mock.values = []; mock.index = 0; mock.effects = []; mock.changed = false
  const storage = new Map<string, string>()
  vi.stubGlobal('localStorage', { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) })
  vi.stubGlobal('window', { setTimeout, clearTimeout, addEventListener: vi.fn(), removeEventListener: vi.fn(), confirm: vi.fn(() => true) })
  mock.session.mockResolvedValue({ data: { session: { user: { id: 'owner', email: 'owner@example.com' } } }, error: null })
  mock.read.mockResolvedValue(null)
  mock.create.mockImplementation(async (_user: string, data: Snapshot) => { const account = { ...data, revision: 0 }; mock.read.mockResolvedValue(account); return account })
  mock.save.mockResolvedValue(1)
})
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

it('requires an explicit import even when local records exist', async () => {
  saveTraining(snapshot().training)
  await render()
  expect(app()).toBeUndefined()
  expect(mock.create).not.toHaveBeenCalled()
  expect(mock.save).not.toHaveBeenCalled()
  await (button('이 기기 기록 가져오기 (맥)').props.onClick as () => Promise<void>)()
  await render()
  expect(mock.create).toHaveBeenCalledWith('owner', snapshot())
  expect(app()!.props.initialSnapshot).toEqual(snapshot())
})
it('uses the Mac account data without uploading or changing the phone local history', async () => {
  const phone = snapshot(); phone.training.presets[0].statistics.infiniteBest = 9
  saveTraining(phone.training); saveSettings(phone.settings)
  const mac = snapshot(); mac.training.presets[0].statistics.infiniteBest = 58
  mock.read.mockResolvedValue({ ...mac, revision: 3 })
  await render()
  expect(app()!.props.initialSnapshot).toEqual(mac)
  change(mac); await render(); await vi.advanceTimersByTimeAsync(500)
  expect(mock.create).not.toHaveBeenCalled(); expect(mock.save).not.toHaveBeenCalled()
  expect(JSON.parse(localStorage.getItem('lake-cw-training-v1')!)).toEqual(phone.training)
})
it('keeps failed writes for retry and recovers them after reload', async () => {
  mock.read.mockResolvedValue({ ...snapshot(), revision: 0 })
  await render()
  const updated = snapshot(); updated.training.presets[0].statistics.infiniteBest = 59
  mock.save.mockRejectedValueOnce(new Error('offline'))
  change(updated); await render(); await vi.advanceTimersByTimeAsync(300); await render()
  expect(localStorage.getItem('cw-trainer_pending:owner')).toContain('59')
  expect(app()).toBeUndefined()
  ;(button('다시 시도').props.onClick as () => void)(); await render()
  await vi.advanceTimersByTimeAsync(300); await render()
  expect(mock.save).toHaveBeenLastCalledWith('owner', updated, 0)
  expect(localStorage.getItem('cw-trainer_pending:owner')).toBeNull()
})
it('serializes rapid changes and advances the pending revision before the next write', async () => {
  let finish!: (value: number) => void
  mock.read.mockResolvedValue({ ...snapshot(), revision: 0 })
  mock.save.mockImplementationOnce(() => new Promise<number>((resolve) => { finish = resolve }))
  await render()
  const first = snapshot(); first.settings.volume = 30
  change(first); await render(); await vi.advanceTimersByTimeAsync(300); await render()
  const second = snapshot(); second.settings.volume = 40
  change(second); await render(); await vi.advanceTimersByTimeAsync(300)
  expect(mock.save).toHaveBeenCalledTimes(1)
  finish(1); await render()
  expect(JSON.parse(localStorage.getItem('cw-trainer_pending:owner')!).revision).toBe(1)
  await vi.advanceTimersByTimeAsync(300); await render()
  expect(mock.save).toHaveBeenLastCalledWith('owner', second, 1)
})
it('blocks conflicting recovered changes instead of overwriting newer cloud data', async () => {
  const pending = snapshot(); pending.settings.volume = 10
  localStorage.setItem('cw-trainer_pending:owner', JSON.stringify({ snapshot: pending, revision: 0 }))
  mock.read.mockResolvedValue({ ...snapshot(), revision: 1 } satisfies Account)
  await render(); await vi.advanceTimersByTimeAsync(500)
  expect(app()).toBeUndefined(); expect(mock.save).not.toHaveBeenCalled()
  expect(localStorage.getItem('cw-trainer_pending:owner')).not.toBeNull()
})
