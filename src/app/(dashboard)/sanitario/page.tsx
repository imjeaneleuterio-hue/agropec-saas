'use client'

import { useState, useEffect } from 'react'
import { formatDateOnly, LABELS, formatCurrency, daysFromToday, monthKeyOf, currentMonthKey } from '@/lib/utils'
import { handleTrialResponse } from '@/lib/trialEvent'
import { TrialBanner } from '@/components/TrialBanner'
import type { HealthRecord, Animal } from '@/types'

const TYPE_ICONS: Record<string, string> = {
  VACCINATION: '💉', TREATMENT: '💊', EXAM: '🔬',
  SURGERY: '🏥', PARASITE_CONTROL: '🦟', HOOF_TRIM: '🦶', OTHER: '📋',
}

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: 'border-red-300 bg-red-50',
  HIGH: 'border-orange-300 bg-orange-50',
  MEDIUM: 'border-yellow-300 bg-yellow-50',
  LOW: 'border-sand bg-paper',
}

const EMPTY_FORM = {
  animalId: '',
  type: '',
  date: new Date().toLocaleDateString('en-CA'),
  description: '',
  veterinarian: '',
  cost: '',
  medications: '',
  nextDueDate: '',
  notes: '',
}

export default function SanitarioPage() {
  const [records, setRecords] = useState<HealthRecord[]>([])
  const [animals, setAnimals] = useState<Animal[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [filterType, setFilterType] = useState('ALL')
  const [form, setForm] = useState(EMPTY_FORM)

  async function loadAnimals() {
    try {
      const res = await fetch('/api/animais?limit=200&status=ACTIVE')
      const data = await res.json()
      if (Array.isArray(data.data)) setAnimals(data.data)
    } catch {}
  }

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/sanitario')
      const data = await res.json()
      if (Array.isArray(data.data)) setRecords(data.data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    load()
    loadAnimals()
  }, [])

  async function handleSave() {
    if (!form.animalId || !form.type || !form.date || !form.description) {
      setError('Animal, tipo, data e descrição são obrigatórios')
      return
    }
    setSaving(true)
    setError('')
    const res = await fetch('/api/sanitario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        animalId: form.animalId,
        type: form.type,
        date: form.date,
        description: form.description,
        veterinarian: form.veterinarian || undefined,
        cost: form.cost ? Number(form.cost) : undefined,
        medications: form.medications || undefined,
        nextDueDate: form.nextDueDate || undefined,
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
    }
    setSaving(false)
  }

  const filtered = filterType === 'ALL' ? records : records.filter((r) => r.type === filterType)

  const now = new Date()
  const monthRecords = records.filter((r) => monthKeyOf(r.date) === currentMonthKey())

  const vaccinations = monthRecords.filter((r) => r.type === 'VACCINATION').length
  const treatments = monthRecords.filter((r) => r.type === 'TREATMENT').length
  const exams = monthRecords.filter((r) => r.type === 'EXAM').length
  const totalCost = monthRecords.reduce((s, r) => s + (r.cost ?? 0), 0)

  // Upcoming: records with nextDueDate in the next 60 days
  const upcoming = records
    .filter((r) => r.nextDueDate && new Date(r.nextDueDate) > now)
    .sort((a, b) => new Date(a.nextDueDate!).getTime() - new Date(b.nextDueDate!).getTime())
    .slice(0, 5)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="page-title">Controle Sanitário</h1>
          <p className="text-muted-3 text-sm">Saúde, vacinações e tratamentos do rebanho</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">+ Novo Registro</button>
      </div>
      <TrialBanner module="sanitario" />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: '💉', label: 'Vacinações (mês)', value: vaccinations, color: 'bg-blue-50 text-blue-700' },
          { icon: '💊', label: 'Tratamentos (mês)', value: treatments, color: 'bg-orange-50 text-orange-700' },
          { icon: '🔬', label: 'Exames (mês)', value: exams, color: 'bg-purple-50 text-purple-700' },
          { icon: '💰', label: 'Custo Sanitário (mês)', value: formatCurrency(totalCost), color: 'bg-red-50 text-red-700', isText: true },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${s.color}`}>{s.icon}</div>
            <div>
              <p className={`font-bold text-ink ${s.isText ? 'text-lg' : 'text-2xl'}`}>{s.value}</p>
              <p className="text-xs text-muted-3">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="card p-5">
          <h2 className="section-title mb-4">Próximos Procedimentos</h2>
          <div className="space-y-3">
            {upcoming.map((item) => {
              const daysLeft = daysFromToday(item.nextDueDate!)
              const priority = daysLeft <= 7 ? 'CRITICAL' : daysLeft <= 14 ? 'HIGH' : 'MEDIUM'
              return (
                <div key={item.id} className={`flex items-center gap-4 p-3 rounded-xl border ${PRIORITY_COLORS[priority]}`}>
                  <span className="text-xl">{TYPE_ICONS[item.type]}</span>
                  <div className="flex-1">
                    <p className="font-medium text-ink">{item.description}</p>
                    {item.animal && (
                      <p className="text-sm text-muted-3">{item.animal.name ?? 'Animal'} #{item.animal.tag}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-ink">{formatDateOnly(item.nextDueDate!)}</p>
                    <p className="text-xs text-muted-3">em {daysLeft} dia{daysLeft !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Records */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-paper flex flex-wrap gap-3 items-center justify-between">
          <h2 className="section-title">Histórico Sanitário</h2>
          <select className="input-field w-auto text-sm" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="ALL">Todos os tipos</option>
            {Object.entries(LABELS.healthType).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        {loading ? (
          <div className="p-8 text-center text-muted-4 text-sm">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-4 text-sm">
            Nenhum registro encontrado. Clique em "+ Novo Registro" para adicionar.
          </div>
        ) : (
          <div className="divide-y divide-paper">
            {filtered.map((record) => (
              <div key={record.id} className="px-4 py-4 hover:bg-paper">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-lg flex-shrink-0">
                    {TYPE_ICONS[record.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="badge bg-blue-100 text-blue-700 text-xs">{LABELS.healthType[record.type]}</span>
                      {record.animal && (
                        <span className="text-sm text-muted-3">
                          {record.animal.name ?? 'Animal'} <span className="text-muted-4">#{record.animal.tag}</span>
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-ink">{record.description}</p>
                    {record.medications && <p className="text-sm text-muted-3 mt-0.5">💊 {record.medications}</p>}
                    {record.veterinarian && <p className="text-sm text-muted-3">👨‍⚕️ {record.veterinarian}</p>}
                    {record.notes && <p className="text-xs text-muted-4 mt-1">{record.notes}</p>}
                    {record.nextDueDate && (
                      <p className="text-xs text-orange-600 font-medium mt-1">
                        🔄 Próxima: {formatDateOnly(record.nextDueDate)}
                      </p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm text-muted-3">{formatDateOnly(record.date)}</p>
                    {record.cost != null && <p className="text-sm font-medium text-muted-1 mt-1">{formatCurrency(record.cost)}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="section-title mb-4">Novo Registro Sanitário</h3>
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
                <label className="label">Tipo *</label>
                <select className="input-field" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option value="">Selecione</option>
                  {Object.entries(LABELS.healthType).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Descrição *</label>
                <input
                  placeholder="Ex: Vacinação Febre Aftosa"
                  className="input-field"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Veterinário</label>
                  <input
                    placeholder="Dr. Nome"
                    className="input-field"
                    value={form.veterinarian}
                    onChange={(e) => setForm({ ...form, veterinarian: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Custo (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    className="input-field"
                    value={form.cost}
                    onChange={(e) => setForm({ ...form, cost: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="label">Medicamentos</label>
                <input
                  placeholder="Ex: Ivermectina 1%"
                  className="input-field"
                  value={form.medications}
                  onChange={(e) => setForm({ ...form, medications: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Próxima Data</label>
                <input
                  type="date"
                  className="input-field"
                  value={form.nextDueDate}
                  onChange={(e) => setForm({ ...form, nextDueDate: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Observações</label>
                <textarea
                  rows={2}
                  className="input-field resize-none"
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
