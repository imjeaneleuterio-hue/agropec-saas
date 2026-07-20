'use client'

import { useState, useEffect } from 'react'
import { formatDate, LABELS, cn, daysFromToday } from '@/lib/utils'
import { handleTrialResponse } from '@/lib/trialEvent'
import { TrialBanner } from '@/components/TrialBanner'
import type { ReproductiveEvent, Animal } from '@/types'

const EVENT_COLORS: Record<string, string> = {
  ESTRUS: 'bg-pink-100 text-pink-700',
  NATURAL_MATING: 'bg-amber-100 text-amber-700',
  INSEMINATION: 'bg-blue-100 text-blue-700',
  PREGNANCY_CHECK_POSITIVE: 'bg-green-100 text-green-700',
  PREGNANCY_CHECK_NEGATIVE: 'bg-red-100 text-red-700',
  CALVING: 'bg-yellow-100 text-yellow-700',
  WEANING: 'bg-orange-100 text-orange-700',
  DRY_OFF: 'bg-paper text-muted-1',
  ABORTION: 'bg-red-200 text-red-800',
}

const EVENT_ICONS: Record<string, string> = {
  ESTRUS: '❤️', NATURAL_MATING: '🐂', INSEMINATION: '💉', PREGNANCY_CHECK_POSITIVE: '✅',
  PREGNANCY_CHECK_NEGATIVE: '❌', CALVING: '🐮', WEANING: '🍼',
  DRY_OFF: '🚫', ABORTION: '⚠️',
}

const EMPTY_FORM = {
  animalId: '',
  type: '',
  date: new Date().toISOString().split('T')[0],
  bullName: '',
  expectedCalving: '',
  result: '',
  notes: '',
}

type EstrusAlert = { id: string; title: string; dueDate: string; description: string }

