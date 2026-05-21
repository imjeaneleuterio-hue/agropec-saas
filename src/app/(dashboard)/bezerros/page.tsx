'use client'

import { useState, useEffect } from 'react'
import { calcAge, getStatusColor, LABELS, cn, BREEDS_DAIRY } from '@/lib/utils'
import { differenceInDays, parseISO } from 'date-fns'
import type { Animal } from '@/types'

const WEANING_AGE_DAYS = 60

export default function BezerrosPage() {
  const [calves, setCalves] = useState<Animal[]>([])
  const [cows, setCows] = useState<Animal[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterSex, setFilterSex] = useState('ALL')
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [form, setForm] = useState({
    tag: '', name: '', breed: '', sex: 'FEMALE',
    birthDate: '', motherId: '', status: 'ACTIVE', observations: '',
  })

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const [calvesRes, cowsRes] = await Promise.all([
        fetch('/api/animais?type=CALF&limit=200'),
        fetch('/api/animais?type=DAIRY&limit=200'),
      ])
      const calvesData = await calvesRes.json()
      const cowsData = await cowsRes.json()
      if (Array.isArray(calvesData.data)) setCalves(calvesData.data)
      if (Array.isArray(cowsData.data)) setCows(cowsData.data)
    } catch {}
    setLoading(false)
  }

  const filtered = calves.filter((a) => {
    const matchSearch = !search ||
      a.tag.toLowerCase().includes(search.toLowerCase()) ||
      (a.name?.toLowerCase().includes(search.toLowerCase()) ?? false)
    const matchSex = filterSex === 'ALL' || a.sex === filterSex
    const matchStatus = filterStatus === 'ALL' || a.status === filterStatus
    return matchSearch && matchSex && matchStatus
  })

  const counts = {
    total: calves.length,
    male: calves.filter((a) => a.sex === 'MALE').length,
    female: calves.filter((a) => a.sex === 'FEMALE').length,
    newborn: calves.filter((a) => {
      if (!a.birthDate) return false
      return differenceInDays(new Date(), parseISO(a.birthDate)) < 30
    }).length,
  }

  function getMother(motherId?: string | null) {
    if (!motherId) return null
    return cows.find((c) => c.id === motherId) ?? null
  }

  function isNearWeaning(a: Animal) {
    if (!a.birthDate) return false
    const days = differenceInDays(new Date(), parseISO(a.birthDate))
    return days >= WEANING_AGE_DAYS && days < WEANING_AGE_DAYS + 15
  }

  function openModal() {
    setForm({ tag: '', name: '', breed: '', sex: 'FEMALE', birthDate: '', motherId: '', status: 'ACTIVE', observations: '' })
    setFormError('')
    setShowModal(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setFormError('')
    try {
      const res = await fetch('/api/animais', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, type: 'CALF' }),
      })
      const data = await res.json()
      if (!res.ok) { setFormError(data.error ?? 'Erro ao salvar'); setSaving(false); return }
      setShowModal(false)
      load()
    } catch {
      setFormError('Erro de conexão')
    }
    setSaving(false)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="page-title">Bezerros</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {counts.total} bezerro{counts.total !== 1 ? 's' : ''} cadastrado{counts.total !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={openModal} className="btn-primary">+ Novo Bezerro</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: counts.total, icon: '🐮', color: 'text-gray-900' },
          { label: 'Machos', value: counts.male, icon: '♂', color: 'text-blue-700' },
          { label: 'Fêmeas', value: counts.female, icon: '♀', color: 'text-pink-600' },
          { label: 'Recém-nascidos', value: counts.newborn, icon: '🍼', color: 'text-yellow-700' },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-100 px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <span>{c.icon}</span>
              <span className="text-xs text-gray-500">{c.label}</span>
            </div>
            <p className={cn('text-xl font-bold', c.color)}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Buscar por nome ou brinco..."
            className="input-field max-w-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="input-field w-auto" value={filterSex} onChange={(e) => setFilterSex(e.target.value)}>
            <option value="ALL">Todos os sexos</option>
            <option value="FEMALE">Fêmeas</option>
            <option value="MALE">Machos</option>
          </select>
          <select className="input-field w-auto" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="ALL">Todos os status</option>
            <option value="ACTIVE">Ativo</option>
            <option value="SOLD">Vendido</option>
            <option value="DEAD">Morto</option>
            <option value="TRANSFERRED">Transferido</option>
          </select>
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="card p-12 text-center text-gray-400 text-sm">Carregando bezerros...</div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-4xl mb-3">🐮</p>
          <p className="text-gray-500">
            {calves.length === 0 ? 'Nenhum bezerro cadastrado.' : 'Nenhum bezerro encontrado com esses filtros.'}
          </p>
          {calves.length === 0 && (
            <button onClick={openModal} className="btn-primary mt-4">Cadastrar primeiro bezerro</button>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Bezerro</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Sexo</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Idade</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Mãe</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((calf) => {
                  const mother = getMother(calf.motherId)
                  const nearWeaning = isNearWeaning(calf)
                  return (
                    <tr key={calf.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-yellow-50 border border-yellow-200 rounded-full flex items-center justify-center text-base flex-shrink-0">
                            🐮
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{calf.name ?? `Bezerro #${calf.tag}`}</p>
                            <p className="text-xs text-gray-500">Brinco #{calf.tag} · {calf.breed}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{LABELS.sex[calf.sex]}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-700">{calf.birthDate ? calcAge(calf.birthDate) : '—'}</span>
                          {nearWeaning && (
                            <span className="badge bg-orange-100 text-orange-700">Desmame</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
                        {mother ? (mother.name ?? `#${mother.tag}`) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge ${getStatusColor(calf.status)}`}>
                          {LABELS.status[calf.status]}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de cadastro */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Cadastrar Bezerro</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto">
              {formError && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{formError}</p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-field">Brinco *</label>
                  <input
                    className="input-field" required
                    value={form.tag} placeholder="Ex: 201"
                    onChange={(e) => setForm((f) => ({ ...f, tag: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label-field">Nome</label>
                  <input
                    className="input-field"
                    value={form.name} placeholder="Opcional"
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-field">Sexo *</label>
                  <select className="input-field" required value={form.sex} onChange={(e) => setForm((f) => ({ ...f, sex: e.target.value }))}>
                    <option value="FEMALE">Fêmea</option>
                    <option value="MALE">Macho</option>
                  </select>
                </div>
                <div>
                  <label className="label-field">Data de nascimento</label>
                  <input
                    type="date" className="input-field"
                    value={form.birthDate}
                    onChange={(e) => setForm((f) => ({ ...f, birthDate: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="label-field">Raça *</label>
                <select className="input-field" required value={form.breed} onChange={(e) => setForm((f) => ({ ...f, breed: e.target.value }))}>
                  <option value="">Selecionar raça</option>
                  {BREEDS_DAIRY.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="label-field">Mãe</label>
                <select className="input-field" value={form.motherId} onChange={(e) => setForm((f) => ({ ...f, motherId: e.target.value }))}>
                  <option value="">Não informado</option>
                  {cows.filter((c) => c.status === 'ACTIVE').map((c) => (
                    <option key={c.id} value={c.id}>{c.name ?? `Animal #${c.tag}`} (#{c.tag})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label-field">Observações</label>
                <textarea
                  className="input-field resize-none" rows={2}
                  value={form.observations}
                  onChange={(e) => setForm((f) => ({ ...f, observations: e.target.value }))}
                />
              </div>
              <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)} className="btn-ghost">Cancelar</button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? 'Salvando...' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
