const STORAGE_KEY = 'jeleupec_offline_leite_queue'

export type QueuedEntry = {
  localId: string
  kind: 'diario' | 'animal'
  endpoint: string
  payload: Record<string, unknown>
  createdAt: string
}

function isBrowser() {
  return typeof window !== 'undefined'
}

function notifyChanged() {
  if (isBrowser()) window.dispatchEvent(new CustomEvent('offline-queue:changed'))
}

export function getQueue(): QueuedEntry[] {
  if (!isBrowser()) return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as QueuedEntry[]) : []
  } catch {
    return []
  }
}

function saveQueue(queue: QueuedEntry[]) {
  if (!isBrowser()) return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue))
  notifyChanged()
}

export function enqueue(entry: Omit<QueuedEntry, 'localId' | 'createdAt'>): QueuedEntry {
  const full: QueuedEntry = {
    ...entry,
    localId: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  }
  saveQueue([...getQueue(), full])
  return full
}

export function removeFromQueue(localId: string) {
  saveQueue(getQueue().filter((e) => e.localId !== localId))
}

// Tempo máximo de espera por tentativa — numa conexão ruim (não totalmente
// offline) o fetch pode ficar pendurado por muito tempo sem isso; sem um
// limite, uma tentativa lenta trava a fila inteira.
const SEND_TIMEOUT_MS = 8000

type SendResult =
  | { outcome: 'ok' }
  | { outcome: 'rejected'; error: string }
  | { outcome: 'retry' }

async function sendOne(entry: QueuedEntry): Promise<SendResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS)
  try {
    const res = await fetch(entry.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry.payload),
      signal: controller.signal,
    })
    if (res.ok) return { outcome: 'ok' }
    // erro definitivo do servidor (dado inválido etc.) — reenviar não adianta
    if (res.status >= 400 && res.status < 500) {
      const data = await res.json().catch(() => ({}))
      return { outcome: 'rejected', error: data.error ?? 'Dados rejeitados pelo servidor.' }
    }
    return { outcome: 'retry' }
  } catch {
    // erro de rede ou timeout — mantém na fila pra tentar de novo depois
    return { outcome: 'retry' }
  } finally {
    clearTimeout(timer)
  }
}

export async function flushQueue(): Promise<{
  synced: string[]
  failed: string[]
  rejected: { localId: string; error: string }[]
}> {
  const synced: string[] = []
  const failed: string[] = []
  const rejected: { localId: string; error: string }[] = []

  for (const entry of getQueue()) {
    const result = await sendOne(entry)
    if (result.outcome === 'retry') {
      failed.push(entry.localId)
      break // provável ainda sem conexão boa — não adianta tentar os próximos agora
    }
    if (result.outcome === 'rejected') {
      // Servidor recusou de vez (ex.: sessão expirada, dado inválido) —
      // reenviar não adianta, mas isso NÃO pode desaparecer sem avisar:
      // é um lançamento que o usuário fez e nunca vai ser salvo.
      removeFromQueue(entry.localId)
      rejected.push({ localId: entry.localId, error: result.error })
      continue
    }
    removeFromQueue(entry.localId)
    synced.push(entry.localId)
  }

  return { synced, failed, rejected }
}

// Salva a tentativa imediatamente na fila (nunca perde o dado, mesmo se o
// app fechar no meio do envio) e tenta mandar na hora. Devolve se ficou
// pendente (ainda na fila), foi confirmado, ou foi rejeitado pelo servidor.
export async function saveAndSend(entry: Omit<QueuedEntry, 'localId' | 'createdAt'>): Promise<SendResult> {
  const queued = enqueue(entry)
  // Já sabendo que está offline, nem tenta — evita esperar o timeout à toa.
  // Continua tentando de verdade quando o navegador diz que está online,
  // mesmo que a conexão esteja ruim (navigator.onLine não garante que dá
  // pra alcançar o servidor, só que tem algum sinal).
  if (!navigator.onLine) return { outcome: 'retry' }
  const result = await sendOne(queued)
  if (result.outcome !== 'retry') removeFromQueue(queued.localId)
  return result
}

// Roda a sincronização em background em QUALQUER tela do app, não só na de
// leite — antes, se o usuário lançasse um leite offline e saísse da tela de
// leite antes da conexão voltar, o lançamento nunca era enviado sozinho.
// Chamado uma única vez (guardado por módulo) a partir do DashboardShell,
// que fica montado o tempo todo enquanto o usuário navega pelo app.
let globalSyncStarted = false

export function startGlobalOfflineSync() {
  if (!isBrowser() || globalSyncStarted) return
  globalSyncStarted = true

  let syncing = false
  function trySync() {
    if (syncing || !navigator.onLine || getQueue().length === 0) return
    syncing = true
    flushQueue()
      .then(({ rejected }) => {
        if (rejected.length > 0) {
          window.dispatchEvent(new CustomEvent('offline-queue:rejected', { detail: { errors: rejected.map((r) => r.error) } }))
        }
      })
      .finally(() => { syncing = false })
  }

  function handleVisibility() { if (document.visibilityState === 'visible') trySync() }

  trySync()
  setInterval(trySync, 20000)
  window.addEventListener('online', trySync)
  window.addEventListener('offline-queue:changed', trySync)
  document.addEventListener('visibilitychange', handleVisibility)
}