export default function ReproducaoPage() {
  const [events, setEvents] = useState<ReproductiveEvent[]>([])
  const [animals, setAnimals] = useState<Animal[]>([])
  const [upcomingCios, setUpcomingCios] = useState<EstrusAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [filterType, setFilterType] = useState('ALL')
  const [form, setForm] = useState(EMPTY_FORM)

  async function loadAnimals() {
    try {
      const res = await fetch('/api/animais?limit=200&status=ACTIVE&sex=FEMALE')
      const data = await res.json()
      if (Array.isArray(data.data)) setAnimals(data.data)
    } catch {}
  }

  async function load() {
    setLoading(true)
    try {
      const [repRes, alertRes] = await Promise.all([
        fetch('/api/reproducao'),
        fetch('/api/alertas?withinDays=30'),
      ])
      const repData = await repRes.json()
      const alertData = await alertRes.json()
      if (Array.isArray(repData.data)) setEvents(repData.data)
      if (Array.isArray(alertData.data)) {
        setUpcomingCios(
          alertData.data
            .filter((a: EstrusAlert) => a.title?.startsWith('Previsão de Cio') && a.dueDate)
            .sort((a: EstrusAlert, b: EstrusAlert) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
        )
      }
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    load()
    loadAnimals()
  }, [])

  async function handleSave() {
    if (!form.animalId || !form.type || !form.date) {
      setError('Animal, tipo e data são obrigatórios')
      return
    }
    setSaving(true)
    setError('')
    const res = await fetch('/api/reproducao', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        animalId: form.animalId,
        type: form.type,
        date: form.date,
        bullName: form.bullName || undefined,
        expectedCalving: form.expectedCalving || undefined,
        result: form.result || undefined,
        notes: form.notes || undefined,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      if (handleTrialResponse(data)) return
      setError(data.error ?? 'Erro ao salvar')
    } else {
      setShowModal(false)
      setForm(EMPTY_FORM)
      load()
      if (data.createdCalf) {
        setSuccessMsg(data.message)
        setTimeout(() => setSuccessMsg(''), 7000)
      }
    }
    setSaving(false)
  }

  const now = new Date()
  const filtered = filterType === 'ALL' ? events : events.filter((e) => e.type === filterType)

  // Vacas provavelmente prenhas: monta/IA há +30 dias sem evento negativo posterior por animal
  const provavelmentePrenhas = (() => {
    const NEGATIVO = new Set(['PREGNANCY_CHECK_NEGATIVE', 'ABORTION', 'CALVING', 'DRY_OFF'])
    // Agrupa todos os eventos por animal
    const porAnimal = new Map<string, ReproductiveEvent[]>()
    for (const e of events) {
      const aid = e.animalId ?? e.animal?.id
      if (!aid) continue
      if (!porAnimal.has(aid)) porAnimal.set(aid, [])
      porAnimal.get(aid)!.push(e)
    }
    const result: ReproductiveEvent[] = []
    for (const [, evs] of porAnimal) {
      const sorted = [...evs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      // Pega o evento de cobertura mais recente
      const cobertura = sorted.find((e) => e.type === 'INSEMINATION' || e.type === 'NATURAL_MATING')
      if (!cobertura) continue
      const diasDesde = (now.getTime() - new Date(cobertura.date).getTime()) / 86400000
      if (diasDesde < 30) continue // ainda cedo demais para presumir prenhez
      // Verifica se houve evento negativo APÓS a cobertura
      const temNegativo = sorted.some(
        (e) => NEGATIVO.has(e.type) && new Date(e.date) > new Date(cobertura.date)
      )
      // Verifica se já tem diagnóstico positivo confirmado (evita duplicar)
      const temPositivo = sorted.some(
        (e) => e.type === 'PREGNANCY_CHECK_POSITIVE' && new Date(e.date) > new Date(cobertura.date)
      )
      if (!temNegativo && !temPositivo) result.push(cobertura)
    }
    return result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  })()

  const pregnant = events.filter((e) => e.type === 'PREGNANCY_CHECK_POSITIVE').length + provavelmentePrenhas.length
  const inseminated30 = events.filter((e) => {
    if (e.type !== 'INSEMINATION' && e.type !== 'NATURAL_MATING') return false
    const d = new Date(e.date)
    return (now.getTime() - d.getTime()) / 86400000 <= 30
  }).length

  const upcomingCalvings = events
    .filter((e) => (e.type === 'INSEMINATION' || e.type === 'NATURAL_MATING' || e.type === 'PREGNANCY_CHECK_POSITIVE') && e.expectedCalving && new Date(e.expectedCalving) > now)
    .sort((a, b) => new Date(a.expectedCalving!).getTime() - new Date(b.expectedCalving!).getTime())
    .slice(0, 5)

  const calvings30 = upcomingCalvings.filter((e) => daysFromToday(e.expectedCalving!) <= 30).length

  const dryOff = events.filter((e) => e.type === 'DRY_OFF').length

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="page-title">Calendário Reprodutivo</h1>
          <p className="text-muted-3 text-sm">Gestão dos eventos reprodutivos do rebanho</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">+ Novo Evento</button>
      </div>
      <TrialBanner module="reproducao" />

      {successMsg && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 flex items-center justify-between">
          <span>✅ {successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="text-green-500 hover:text-green-700 ml-3 text-lg leading-none">×</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: '🤰', label: 'Prenhas', value: pregnant, color: 'bg-green-50 text-green-700' },
          { icon: '💉', label: 'IA / Monta (30d)', value: inseminated30, color: 'bg-blue-50 text-blue-700' },
          { icon: '🐮', label: 'Partos Previstos (30d)', value: calvings30, color: 'bg-yellow-50 text-yellow-700' },
          { icon: '🚫', label: 'Secagens Registradas', value: dryOff, color: 'bg-paper text-muted-1' },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${s.color}`}>{s.icon}</div>
            <div>
              <p className="text-2xl font-bold text-ink">{s.value}</p>
              <p className="text-xs text-muted-3">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Vacas provavelmente prenhas */}
      {provavelmentePrenhas.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="section-title">🤰 Prenhas</h2>
            <span className="text-xs text-muted-4 font-normal">(monta/IA há +30 dias sem evento negativo)</span>
          </div>
          <div className="space-y-3">
            {provavelmentePrenhas.map((e) => {
              const dias = Math.floor((now.getTime() - new Date(e.date).getTime()) / 86400000)
              const partoPrevisto = new Date(e.date)
              partoPrevisto.setDate(partoPrevisto.getDate() + 283)
              return (
                <div key={e.id} className="flex items-center gap-4 p-3 bg-green-50 border border-green-200 rounded-xl">
                  <div className="text-2xl">🤰</div>
                  <div className="flex-1">
                    <p className="font-medium text-ink">
                      {e.animal?.name ?? 'Animal'} <span className="text-muted-3 text-sm">#{e.animal?.tag}</span>
                    </p>
                    <p className="text-sm text-muted-2">
                      {e.type === 'INSEMINATION' ? 'Inseminada' : 'Montada'} em {formatDate(e.date)} · <span className="font-medium">{dias} dias</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-3">Parto estimado</p>
                    <p className="font-semibold text-ink">{formatDate(partoPrevisto)}</p>
                  </div>
                </div>
              )
            })}
          </div>
          <p className="text-xs text-muted-4 mt-3">Confirme registrando um Diagnóstico Positivo para cada animal.</p>
        </div>
      )}

      {/* Upcoming Calvings */}
      {upcomingCalvings.length > 0 && (
        <div className="card p-5">
          <h2 className="section-title mb-4">Partos Previstos</h2>
          <div className="space-y-3">
            {upcomingCalvings.map((e) => {
              const daysLeft = daysFromToday(e.expectedCalving!)
              return (
                <div key={e.id} className="flex items-center gap-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                  <div className="text-2xl">🐮</div>
                  <div className="flex-1">
                    <p className="font-medium text-ink">
                      {e.animal?.name ?? 'Animal'} <span className="text-muted-3 text-sm">#{e.animal?.tag}</span>
                    </p>
                    <p className="text-sm text-muted-2">Inseminada em {formatDate(e.date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-ink">{formatDate(e.expectedCalving!)}</p>
                    <p className={cn('text-xs font-medium', daysLeft <= 15 ? 'text-red-600' : daysLeft <= 30 ? 'text-orange-600' : 'text-muted-3')}>
                      {daysLeft <= 0 ? 'Hoje!' : `Em ${daysLeft} dias`}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Próximos Cios */}
      {upcomingCios.length > 0 && (
        <div className="card p-5">
          <h2 className="section-title mb-4">❤️ Próximos Cios Previstos</h2>
          <div className="space-y-3">
            {upcomingCios.map((item) => {
              const daysLeft = daysFromToday(item.dueDate)
              const animalName = item.title.replace('Previsão de Cio — ', '')
              return (
                <div key={item.id} className="flex items-center gap-4 p-3 bg-pink-50 border border-pink-200 rounded-xl">
                  <div className="text-2xl">❤️</div>
                  <div className="flex-1">
                    <p className="font-medium text-ink">{animalName}</p>
                    <p className="text-sm text-muted-3">{item.description.split('—')[0].trim()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-ink">{formatDate(item.dueDate)}</p>
                    <p className={cn('text-xs font-medium',
                      daysLeft <= 0 ? 'text-pink-700 font-bold' :
                      daysLeft <= 2 ? 'text-pink-600' :
                      daysLeft <= 7 ? 'text-orange-500' : 'text-muted-3'
                    )}>
                      {daysLeft <= 0 ? 'Hoje!' : daysLeft === 1 ? 'Amanhã' : `Em ${daysLeft} dias`}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Events History */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-paper flex flex-wrap gap-3 items-center justify-between">
          <h2 className="section-title">Histórico de Eventos</h2>
          <select className="input-field w-auto text-sm" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="ALL">Todos os eventos</option>
            {Object.entries(LABELS.reproductiveType).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        {loading ? (
          <div className="p-8 text-center text-muted-4 text-sm">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-4 text-sm">
            Nenhum evento registrado. Clique em "+ Novo Evento" para adicionar.
          </div>
        ) : (
          <div className="divide-y divide-paper">
            {filtered.map((event) => (
              <div key={event.id} className="px-4 py-3 flex items-start gap-4 hover:bg-paper">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${EVENT_COLORS[event.type]}`}>
                  {EVENT_ICONS[event.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`badge text-xs ${EVENT_COLORS[event.type]}`}>
                      {LABELS.reproductiveType[event.type]}
                    </span>
                    <span className="font-medium text-ink">
                      {event.animal?.name ?? 'Animal'} <span className="text-muted-4 font-normal">#{event.animal?.tag}</span>
                    </span>
                  </div>
                  {event.bullName && <p className="text-sm text-muted-3 mt-0.5">Touro: {event.bullName}</p>}
                  {event.result && <p className="text-sm text-muted-2 mt-0.5">{event.result}</p>}
                  {event.notes && <p className="text-xs text-muted-4 mt-0.5">{event.notes}</p>}
                  {event.expectedCalving && (
                    <p className="text-xs text-green-600 font-medium mt-0.5">Parto previsto: {formatDate(event.expectedCalving)}</p>
                  )}
                </div>
                <p className="text-xs text-muted-3 whitespace-nowrap">{formatDate(event.date)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="section-title mb-4">Registrar Evento Reprodutivo</h3>
            <div className="space-y-4">
              <div>
                <label className="label">Animal *</label>
                <select className="input-field" value={form.animalId} onChange={(e) => setForm({ ...form, animalId: e.target.value })}>
                  <option value="">Selecione o animal</option>
                  {animals.map((a) => (
                    <option key={a.id} value={a.id}>{a.name ? `${a.name} — #${a.tag}` : `#${a.tag}`} ({a.breed})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Tipo de Evento *</label>
                <select className="input-field" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option value="">Selecione</option>
                  {Object.entries(LABELS.reproductiveType).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Data *</label>
                <input
                  type="date"
                  className="input-field"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
              {(form.type === 'INSEMINATION' || form.type === 'NATURAL_MATING') && (
                <div>
                  <label className="label">{form.type === 'NATURAL_MATING' ? 'Touro' : 'Touro / Sêmen'}</label>
                  <input
                    placeholder={form.type === 'NATURAL_MATING' ? 'Ex: Nelore Campeão' : 'Ex: Titan FIV'}
                    className="input-field"
                    value={form.bullName}
                    onChange={(e) => setForm({ ...form, bullName: e.target.value })}
                  />
                </div>
              )}
              {form.type === 'PREGNANCY_CHECK_POSITIVE' && (
                <div>
                  <label className="label">Data prevista do parto <span className="text-muted-4 font-normal">(opcional)</span></label>
                  <input
                    type="date"
                    className="input-field"
                    value={form.expectedCalving}
                    onChange={(e) => setForm({ ...form, expectedCalving: e.target.value })}
                  />
                  <p className="text-xs text-muted-4 mt-1">Se não informar, será calculado automaticamente (~250 dias a partir do diagnóstico).</p>
                </div>
              )}
              {(form.type === 'PREGNANCY_CHECK_POSITIVE' || form.type === 'PREGNANCY_CHECK_NEGATIVE' || form.type === 'CALVING') && (
                <div>
                  <label className="label">Resultado</label>
                  <input
                    placeholder="Descreva o resultado"
                    className="input-field"
                    value={form.result}
                    onChange={(e) => setForm({ ...form, result: e.target.value })}
                  />
                </div>
              )}
              <div>
                <label className="label">Observações</label>
                <textarea
                  rows={2}
                  className="input-field resize-none"
                  placeholder="Detalhes adicionais..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
              {error && <p className="text-red-600 text-sm">{error}</p>}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => { setShowModal(false); setError(''); setForm(EMPTY_FORM) }} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
                {saving ? 'Salvando...' : '✓ Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
