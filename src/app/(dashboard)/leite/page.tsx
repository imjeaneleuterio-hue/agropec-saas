'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { formatNumber, formatDate } from '@/lib/utils'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { getQueue, saveAndSend, type QueuedEntry } from '@/lib/offlineQueue'

type DailyRecord = {
  id: string
  farmId: string
  date: string
  morningLiters: number
  afternoonLiters: number
  eveningLiters: number
  totalLiters: number
  notes?: string
  createdAt: string
  pending?: boolean
}

type AnimalRecord = {
  id: string
  animalId: string
  date: string
  morningLiters: number
  afternoonLiters: number
  eveningLiters: number
  totalLiters: number
  notes?: string
  animal?: { id: string; name?: string; tag: string; breed: string }
  pending?: boolean
}

type Animal = { id: string; name?: string; tag: string; breed: string }
type Tab = 'diario' | 'animal'

const EMPTY_DAILY = { date: new Date().toISOString().split('T')[0], morningLiters: '', afternoonLiters: '', eveningLiters: '', notes: '' }
const EMPTY_ANIMAL = { animalId: '', date: new Date().toISOString().split('T')[0], morningLiters: '', afternoonLiters: '', eveningLiters: '', notes: '' }

function litersFromPayload(payload: Record<string, unknown>) {
  const morning = Number(payload.morningLiters) || 0
  const afternoon = Number(payload.afternoonLiters) || 0
  const evening = Number(payload.eveningLiters) || 0
  return { morning, afternoon, evening, total: morning + afternoon + evening }
}

