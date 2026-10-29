import { useEffect, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import App from '../App'
import { createAccount, fingerprint, parseSnapshot, pendingKey, readAccount, saveAccount, supabase } from '../lib/account'
import type { Snapshot } from '../lib/account'
import { loadSettings, loadTraining } from '../lib/storage'

type Progress = { snapshot: Snapshot; revision: number; saved: string }
const message = (error: unknown) => error instanceof Error ? error.message : '계정 연결에 실패했습니다. 연결 상태를 확인하고 다시 시도하세요.'

export function AccountApp() {
  const [user, setUser] = useState<User | null>()
  const [progress, setProgress] = useState<Progress | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [generation, setGeneration] = useState(0)
  const writing = useRef(false)
  const identity = useRef<string | null>(null)
  const current = useRef(progress)
  current.current = progress
  const dirty = !!progress && fingerprint(progress.snapshot) !== progress.saved

  useEffect(() => {
    let active = true
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      const id = session?.user.id ?? null
      if (identity.current !== id) {
        identity.current = id
        setLoaded(false); setProgress(null); setError('')
      }
      setUser(session?.user ?? null)
    })
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (error) setError(message(error))
      else { identity.current = data.session?.user.id ?? null; setUser(data.session?.user ?? null) }
    }).catch((err) => { if (active) setError(message(err)) })
    return () => { active = false; subscription.unsubscribe() }
  }, [generation])

  useEffect(() => {
    if (!user) return
    let active = true
    setLoaded(false); setError('')
    void readAccount(user.id).then((account) => {
      if (!active) return
      if (account) {
        const snapshot = { settings: account.settings, training: account.training }
        const pending = localStorage.getItem(pendingKey(user.id))
        if (pending) {
          const saved = JSON.parse(pending)
          if (!Number.isSafeInteger(saved.revision) || saved.revision < 0) throw new Error('미저장 기록의 버전이 올바르지 않습니다. 백업 후 계정 기록을 불러오세요.')
          const recovered = parseSnapshot(saved.snapshot)
          setProgress({ snapshot: recovered, revision: saved.revision, saved: '' })
          if (saved.revision !== account.revision) {
            if (fingerprint(recovered) === fingerprint(snapshot)) {
              localStorage.removeItem(pendingKey(user.id))
              setProgress({ snapshot, revision: account.revision, saved: fingerprint(snapshot) })
            } else setError('다른 기기의 기록과 미저장 기록이 충돌했습니다. 백업 후 계정 기록을 불러오세요.')
          }
        } else setProgress({ snapshot, revision: account.revision, saved: fingerprint(snapshot) })
      } else setProgress(null)
      setLoaded(true)
    }).catch((err) => { if (active) setError(message(err)) })
    return () => { active = false }
  }, [user?.id, generation])

  useEffect(() => {
    if (!user || !loaded || !progress || !dirty || error || writing.current) return
    const userId = user.id
    const saving = progress
    const timer = window.setTimeout(() => {
      writing.current = true
      setBusy(true)
      void saveAccount(userId, saving.snapshot, saving.revision).then((revision) => {
        if (identity.current !== userId) return
        const latest = current.current!
        if (fingerprint(latest.snapshot) === fingerprint(saving.snapshot)) localStorage.removeItem(pendingKey(userId))
        else localStorage.setItem(pendingKey(userId), JSON.stringify({ snapshot: latest.snapshot, revision }))
        setProgress({ snapshot: latest.snapshot, revision, saved: fingerprint(saving.snapshot) })
      }).catch((err) => { if (identity.current === userId) setError(message(err)) }).finally(() => {
        writing.current = false
        setBusy(false)
      })
    }, 300)
    return () => window.clearTimeout(timer)
  }, [user?.id, loaded, progress, dirty, error, busy])

  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const run = async (action: () => Promise<void>) => {
    setBusy(true); setError('')
    try { await action() } catch (err) { setError(message(err)) } finally { setBusy(false) }
  }
  const initialize = () => run(async () => {
    const snapshot: Snapshot = { settings: loadSettings(), training: loadTraining() }
    const account = await createAccount(user!.id, snapshot)
    setProgress({ snapshot, revision: account.revision, saved: fingerprint(snapshot) })
    setGeneration((n) => n + 1)
  })
  const reload = () => {
    if ((dirty || (user && localStorage.getItem(pendingKey(user.id)))) && !window.confirm('미저장 기록은 계정 기록으로 대체됩니다. 먼저 백업을 내려받았나요?')) return
    if (user) localStorage.removeItem(pendingKey(user.id))
    setProgress(null); setLoaded(false); setGeneration((n) => n + 1)
  }
  const backup = () => {
    const pending = user && localStorage.getItem(pendingKey(user.id))
    const data = pending || JSON.stringify(progress?.snapshot ?? { settings: loadSettings(), training: loadTraining() }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'cw-trainer-backup.json'; a.click()
    URL.revokeObjectURL(url)
  }

  return <>
    <section className="account-bar" aria-label="계정 및 동기화">
      <div><strong>{user ? user.email : '학습 기록 계정'}</strong><p role="status">{user === undefined ? '로그인 확인 중…' : !user ? 'Google 계정으로 맥과 폰의 기록을 이어서 사용하세요.' : !loaded ? '계정 기록 불러오는 중…' : !progress ? '아직 계정 기록이 없습니다. 맥에서 먼저 가져오기를 진행하세요.' : dirty || busy ? '계정에 저장 중…' : '계정에 저장됨 · 다른 기기의 최신 기록은 불러오기를 누르세요.'}</p></div>
      <div className="account-actions">
        {!user && user !== undefined && <button disabled={busy} onClick={() => void run(async () => {
          const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/', queryParams: { prompt: 'select_account' } } })
          if (error) throw error
        })}>Google 로그인</button>}
        {user && <><button disabled={busy} onClick={reload}>계정 기록 불러오기</button><button disabled={busy || dirty} onClick={() => void run(async () => {
          const { error } = await supabase.auth.signOut({ scope: 'local' }); if (error) throw error
        })}>로그아웃</button></>}
        <button onClick={backup}>기록 백업</button>
      </div>
      {error && <p className="account-error" role="alert">{error} <button disabled={busy} onClick={() => { if (!loaded) setGeneration((n) => n + 1); setError('') }}>다시 시도</button></p>}
      {user && loaded && !progress && <div className="migration-choice"><p>맥: 기존 기록이 있는 브라우저에서 ‘이 기기 기록 가져오기’를 한 번 누르세요. 폰: 맥에서 가져오기를 마친 뒤 ‘계정 기록 불러오기’를 누르세요. 로그인만으로 이 기기 기록을 올리지 않습니다.</p><button disabled={busy} onClick={() => void initialize()}>이 기기 기록 가져오기 (맥)</button></div>}
    </section>
    {user === null ? <App key="guest" /> : user && loaded && progress && !error ? <App key={`${user.id}:${generation}`} initialSnapshot={progress.snapshot} onSnapshot={(snapshot) => {
      if (fingerprint(snapshot) === fingerprint(current.current!.snapshot)) return
      setProgress((value) => value && ({ ...value, snapshot }))
      try {
        localStorage.setItem(pendingKey(user.id), JSON.stringify({ snapshot, revision: current.current!.revision }))
      } catch (err) { setError(`이 기기에 임시 기록을 저장하지 못했습니다. ${message(err)}`) }
    }} /> : null}
  </>
}
