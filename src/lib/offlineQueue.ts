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

export async function flushQueue(): Promise<{ synced: string[]; failed: string[] }> {
  const synced: string[] = []
  const failed: string[] = []

  for (const entry of getQueue()) {
    try {
      const res = await fetch(entry.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry.payload),
      })
      if (res.ok || (res.status >= 400 && res.status < 500)) {
        // sucesso, ou erro definitivo do servidor (reenviar não vai adiantar)
        removeFromQueue(entry.localId)
        synced.push(entry.localId)
      } else {
        failed.push(entry.localId)
      }
    } catch {
      // erro de rede — provável ainda offline, mantém na fila e para por aqui
      failed.push(entry.localId)
      break
    }
  }

  return { synced, failed }
}
