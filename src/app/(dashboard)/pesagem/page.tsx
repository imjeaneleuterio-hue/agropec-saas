'use client'

import { useState, useEffect } from 'react'
import { formatDate, formatNumber, cn } from '@/lib/utils'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from 'recharts'
import type { Animal } from '@/types'

interface WeightRecordFull {
  id: string
  animalId: string
  weight: number
  date: string
  notes?: string
  createdAt: string
  animal: { id: string; name?: string; tag: string; breed: string; type: string }
}

export default function PesagemPage() {
  const [records, setRecords] = useState<WeightRecordFull[]>([])
  const [animals, setAnimals] = useState<Animal[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    animalId: '',
    weight: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  })

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
      const res = await fetch('/api/pesagem')
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
    if (!form.animalId || !form.weight || !form.date) {
      setError('Animal, peso e data são obrigatórios')
      return
    }
    setSaving(true)
    setError('')
    const res = await fetch('/api/pesagem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ animalId: form.animalId, weight: Number(form.weight), date: form.date, notes: form.notes }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Erro ao salvar')
    } else {
      setShowModal(false)
      setForm({ animalId: '', weight: '', date: new Date().toISOString().split('T')[0], notes: '' })
      load()
    }
    setSaving(false)
  }

  const now = new Date()
  const monthRecords = records.filter((r) => {
    const d = new Date(r.date)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })

  const avgWeight = records.length > 0
    ? records.reduce((s, r) => s + r.weight, 0) / records.length
    : 0

  const heaviest = records.length > 0
    ? records.reduce((max, r) => r.weight > max.weight ? r : max, records[0])
    : null

  const uniqueAnimalsMonth = new Set(monthRecords.map((r) => r.animalId)).size

  // Chart: last 10 records grouped by date (avg weight)
  const byDate = records.slice(0, 30).reduce<Record<string, number[]>>((acc, r) => {
    const key = formatDate(r.date, 'dd/MM')
    acc[key] = acc[key] ?? []
    acc[key].push(r.weight)
    return acc
  }, {})
  const chartData = Object.entries(byDate)
    .slice(0, 10)
    .reverse()
    .map(([date, weights]) => ({
      date,
      media: Math.round(weights.reduce((s, w) => s + w, 0) / weights.length),
    }))

  // Top heaviest (latest record per animal)
  const latestByAnimal = Object.values(
    records.reduce<Record<string, WeightRecordFull>>((acc, r) => {
      if (!acc[r.animalId] || new Date(r.date) > new Date(acc[r.animalId].date)) {
        acc[r.animalId] = r
      }
      return acc
    }, {})
  ).sort((a, b) => b.weight - a.weight).slice(0, 5)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="page-title">Controle de Pesagem</h1>
          <p className="text-muted-3 text-sm">Monitoramento do peso e ganho de peso do rebanho</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">+ Nova Pesagem</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: '⚖️', label: 'Pesagens (mês)', value: monthRecords.length.toString(), color: 'bg-blue-50 text-blue-700' },
          { icon: '🐄', label: 'Animais pesados (mês)', value: uniqueAnimalsMonth.toString(), color: 'bg-green-50 text-green-700' },
          { icon: '📊', label: 'Peso médio', value: avgWeight > 0 ? `${formatNumber(avgWeight, 0)} kg` : '—', color: 'bg-purple-50 text-purple-700' },
          { icon: '🏆', label: 'Mais pesado', value: heaviest ? `${formatNumber(heaviest.weight, 0)} kg` : '—', color: 'bg-yellow-50 text-yellow-700' },
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

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="card p-5 lg:col-span-2">
          <h2 className="section-title mb-4">Evolução do Peso Médio</h2>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#efe9db" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} unit=" kg" />
                <Tooltip formatter={(v: number) => [`${formatNumber(v, 0)} kg`, 'Média']} />
                <Line type="monotone" dataKey="media" stroke="#16a34a" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-muted-4 text-sm">
              Nenhuma pesagem registrada ainda
            </div>
          )}
        </div>

        {/* Top heaviest */}
        <div className="card p-5">
          <h2 className="section-title mb-4">Animais Mais Pesados</h2>
          {latestByAnimal.length > 0 ? (
            <div className="space-y-3">
              {latestByAnimal.map((r, i) => (
                <div key={r.id} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-muted-4 w-5">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-ink truncate">
                      {r.animal.name ?? 'Sem nome'} <span className="text-muted-4">#{r.animal.tag}</span>
                    </p>
                    <p className="text-xs text-muted-3">{r.animal.breed}</p>
                  </div>
                  <span className="text-sm font-bold text-primary-700">{formatNumber(r.weight, 0)} kg</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-4 text-sm text-center py-8">Sem dados</p>
          )}
        </div>
      </div>

      {/* Records table */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-paper">
          <h2 className="section-title">Histórico de Pesagens</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-muted-4 text-sm">Carregando...</div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center text-muted-4 text-sm">
            Nenhuma pesagem registrada. Clique em "+ Nova Pesagem" para começar.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-paper">
                  <th className="text-left px-4 py-2.5 text-muted-2 font-medium">Animal</th>
                  <th className="text-right px-4 py-2.5 text-muted-2 font-medium">Peso (kg)</th>
                  <th className="text-right px-4 py-2.5 text-muted-2 font-medium hidden sm:table-cell">Data</th>
                  <th className="text-left px-4 py-2.5 text-muted-2 font-medium hidden md:table-cell">Observações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-paper">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-paper">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-sm">⚖️</div>
                        <div>
                          <p className="font-medium text-ink">{r.animal.name ?? 'Sem nome'}</p>
                          <p className="text-xs text-muted-3">{r.animal.breed} • #{r.animal.tag}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-primary-700">{formatNumber(r.weight, 0)} kg</td>
                    <td className="px-4 py-3 text-right text-muted-3 hidden sm:table-cell">{formatDate(r.date)}</td>
                    <td className="px-4 py-3 text-muted-3 hidden md:table-cell">{r.notes ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="section-title mb-4">Registrar Pesagem</h3>
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Peso (kg) *</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    placeholder="Ex: 450"
                    className="input-field"
                    value={form.weight}
                    onChange={(e) => setForm({ ...form, weight: e.target.value })}
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
              </div>
              <div>
                <label className="label">Observações</label>
                <textarea
                  rows={2}
                  className="input-field resize-none"
                  placeholder="Ex: Animal em bom estado corporal"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
              {error && <p className="text-red-600 text-sm">{error}</p>}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => { setShowModal(false); setError('') }} className="btn-secondary flex-1">Cancelar</button>
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