export default function LeitePage() {
  const [tab, setTab] = useState<Tab>('diario')
  const [showModal, setShowModal] = useState(false)
  const [dailyRecords, setDailyRecords] = useState<DailyRecord[]>([])
  const [animalRecords, setAnimalRecords] = useState<AnimalRecord[]>([])
  const [animals, setAnimals] = useState<Animal[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [offlineSuccess, setOfflineSuccess] = useState(false)
  const [dailyForm, setDailyForm] = useState(EMPTY_DAILY)
  const [animalForm, setAnimalForm] = useState(EMPTY_ANIMAL)
  const [queue, setQueue] = useState<QueuedEntry[]>([])
  const [online, setOnline] = useState(true)
  const [rejectedErrors, setRejectedErrors] = useState<string[]>([])

  const loadDailyRecords = useCallback(async () => {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)
    const res = await fetch(`/api/leite/diario?startDate=${thirtyDaysAgo.toISOString().split('T')[0]}&limit=60`)
    const data = await res.json()
    if (Array.isArray(data.data)) setDailyRecords(data.data)
  }, [])

  const loadAnimalRecords = useCallback(async () => {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)
    const res = await fetch(`/api/leite?startDate=${thirtyDaysAgo.toISOString().split('T')[0]}&limit=500`)
    const data = await res.json()
    if (Array.isArray(data.data)) setAnimalRecords(data.data)
  }, [])

  useEffect(() => {
    setLoading(true)
    Promise.all([loadDailyRecords(), loadAnimalRecords()]).finally(() => setLoading(false))
    fetch('/api/animais?type=DAIRY&limit=200').then((r) => r.json()).then((d) => setAnimals(d.data ?? [])).catch(() => {})
  }, [loadDailyRecords, loadAnimalRecords])

  // ---- fila de lançamentos offline ----
  // O envio de verdade (flushQueue) roda em background a partir do
  // DashboardShell (startGlobalOfflineSync), então funciona em qualquer tela
  // do app — não só nessa. Aqui só refletimos o estado da fila na tela:
  // atualiza a lista de pendentes e recarrega os registros quando algo muda
  // (por exemplo, quando um lançamento sai da fila porque foi sincronizado
  // em outra tela), e mostra o aviso se algo for rejeitado de vez.
  useEffect(() => {
    function syncQueue() { setQueue(getQueue()); loadDailyRecords(); loadAnimalRecords() }
    function handleOnline() { setOnline(true) }
    function handleOffline() { setOnline(false) }
    function handleVisibility() { if (document.visibilityState === 'visible') setOnline(navigator.onLine) }
    function handleRejected(e: Event) {
      const detail = (e as CustomEvent).detail as { errors: string[] }
      setRejectedErrors((prev) => [...prev, ...detail.errors])
    }

    setOnline(navigator.onLine)
    setQueue(getQueue())

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('offline-queue:changed', syncQueue)
    window.addEventListener('offline-queue:rejected', handleRejected)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('offline-queue:changed', syncQueue)
      window.removeEventListener('offline-queue:rejected', handleRejected)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [loadDailyRecords, loadAnimalRecords])

  const pendingDaily: DailyRecord[] = useMemo(() => queue.filter((q) => q.kind === 'diario').map((q) => {
    const { morning, afternoon, evening, total } = litersFromPayload(q.payload)
    return {
      id: `pending-${q.localId}`, farmId: '', date: String(q.payload.date ?? ''),
      morningLiters: morning, afternoonLiters: afternoon, eveningLiters: evening, totalLiters: total,
      notes: q.payload.notes as string | undefined, createdAt: q.createdAt, pending: true,
    }
  }), [queue])

  const pendingAnimal: AnimalRecord[] = useMemo(() => queue.filter((q) => q.kind === 'animal').map((q) => {
    const { morning, afternoon, evening, total } = litersFromPayload(q.payload)
    const animal = animals.find((a) => a.id === q.payload.animalId)
    return {
      id: `pending-${q.localId}`, animalId: String(q.payload.animalId ?? ''), date: String(q.payload.date ?? ''),
      morningLiters: morning, afternoonLiters: afternoon, eveningLiters: evening, totalLiters: total,
      notes: q.payload.notes as string | undefined, animal, pending: true,
    }
  }), [queue, animals])

  const allDailyRecords = useMemo(() => [...pendingDaily, ...dailyRecords], [pendingDaily, dailyRecords])
  const allAnimalRecords = useMemo(() => [...pendingAnimal, ...animalRecords], [pendingAnimal, animalRecords])

  // ---- chart: last 7 days from daily records ----
  const today = new Date()
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - (6 - i))
    const dateStr = d.toISOString().split('T')[0]
    const label = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    const rec = allDailyRecords.find((r) => r.date.split('T')[0] === dateStr)
    return { date: label, total: rec?.totalLiters ?? 0, morning: rec?.morningLiters ?? 0, afternoon: rec?.afternoonLiters ?? 0 }
  })

  const hasDailyData = allDailyRecords.length > 0
  const todayStr = today.toISOString().split('T')[0]
  const todayRecord = allDailyRecords.find((r) => r.date.split('T')[0] === todayStr)
  const yesterdayStr = new Date(today.getTime() - 86400000).toISOString().split('T')[0]
  const yesterdayRecord = allDailyRecords.find((r) => r.date.split('T')[0] === yesterdayStr)
  const todayTotal = todayRecord?.totalLiters ?? 0
  const yesterdayTotal = yesterdayRecord?.totalLiters ?? 0
  const diff = yesterdayTotal > 0 ? ((todayTotal - yesterdayTotal) / yesterdayTotal * 100).toFixed(1) : null
  const last30Total = allDailyRecords.reduce((s, r) => s + r.totalLiters, 0)

  // ---- top producers from animal records ----
  const cowMap: Record<string, { id: string; name: string; tag: string; breed: string; total: number; today: number; count: number }> = {}
  allAnimalRecords.forEach((r) => {
    const id = r.animalId
    if (!cowMap[id]) cowMap[id] = { id, name: r.animal?.name ?? 'Sem nome', tag: r.animal?.tag ?? '—', breed: r.animal?.breed ?? '—', total: 0, today: 0, count: 0 }
    cowMap[id].total += r.totalLiters
    cowMap[id].count += 1
    if (r.date.split('T')[0] === todayStr) cowMap[id].today += r.totalLiters
  })
  const topCows = Object.values(cowMap).sort((a, b) => b.total - a.total).slice(0, 10)

  // O total do dia é sempre a soma de manhã+tarde+noite que está NO
  // FORMULÁRIO no momento de salvar — não soma com o que já tinha sido
  // salvo antes (o servidor substitui o dia inteiro). Por isso, ao abrir o
  // formulário (ou trocar a data), ele já vem preenchido com o que já foi
  // registrado naquele dia: sem isso, lançar só o período da tarde apagava
  // a manhã que já estava salva, em vez de somar.
  function dailyFormFromRecord(dateStr: string) {
    const existing = allDailyRecords.find((r) => r.date.split('T')[0] === dateStr)
    if (!existing) return { ...EMPTY_DAILY, date: dateStr }
    return {
      date: dateStr,
      morningLiters: existing.morningLiters ? String(existing.morningLiters) : '',
      afternoonLiters: existing.afternoonLiters ? String(existing.afternoonLiters) : '',
      eveningLiters: existing.eveningLiters ? String(existing.eveningLiters) : '',
      notes: existing.notes ?? '',
    }
  }

  function resetForms() { setDailyForm(dailyFormFromRecord(EMPTY_DAILY.date)); setAnimalForm(EMPTY_ANIMAL); setError(''); setSuccess(false); setOfflineSuccess(false) }

  async function handleSaveDaily() {
    setError('')
    const total = (Number(dailyForm.morningLiters) || 0) + (Number(dailyForm.afternoonLiters) || 0) + (Number(dailyForm.eveningLiters) || 0)
    if (total <= 0) { setError('Informe ao menos um valor de produção.'); return }
    setSaving(true)
    const payload = {
      date: dailyForm.date,
      morningLiters: Number(dailyForm.morningLiters) || 0,
      afternoonLiters: Number(dailyForm.afternoonLiters) || 0,
      eveningLiters: Number(dailyForm.eveningLiters) || 0,
      notes: dailyForm.notes,
    }

    // Salva localmente primeiro (nunca perde o lançamento, mesmo se a
    // conexão cair ou o app fechar no meio do envio) e tenta mandar na hora.
    const result = await saveAndSend({ kind: 'diario', endpoint: '/api/leite/diario', payload })
    setQueue(getQueue())
    setSaving(false)

    if (result.outcome === 'rejected') { setError(result.error); return }

    setSuccess(true)
    if (result.outcome === 'retry') {
      setOfflineSuccess(true)
      setTimeout(() => { setShowModal(false); resetForms() }, 1400)
    } else {
      setTimeout(() => { setShowModal(false); resetForms(); loadDailyRecords() }, 1200)
    }
  }

  async function handleSaveAnimal() {
    setError('')
    if (!animalForm.animalId) { setError('Selecione um animal.'); return }
    const total = (Number(animalForm.morningLiters) || 0) + (Number(animalForm.afternoonLiters) || 0) + (Number(animalForm.eveningLiters) || 0)
    if (total <= 0) { setError('Informe ao menos um valor de produção.'); return }
    setSaving(true)
    const payload = {
      animalId: animalForm.animalId,
      date: animalForm.date,
      morningLiters: Number(animalForm.morningLiters) || 0,
      afternoonLiters: Number(animalForm.afternoonLiters) || 0,
      eveningLiters: Number(animalForm.eveningLiters) || 0,
      notes: animalForm.notes,
    }

    const result = await saveAndSend({ kind: 'animal', endpoint: '/api/leite', payload })
    setQueue(getQueue())
    setSaving(false)

    if (result.outcome === 'rejected') { setError(result.error); return }

    setSuccess(true)
    if (result.outcome === 'retry') {
      setOfflineSuccess(true)
      setTimeout(() => { setShowModal(false); resetForms() }, 1400)
    } else {
      setTimeout(() => { setShowModal(false); resetForms(); loadAnimalRecords() }, 1200)
    }
  }

  const totalField = tab === 'diario'
    ? (Number(dailyForm.morningLiters) || 0) + (Number(dailyForm.afternoonLiters) || 0) + (Number(dailyForm.eveningLiters) || 0)
    : (Number(animalForm.morningLiters) || 0) + (Number(animalForm.afternoonLiters) || 0) + (Number(animalForm.eveningLiters) || 0)

  return (
    <div className="space-y-6">
      {/* Lançamentos offline que o servidor recusou de vez (ex: sessão expirada) */}
      {rejectedErrors.length > 0 && (
        <div className="flex items-start gap-3 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-semibold">
          <span className="text-lg leading-none">⚠️</span>
          <div className="flex-1">
            <p>{rejectedErrors.length} lançamento{rejectedErrors.length !== 1 ? 's' : ''} feito{rejectedErrors.length !== 1 ? 's' : ''} offline não foi{rejectedErrors.length !== 1 ? 'ram' : ''} salvo{rejectedErrors.length !== 1 ? 's' : ''}: {rejectedErrors[0]}</p>
            <p className="text-xs font-normal mt-1">Provavelmente sua sessão expirou enquanto você estava sem internet. Faça login novamente e registre esse lançamento de novo.</p>
          </div>
          <button onClick={() => setRejectedErrors([])} className="text-red-700 text-lg leading-none px-1">×</button>
        </div>
      )}

      {/* Offline / pending banner */}
      {(!online || queue.length > 0) && (
        <div className="flex items-center gap-3 p-3.5 bg-alert-bg border border-alert-border rounded-xl text-alert-text text-sm font-semibold">
          <span className="text-lg leading-none">{online ? '🔄' : '📡'}</span>
          <span>
            {online
              ? `Sincronizando ${queue.length} lançamento${queue.length !== 1 ? 's' : ''} pendente${queue.length !== 1 ? 's' : ''}...`
              : `Você está offline${queue.length > 0 ? ` — ${queue.length} lançamento${queue.length !== 1 ? 's' : ''} pendente${queue.length !== 1 ? 's' : ''}` : ''}. Os lançamentos serão enviados quando a conexão voltar.`}
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="page-title">Controle Leiteiro</h1>
          <p className="text-muted-3 text-sm">Gestão da produção de leite do rebanho</p>
        </div>
        <button onClick={() => { resetForms(); setShowModal(true) }} className="btn-primary">
          + Registrar Produção
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-xl">🥛</div>
          <div>
            <p className="text-2xl font-bold">{formatNumber(todayTotal)} L</p>
            <p className="text-xs text-muted-3">Produção Hoje (rebanho)</p>
            {diff !== null && (
              <p className={`text-xs font-medium ${Number(diff) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {Number(diff) >= 0 ? '▲' : '▼'} {Math.abs(Number(diff))}% vs ontem
              </p>
            )}
          </div>
        </div>
        <div className="stat-card">
          <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-xl">📅</div>
          <div>
            <p className="text-2xl font-bold">{formatNumber(last30Total)} L</p>
            <p className="text-xs text-muted-3">Acumulado (30 dias)</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-xl">📊</div>
          <div>
            <p className="text-2xl font-bold">{allDailyRecords.length}</p>
            <p className="text-xs text-muted-3">Dias Registrados (30d)</p>
            {allDailyRecords.length > 0 && (
              <p className="text-xs text-muted-4">Média: {formatNumber(last30Total / allDailyRecords.length)} L/dia</p>
            )}
          </div>
        </div>
        <div className="stat-card">
          <div className="w-10 h-10 bg-yellow-50 rounded-xl flex items-center justify-center text-xl">🐄</div>
          <div>
            <p className="text-2xl font-bold">{Object.keys(cowMap).length}</p>
            <p className="text-xs text-muted-3">Animais c/ Registro</p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="card p-5">
        <h2 className="section-title mb-4">Produção Diária do Rebanho — Últimos 7 dias</h2>
        {loading ? (
          <div className="h-[220px] flex items-center justify-center text-muted-4 text-sm">Carregando...</div>
        ) : !hasDailyData ? (
          <div className="h-[220px] flex flex-col items-center justify-center text-muted-4">
            <p className="text-3xl mb-2">🥛</p>
            <p className="text-sm">Nenhuma produção registrada ainda.</p>
            <p className="text-xs mt-1">Clique em "Registrar Produção" para começar.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#efe9db"/>
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#9a9280' }}/>
              <YAxis tick={{ fontSize: 12, fill: '#9a9280' }}/>
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #efe9db' }} formatter={(v: number, n: string) => [`${formatNumber(v)} L`, n === 'total' ? 'Total' : n === 'morning' ? 'Manhã' : 'Tarde']}/>
              <Area type="monotone" dataKey="total" stroke="#16a34a" fill="url(#totalGrad)" strokeWidth={2} name="total"/>
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Daily production history */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-paper flex items-center justify-between">
          <h2 className="section-title">Histórico de Produção Diária</h2>
          <span className="text-xs text-muted-4">{allDailyRecords.length} registros</span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-muted-4 text-sm">Carregando...</div>
        ) : allDailyRecords.length === 0 ? (
          <div className="p-10 text-center text-muted-4">
            <p className="text-3xl mb-2">📋</p>
            <p className="text-sm">Nenhum registro de produção diária.</p>
            <p className="text-xs mt-1">Registre a produção total do rebanho a cada dia.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-paper">
                  <th className="text-left px-4 py-2.5 text-muted-2 font-medium">Data</th>
                  <th className="text-right px-4 py-2.5 text-muted-2 font-medium hidden sm:table-cell">Manhã (L)</th>
                  <th className="text-right px-4 py-2.5 text-muted-2 font-medium hidden sm:table-cell">Tarde (L)</th>
                  <th className="text-right px-4 py-2.5 text-muted-2 font-medium hidden md:table-cell">Noite (L)</th>
                  <th className="text-right px-4 py-2.5 text-muted-2 font-medium">Total (L)</th>
                  <th className="px-4 py-2.5 text-muted-2 font-medium hidden lg:table-cell">Obs.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-paper">
                {allDailyRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-paper">
                    <td className="px-4 py-3 font-medium text-ink">
                      <span className="flex items-center gap-2">
                        {formatDate(r.date)}
                        {r.date.split('T')[0] === todayStr && !r.pending && <span className="badge bg-green-100 text-green-700 text-xs">Hoje</span>}
                        {r.pending && <span className="badge bg-alert-bg text-alert-text text-xs">🕓 Pendente de envio</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-muted-2 hidden sm:table-cell">{formatNumber(r.morningLiters)}</td>
                    <td className="px-4 py-3 text-right text-muted-2 hidden sm:table-cell">{formatNumber(r.afternoonLiters)}</td>
                    <td className="px-4 py-3 text-right text-muted-2 hidden md:table-cell">{formatNumber(r.eveningLiters)}</td>
                    <td className="px-4 py-3 text-right font-bold text-primary-700">{formatNumber(r.totalLiters)} L</td>
                    <td className="px-4 py-3 text-muted-4 text-xs hidden lg:table-cell truncate max-w-[160px]">{r.notes ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Top Producers (from animal records) */}
      {topCows.length > 0 && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-paper">
            <h2 className="section-title">Maiores Produtoras — Por Animal (30 dias)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-paper">
                  <th className="text-left px-4 py-2.5 text-muted-2 font-medium">Animal</th>
                  <th className="text-right px-4 py-2.5 text-muted-2 font-medium">Hoje (L)</th>
                  <th className="text-right px-4 py-2.5 text-muted-2 font-medium hidden sm:table-cell">Total 30d (L)</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-paper">
                {topCows.map((cow, i) => (
                  <tr key={cow.id} className="hover:bg-paper">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-muted-4 w-5">#{i + 1}</span>
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm">🐄</div>
                        <div>
                          <p className="font-medium text-ink">{cow.name}</p>
                          <p className="text-xs text-muted-3">{cow.breed} • #{cow.tag}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-primary-700">{formatNumber(cow.today)} L</td>
                    <td className="px-4 py-3 text-right text-muted-2 hidden sm:table-cell">{formatNumber(cow.total)} L</td>
                    <td className="px-4 py-3 text-right">
                      <button className="btn-ghost text-xs px-2 py-1"
                        onClick={() => { resetForms(); setTab('animal'); setAnimalForm((f) => ({ ...f, animalId: cow.id })); setShowModal(true) }}>
                        + Registrar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            {success ? (
              <div className="text-center py-10">
                <div className="text-5xl mb-3">{offlineSuccess ? '📡' : '✅'}</div>
                {offlineSuccess ? (
                  <>
                    <p className="font-semibold text-alert-text">Salvo neste aparelho!</p>
                    <p className="text-sm text-muted-3 mt-1">Será enviado ao servidor assim que a internet voltar.</p>
                  </>
                ) : (
                  <p className="font-semibold text-green-700">Produção registrada com sucesso!</p>
                )}
              </div>
            ) : (
              <>
                {!online && (
                  <div className="flex items-center gap-2 mb-4 p-2.5 bg-alert-bg border border-alert-border rounded-xl text-alert-text text-xs font-semibold">
                    📡 Sem internet agora — o lançamento fica salvo neste aparelho e envia sozinho depois.
                  </div>
                )}
                {/* Tab switcher */}
                <div className="flex gap-1 bg-paper rounded-xl p-1 mb-5">
                  <button
                    onClick={() => { setTab('diario'); setError('') }}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm transition-all ${tab === 'diario' ? 'bg-white shadow text-primary-700 font-semibold' : 'text-muted-3 font-medium'}`}>
                    🥛 Total do Rebanho
                  </button>
                  <button
                    onClick={() => { setTab('animal'); setError('') }}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm transition-all ${tab === 'animal' ? 'bg-white shadow text-primary-700 font-semibold' : 'text-muted-3 font-medium'}`}>
                    🐄 Por Animal
                  </button>
                </div>

                {tab === 'diario' ? (
                  <>
                    <h3 className="section-title mb-1">Produção Total do Dia</h3>
                    <p className="text-xs text-muted-3 mb-4">Informe o total tirado de <strong>todas as vacas</strong> no dia. Se o dia já tiver produção registrada, os valores aparecem preenchidos abaixo — complete só o período que faltava.</p>
                    <div className="space-y-4">
                      <div>
                        <label className="label">Data *</label>
                        <input type="date" className="input-field" value={dailyForm.date}
                          onChange={(e) => setDailyForm(dailyFormFromRecord(e.target.value))}/>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="label">Manhã (L)</label>
                          <input type="number" step="0.1" min="0" placeholder="0.0" className="input-field"
                            value={dailyForm.morningLiters} onChange={(e) => setDailyForm({ ...dailyForm, morningLiters: e.target.value })}/>
                        </div>
                        <div>
                          <label className="label">Tarde (L)</label>
                          <input type="number" step="0.1" min="0" placeholder="0.0" className="input-field"
                            value={dailyForm.afternoonLiters} onChange={(e) => setDailyForm({ ...dailyForm, afternoonLiters: e.target.value })}/>
                        </div>
                        <div>
                          <label className="label">Noite (L)</label>
                          <input type="number" step="0.1" min="0" placeholder="0.0" className="input-field"
                            value={dailyForm.eveningLiters} onChange={(e) => setDailyForm({ ...dailyForm, eveningLiters: e.target.value })}/>
                        </div>
                      </div>
                      <div className="bg-primary-50 border border-primary-100 rounded-xl p-4 text-center">
                        <p className="text-xs text-muted-3 mb-1">Total do dia</p>
                        <p className="text-3xl font-bold text-primary-700">{formatNumber(totalField)} L</p>
                      </div>
                      <div>
                        <label className="label">Observações</label>
                        <input type="text" className="input-field" placeholder="Ex: chuva, animais novos..."
                          value={dailyForm.notes} onChange={(e) => setDailyForm({ ...dailyForm, notes: e.target.value })}/>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="section-title mb-1">Produção por Animal</h3>
                    <p className="text-xs text-muted-3 mb-4">Registre a produção individual de uma vaca.</p>
                    <div className="space-y-4">
                      <div>
                        <label className="label">Animal *</label>
                        <select className="input-field" value={animalForm.animalId} onChange={(e) => setAnimalForm({ ...animalForm, animalId: e.target.value })}>
                          <option value="">Selecione a vaca</option>
                          {animals.map((a) => (
                            <option key={a.id} value={a.id}>{a.name ?? 'Sem nome'} — #{a.tag} ({a.breed})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="label">Data *</label>
                        <input type="date" className="input-field" value={animalForm.date}
                          onChange={(e) => setAnimalForm({ ...animalForm, date: e.target.value })}/>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="label">Manhã (L)</label>
                          <input type="number" step="0.1" min="0" placeholder="0.0" className="input-field"
                            value={animalForm.morningLiters} onChange={(e) => setAnimalForm({ ...animalForm, morningLiters: e.target.value })}/>
                        </div>
                        <div>
                          <label className="label">Tarde (L)</label>
                          <input type="number" step="0.1" min="0" placeholder="0.0" className="input-field"
                            value={animalForm.afternoonLiters} onChange={(e) => setAnimalForm({ ...animalForm, afternoonLiters: e.target.value })}/>
                        </div>
                        <div>
                          <label className="label">Noite (L)</label>
                          <input type="number" step="0.1" min="0" placeholder="0.0" className="input-field"
                            value={animalForm.eveningLiters} onChange={(e) => setAnimalForm({ ...animalForm, eveningLiters: e.target.value })}/>
                        </div>
                      </div>
                      <div className="bg-primary-50 border border-primary-100 rounded-xl p-4 text-center">
                        <p className="text-xs text-muted-3 mb-1">Total do animal</p>
                        <p className="text-3xl font-bold text-primary-700">{formatNumber(totalField)} L</p>
                      </div>
                      <div>
                        <label className="label">Observações</label>
                        <input type="text" className="input-field" placeholder="Opcional..."
                          value={animalForm.notes} onChange={(e) => setAnimalForm({ ...animalForm, notes: e.target.value })}/>
                      </div>
                    </div>
                  </>
                )}

                {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mt-3">{error}</p>}

                <div className="flex gap-3 mt-5">
                  <button onClick={() => { setShowModal(false); resetForms() }} className="btn-secondary flex-1">Cancelar</button>
                  <button onClick={tab === 'diario' ? handleSaveDaily : handleSaveAnimal} disabled={saving} className="btn-primary flex-1">
                    {saving ? '⏳ Salvando...' : '✓ Salvar'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
