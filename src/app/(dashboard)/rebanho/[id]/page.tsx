'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatDate, calcAge, getStatusColor, LABELS, formatCurrency, formatNumber } from '@/lib/utils'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { Animal, WeightRecord, MilkProduction, HealthRecord, ReproductiveEvent } from '@/types'

const TABS = ['Visão Geral', 'Produção de Leite', 'Pesagens', 'Saúde', 'Reprodução', 'Anotações']

type AnimalFull = Animal & {
  weightRecords: WeightRecord[]
  milkProductions: MilkProduction[]
  healthRecords: HealthRecord[]
  reproductiveEvents: ReproductiveEvent[]
}

export default function AnimalProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [activeTab, setActiveTab] = useState(0)
  const [animal, setAnimal] = useState<AnimalFull | null>(null)
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState<{ id: string; content: string; createdAt: string }[]>([])
  const [newNote, setNewNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  const [form, setForm] = useState({
    name: '', tag: '', breed: '', sex: 'FEMALE', type: 'DAIRY',
    status: 'ACTIVE', birthDate: '', purchaseDate: '', purchasePrice: '', observations: '',
    photoUrl: '',
  })

  useEffect(() => {
    fetch(`/api/animais/${id}/notas`)
      .then(r => r.json())
      .then(d => { if (d.data) setNotes(d.data) })
      .catch(() => {})
  }, [id])

  useEffect(() => {
    fetch(`/api/animais/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.data) {
          setAnimal(d.data)
          setForm({
            name: d.data.name ?? '',
            tag: d.data.tag,
            breed: d.data.breed,
            sex: d.data.sex,
            type: d.data.type,
            status: d.data.status,
            birthDate: d.data.birthDate ? d.data.birthDate.slice(0, 10) : '',
            purchaseDate: d.data.purchaseDate ? d.data.purchaseDate.slice(0, 10) : '',
            purchasePrice: d.data.purchasePrice?.toString() ?? '',
            observations: d.data.observations ?? '',
            photoUrl: d.data.photoUrl ?? '',
          })
        }
      })
      .finally(() => setLoading(false))
  }, [id])

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingPhoto(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (res.ok) setForm((prev) => ({ ...prev, photoUrl: data.url }))
      else setError(data.error ?? 'Erro ao enviar foto')
    } catch {
      setError('Erro de conexão ao enviar foto')
    } finally {
      setUploadingPhoto(false)
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/animais/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          purchasePrice: form.purchasePrice ? parseFloat(form.purchasePrice) : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Erro ao salvar'); return }
      setAnimal((prev) => prev ? { ...prev, ...data.data } : prev)
      setEditOpen(false)
    } catch {
      setError('Erro de conexão')
    } finally {
      setSaving(false)
    }
  }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault()
    if (!newNote.trim()) return
    setSavingNote(true)
    try {
      const res = await fetch(`/api/animais/${id}/notas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNote }),
      })
      const data = await res.json()
      if (res.ok) { setNotes(prev => [data.data, ...prev]); setNewNote('') }
    } finally {
      setSavingNote(false)
    }
  }

  async function handleDeleteNote(noteId: string) {
    await fetch(`/api/animais/${id}/notas`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ noteId }),
    })
    setNotes(prev => prev.filter(n => n.id !== noteId))
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/animais/${id}`, { method: 'DELETE' })
      if (res.ok) {
        router.push('/rebanho')
      } else {
        const data = await res.json()
        setError(data.error || 'Erro ao excluir animal')
        setDeleteConfirm(false)
      }
    } catch {
      setError('Erro de conexão')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <div className="card p-12 text-center text-gray-400 text-sm">Carregando...</div>
  if (!animal) return (
    <div className="card p-12 text-center">
      <p className="text-gray-500 mb-4">Animal não encontrado.</p>
      <Link href="/rebanho" className="btn-secondary">Voltar</Link>
    </div>
  )

  const lastWeight = animal.weightRecords[0]

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center gap-3">
        <Link href="/rebanho" className="btn-ghost p-2">←</Link>
        <h1 className="page-title">{animal.name ?? `Animal #${animal.tag}`}</h1>
        <span className={`badge ${getStatusColor(animal.status)}`}>{LABELS.status[animal.status]}</span>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      {/* Profile Card */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row gap-6">
          {animal.photoUrl ? (
            <img src={animal.photoUrl} alt={animal.name ?? animal.tag}
              className="w-24 h-24 rounded-2xl object-cover flex-shrink-0" />
          ) : (
            <div className="w-24 h-24 bg-gradient-to-br from-primary-100 to-primary-200 rounded-2xl flex items-center justify-center text-4xl flex-shrink-0">
              {animal.sex === 'FEMALE' ? '🐄' : '🐂'}
            </div>
          )}
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-3">
            <InfoItem label="Brinco/Tag" value={`#${animal.tag}`} />
            <InfoItem label="Raça" value={animal.breed} />
            <InfoItem label="Sexo" value={LABELS.sex[animal.sex]} />
            <InfoItem label="Tipo" value={LABELS.animalType[animal.type]} />
            {animal.birthDate && <InfoItem label="Idade" value={calcAge(animal.birthDate)} />}
            {animal.birthDate && <InfoItem label="Nascimento" value={formatDate(animal.birthDate)} />}
            {lastWeight && <InfoItem label="Peso Atual" value={`${lastWeight.weight} kg`} />}
            {animal.purchasePrice && <InfoItem label="Valor Compra" value={formatCurrency(animal.purchasePrice)} />}
          </div>
          <div className="flex flex-col gap-2">
            <button onClick={() => setEditOpen(true)} className="btn-secondary text-sm">✏️ Editar</button>
            <button onClick={() => setDeleteConfirm(true)} className="btn text-sm border border-red-200 text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg">
              🗑️ Excluir
            </button>
          </div>
        </div>
        {animal.observations && (
          <p className="mt-4 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
            📝 {animal.observations}
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-0 overflow-x-auto">
          {TABS.map((tab, i) => (
            <button key={tab} onClick={() => setActiveTab(i)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === i ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 0 && (
        <div className="grid sm:grid-cols-2 gap-5">
          {animal.weightRecords.length > 0 && (
            <div className="card p-5">
              <h3 className="section-title mb-4">Últimas Pesagens</h3>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={[...animal.weightRecords].reverse().slice(-10).map((w) => ({ ...w, date: formatDate(w.date, 'dd/MM') }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
                  <Tooltip formatter={(v: number) => [`${v} kg`, 'Peso']} />
                  <Line type="monotone" dataKey="weight" stroke="#16a34a" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          {animal.milkProductions.length > 0 && (
            <div className="card p-5">
              <h3 className="section-title mb-4">Produção Recente (L/dia)</h3>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={[...animal.milkProductions].reverse().slice(-10).map((m) => ({ ...m, date: formatDate(m.date, 'dd/MM') }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
                  <Tooltip formatter={(v: number) => [`${formatNumber(v)} L`, 'Produção']} />
                  <Line type="monotone" dataKey="totalLiters" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          {animal.weightRecords.length === 0 && animal.milkProductions.length === 0 && (
            <div className="card p-8 text-center text-gray-400 text-sm sm:col-span-2">Nenhum registro encontrado.</div>
          )}
        </div>
      )}

      {activeTab === 1 && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="section-title">Histórico de Produção Leiteira</h3>
          </div>
          {animal.milkProductions.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">Nenhum registro de leite.</div>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50">
                <th className="text-left px-4 py-2.5 text-gray-600 font-medium">Data</th>
                <th className="text-right px-4 py-2.5 text-gray-600 font-medium">Manhã (L)</th>
                <th className="text-right px-4 py-2.5 text-gray-600 font-medium">Tarde (L)</th>
                <th className="text-right px-4 py-2.5 text-gray-600 font-medium">Total (L)</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {animal.milkProductions.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{formatDate(m.date)}</td>
                    <td className="px-4 py-3 text-right">{formatNumber(m.morningLiters ?? 0)}</td>
                    <td className="px-4 py-3 text-right">{formatNumber(m.afternoonLiters ?? 0)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-primary-700">{formatNumber(m.totalLiters)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 2 && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="section-title">Histórico de Pesagens</h3>
          </div>
          {animal.weightRecords.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">Nenhuma pesagem registrada.</div>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50">
                <th className="text-left px-4 py-2.5 text-gray-600 font-medium">Data</th>
                <th className="text-right px-4 py-2.5 text-gray-600 font-medium">Peso (kg)</th>
                <th className="text-left px-4 py-2.5 text-gray-600 font-medium hidden md:table-cell">Observações</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {animal.weightRecords.map((w) => (
                  <tr key={w.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{formatDate(w.date)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{w.weight} kg</td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{w.notes ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 3 && (
        <div className="space-y-3">
          {animal.healthRecords.length === 0 ? (
            <div className="card p-8 text-center text-gray-400 text-sm">Nenhum registro sanitário.</div>
          ) : animal.healthRecords.map((h) => (
            <div key={h.id} className="card p-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="badge bg-blue-100 text-blue-700 mb-2">{LABELS.healthType[h.type]}</span>
                  <p className="font-medium text-gray-900">{h.description}</p>
                  {h.veterinarian && <p className="text-sm text-gray-500">Dr(a). {h.veterinarian}</p>}
                  {h.medications && <p className="text-sm text-gray-500">Medicamentos: {h.medications}</p>}
                </div>
                <div className="text-right text-sm">
                  <p className="font-medium text-gray-700">{formatDate(h.date)}</p>
                  {h.cost && <p className="text-gray-500">{formatCurrency(h.cost)}</p>}
                  {h.nextDueDate && (
                    <p className="text-orange-600 text-xs mt-1">Próximo: {formatDate(h.nextDueDate)}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 4 && (
        <div className="space-y-3">
          {animal.reproductiveEvents.length === 0 ? (
            <div className="card p-8 text-center text-gray-400 text-sm">Nenhum evento reprodutivo.</div>
          ) : animal.reproductiveEvents.map((r) => (
            <div key={r.id} className="card p-4 flex justify-between items-start">
              <div>
                <span className="badge bg-purple-100 text-purple-700 mb-2">
                  {LABELS.reproductiveType[r.type]}
                </span>
                {r.bullName && <p className="text-sm text-gray-700">Touro/Sêmen: {r.bullName}</p>}
                {r.result && <p className="text-sm text-gray-500">{r.result}</p>}
                {r.expectedCalving && (
                  <p className="text-sm text-green-700 font-medium">
                    Parto previsto: {formatDate(r.expectedCalving)}
                  </p>
                )}
              </div>
              <p className="text-sm text-gray-500">{formatDate(r.date)}</p>
            </div>
          ))}
        </div>
      )}

      {activeTab === 5 && (
        <div className="space-y-4">
          <form onSubmit={handleAddNote} className="card p-4 flex gap-3">
            <textarea
              className="input-field flex-1 resize-none"
              rows={2}
              placeholder="Nova anotação..."
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
            />
            <button type="submit" disabled={savingNote || !newNote.trim()} className="btn-primary px-4 self-end">
              {savingNote ? '...' : 'Salvar'}
            </button>
          </form>

          {notes.length === 0 ? (
            <div className="card p-8 text-center text-gray-400 text-sm">Nenhuma anotação ainda.</div>
          ) : notes.map(note => (
            <div key={note.id} className="card p-4 flex justify-between items-start gap-3">
              <div className="flex-1">
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.content}</p>
                <p className="text-xs text-gray-400 mt-1">{formatDate(note.createdAt)}</p>
              </div>
              <button
                onClick={() => handleDeleteNote(note.id)}
                className="text-gray-300 hover:text-red-500 transition-colors text-lg leading-none flex-shrink-0"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Editar Animal</h2>
              <button onClick={() => setEditOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <form onSubmit={handleEdit} className="p-5 space-y-4">
              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Brinco/Tag *</label>
                  <input className="input-field" required value={form.tag}
                    onChange={(e) => setForm({ ...form, tag: e.target.value })} />
                </div>
                <div>
                  <label className="label">Nome</label>
                  <input className="input-field" placeholder="Opcional" value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label">Raça *</label>
                <input className="input-field" required value={form.breed}
                  onChange={(e) => setForm({ ...form, breed: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Sexo</label>
                  <select className="input-field" value={form.sex} onChange={(e) => setForm({ ...form, sex: e.target.value })}>
                    <option value="FEMALE">Fêmea</option>
                    <option value="MALE">Macho</option>
                  </select>
                </div>
                <div>
                  <label className="label">Tipo</label>
                  <select className="input-field" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    <option value="DAIRY">Leiteira</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Status</label>
                <select className="input-field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="ACTIVE">Ativo</option>
                  <option value="SOLD">Vendido</option>
                  <option value="DEAD">Morto</option>
                  <option value="TRANSFERRED">Transferido</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Nascimento</label>
                  <input type="date" className="input-field" value={form.birthDate}
                    onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
                </div>
                <div>
                  <label className="label">Valor de Compra (R$)</label>
                  <input type="number" step="0.01" className="input-field" placeholder="0,00" value={form.purchasePrice}
                    onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label">Observações</label>
                <textarea className="input-field" rows={3} value={form.observations}
                  onChange={(e) => setForm({ ...form, observations: e.target.value })} />
              </div>
              <div>
                <label className="label">Foto</label>
                {form.photoUrl && (
                  <img src={form.photoUrl} alt="Prévia" className="w-20 h-20 rounded-xl object-cover mb-2" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadingPhoto}
                  onChange={handlePhotoUpload}
                  className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                />
                {uploadingPhoto && <p className="text-xs text-gray-400 mt-1">Enviando foto...</p>}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditOpen(false)} className="btn-secondary flex-1">Cancelar</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Excluir animal?</h2>
            <p className="text-gray-500 text-sm mb-6">
              Tem certeza que deseja excluir <strong>{animal.name ?? `#${animal.tag}`}</strong>? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(false)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 btn bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded-lg">
                {deleting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-gray-900">{value}</p>
    </div>
  )
}
