'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatDate, calcAge, getStatusColor, LABELS, cn } from '@/lib/utils'
import type { Animal } from '@/types'

export default function RebanhoPage() {
  const [animals, setAnimals] = useState<Animal[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<string>('DAIRY')
  const [filterStatus, setFilterStatus] = useState<string>('ALL')
  const [filterSex, setFilterSex] = useState<string>('ALL')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table')

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const res = await fetch('/api/animais?limit=200')
        const data = await res.json()
        if (Array.isArray(data.data)) setAnimals(data.data)
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  const filtered = animals.filter((a) => {
    const matchSearch = !search ||
      a.tag.toLowerCase().includes(search.toLowerCase()) ||
      (a.name?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      a.breed.toLowerCase().includes(search.toLowerCase())
    const matchType = filterType === 'ALL' || a.type === filterType
    const matchStatus = filterStatus === 'ALL' || a.status === filterStatus
    const matchSex = filterSex === 'ALL' || a.sex === filterSex
    return matchSearch && matchType && matchStatus && matchSex
  })

  const counts = {
    total: animals.length,
    active: animals.filter((a) => a.status === 'ACTIVE').length,
    dairy: animals.filter((a) => a.type === 'DAIRY').length,
    beef: animals.filter((a) => a.type === 'BEEF').length,
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="page-title">Gestão de Rebanho</h1>
          <p className="text-gray-500 text-sm mt-0.5">{counts.total} animais cadastrados</p>
        </div>
        <Link href="/rebanho/novo" className="btn-primary">+ Novo Animal</Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: counts.total, icon: '🐄', active: filterType === 'ALL' && filterStatus === 'ALL', onClick: () => { setFilterType('ALL'); setFilterStatus('ALL') } },
          { label: 'Ativos', value: counts.active, icon: '✅', active: filterStatus === 'ACTIVE', onClick: () => setFilterStatus('ACTIVE') },
          { label: 'Leiteiros', value: counts.dairy, icon: '🥛', active: filterType === 'DAIRY', onClick: () => setFilterType('DAIRY') },
          { label: 'Corte', value: counts.beef, icon: '🥩', active: filterType === 'BEEF', onClick: () => setFilterType('BEEF') },
        ].map((c) => (
          <button key={c.label} onClick={c.onClick}
            className={cn('bg-white rounded-xl border-2 px-4 py-3 text-left transition-all',
              c.active ? 'border-primary-500 bg-primary-50' : 'border-gray-100 hover:border-gray-200')}>
            <div className="flex items-center gap-2 mb-1">
              <span>{c.icon}</span>
              <span className="text-xs text-gray-500">{c.label}</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{c.value}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Buscar por nome, brinco ou raça..."
            className="input-field max-w-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="input-field w-auto" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="ALL">Todos os tipos</option>
            <option value="DAIRY">Leiteiro</option>
            <option value="BEEF">Corte</option>
          </select>
          <select className="input-field w-auto" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="ALL">Todos os status</option>
            <option value="ACTIVE">Ativo</option>
            <option value="SOLD">Vendido</option>
            <option value="DEAD">Morto</option>
            <option value="TRANSFERRED">Transferido</option>
          </select>
          <select className="input-field w-auto" value={filterSex} onChange={(e) => setFilterSex(e.target.value)}>
            <option value="ALL">Todos</option>
            <option value="FEMALE">Fêmeas</option>
            <option value="MALE">Machos</option>
          </select>
          <div className="ml-auto flex gap-1">
            <button onClick={() => setViewMode('table')}
              className={cn('p-2 rounded-lg transition-colors', viewMode === 'table' ? 'bg-primary-100 text-primary-700' : 'text-gray-400 hover:bg-gray-100')}>
              ☰
            </button>
            <button onClick={() => setViewMode('grid')}
              className={cn('p-2 rounded-lg transition-colors', viewMode === 'grid' ? 'bg-primary-100 text-primary-700' : 'text-gray-400 hover:bg-gray-100')}>
              ⊞
            </button>
          </div>
        </div>
      </div>

      {/* Animals List */}
      {loading ? (
        <div className="card p-12 text-center text-gray-400 text-sm">Carregando rebanho...</div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-4xl mb-3">🐄</p>
          <p className="text-gray-500">
            {animals.length === 0 ? 'Nenhum animal cadastrado.' : 'Nenhum animal encontrado com esses filtros.'}
          </p>
          <Link href="/rebanho/novo" className="btn-primary mt-4 inline-flex">Cadastrar primeiro animal</Link>
        </div>
      ) : viewMode === 'table' ? (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Animal</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Raça</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Sexo</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden lg:table-cell">Idade</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Tipo</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((animal) => (
                  <tr key={animal.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {animal.photoUrl ? (
                          <img src={animal.photoUrl} alt={animal.name ?? animal.tag}
                            className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-9 h-9 bg-gradient-to-br from-primary-100 to-primary-200 rounded-full flex items-center justify-center text-primary-700 font-bold text-xs flex-shrink-0">
                            {animal.sex === 'FEMALE' ? '🐄' : '🐂'}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{animal.name ?? `Animal #${animal.tag}`}</p>
                          <p className="text-xs text-gray-500">Brinco #{animal.tag}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{animal.breed}</td>
                    <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{LABELS.sex[animal.sex]}</td>
                    <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">
                      {animal.birthDate ? calcAge(animal.birthDate) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${animal.type === 'DAIRY' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                        {LABELS.animalType[animal.type]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${getStatusColor(animal.status)}`}>
                        {LABELS.status[animal.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/rebanho/${animal.id}`} className="btn-ghost text-xs px-3 py-1.5">
                        Ver perfil
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((animal) => (
            <Link key={animal.id} href={`/rebanho/${animal.id}`}
              className="card-hover p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                {animal.photoUrl ? (
                  <img src={animal.photoUrl} alt={animal.name ?? animal.tag}
                    className="w-12 h-12 rounded-xl object-cover" />
                ) : (
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-100 to-primary-200 rounded-xl flex items-center justify-center text-2xl">
                    {animal.sex === 'FEMALE' ? '🐄' : '🐂'}
                  </div>
                )}
                <span className={`badge ${getStatusColor(animal.status)}`}>{LABELS.status[animal.status]}</span>
              </div>
              <div>
                <p className="font-semibold text-gray-900">{animal.name ?? `Animal #${animal.tag}`}</p>
                <p className="text-sm text-gray-500">Brinco #{animal.tag}</p>
              </div>
              <div className="text-xs text-gray-500 space-y-1">
                <p>🧬 {animal.breed}</p>
                {animal.birthDate && <p>📅 {calcAge(animal.birthDate)}</p>}
                <p>{animal.type === 'DAIRY' ? '🥛 Leiteiro' : '🥩 Corte'}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
