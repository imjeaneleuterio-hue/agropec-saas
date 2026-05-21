'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatDate, formatCurrency, LABELS, getStatusColor, FINANCIAL_CATEGORIES_INCOME, FINANCIAL_CATEGORIES_EXPENSE, cn } from '@/lib/utils'
import { handleTrialResponse } from '@/lib/trialEvent'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import type { FinancialRecord } from '@/types'

const PIE_COLORS = ['#16a34a', '#22c55e', '#86efac', '#bbf7d0', '#dcfce7', '#4ade80', '#15803d']

const EMPTY_FORM = {
  category: '', description: '', amount: '', date: new Date().toISOString().split('T')[0], paymentStatus: 'PAID', notes: '',
}

export default function FinanceiroPage() {
  const [records, setRecords] = useState<FinancialRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<'INCOME' | 'EXPENSE'>('INCOME')
  const [filterType, setFilterType] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL')
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/financeiro?limit=100')
      const data = await res.json()
      if (Array.isArray(data.data)) setRecords(data.data)
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openModal(type: 'INCOME' | 'EXPENSE') {
    setModalType(type)
    setForm({ ...EMPTY_FORM })
    setSaveError('')
    setSaveSuccess(false)
    setShowModal(true)
  }

  async function handleSave() {
    setSaveError('')
    if (!form.category) { setSaveError('Selecione a categoria.'); return }
    if (!form.description.trim()) { setSaveError('Informe a descrição.'); return }
    if (!form.amount || Number(form.amount) <= 0) { setSaveError('Informe um valor válido.'); return }
    if (!form.date) { setSaveError('Informe a data.'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/financeiro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: modalType,
          category: form.category,
          description: form.description,
          amount: Number(form.amount),
          date: form.date,
          paymentStatus: form.paymentStatus,
          notes: form.notes || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { if (handleTrialResponse(data)) return; setSaveError(data.error ?? 'Erro ao salvar.'); return }
      setSaveSuccess(true)
      setTimeout(() => { setShowModal(false); setForm(EMPTY_FORM); setSaveSuccess(false); load() }, 1200)
    } catch {
      setSaveError('Erro de conexão. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const filtered = records.filter((r) => {
    const matchType = filterType === 'ALL' || r.type === filterType
    const matchStatus = filterStatus === 'ALL' || r.paymentStatus === filterStatus
    return matchType && matchStatus
  })

  const now = new Date()
  const monthRecords = records.filter((r) => {
    const d = new Date(r.date)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const monthIncome = monthRecords.filter((r) => r.type === 'INCOME').reduce((s, r) => s + r.amount, 0)
  const monthExpense = monthRecords.filter((r) => r.type === 'EXPENSE').reduce((s, r) => s + r.amount, 0)
  const balance = monthIncome - monthExpense
  const pending = records.filter((r) => r.paymentStatus === 'PENDING').reduce((s, r) => s + r.amount, 0)

  // Expense pie by category
  const expenseByCat: Record<string, number> = {}
  records.filter((r) => r.type === 'EXPENSE').forEach((r) => {
    expenseByCat[r.category] = (expenseByCat[r.category] || 0) + r.amount
  })
  const pieData = Object.entries(expenseByCat)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value], i) => ({ name, value, color: PIE_COLORS[i] }))

  // Monthly bar chart (last 3 months)
  const monthlyData: { mes: string; receita: number; despesa: number }[] = []
  for (let i = 2; i >= 0; i--) {
    const d = new Date(now)
    d.setMonth(d.getMonth() - i)
    const label = d.toLocaleDateString('pt-BR', { month: 'short' })
    const m = d.getMonth()
    const y = d.getFullYear()
    const mr = records.filter((r) => { const rd = new Date(r.date); return rd.getMonth() === m && rd.getFullYear() === y })
    monthlyData.push({
      mes: label,
      receita: mr.filter((r) => r.type === 'INCOME').reduce((s, r) => s + r.amount, 0),
      despesa: mr.filter((r) => r.type === 'EXPENSE').reduce((s, r) => s + r.amount, 0),
    })
  }
  const hasChartData = monthlyData.some((d) => d.receita > 0 || d.despesa > 0)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="page-title">Financeiro Rural</h1>
          <p className="text-gray-500 text-sm">Receitas, despesas e fluxo de caixa</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => openModal('EXPENSE')} className="btn-secondary">− Despesa</button>
          <button onClick={() => openModal('INCOME')} className="btn-primary">+ Receita</button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card bg-green-50 border border-green-100">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-xl">📈</div>
          <div>
            <p className="text-2xl font-bold text-green-700">{formatCurrency(monthIncome)}</p>
            <p className="text-xs text-green-600">Receitas do Mês</p>
          </div>
        </div>
        <div className="stat-card bg-red-50 border border-red-100">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-xl">📉</div>
          <div>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(monthExpense)}</p>
            <p className="text-xs text-red-500">Despesas do Mês</p>
          </div>
        </div>
        <div className={cn('stat-card border', balance >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-red-50 border-red-100')}>
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-xl', balance >= 0 ? 'bg-blue-100' : 'bg-red-100')}>💰</div>
          <div>
            <p className={cn('text-2xl font-bold', balance >= 0 ? 'text-blue-700' : 'text-red-700')}>{formatCurrency(balance)}</p>
            <p className="text-xs text-gray-500">Saldo do Mês</p>
          </div>
        </div>
        <div className="stat-card bg-yellow-50 border border-yellow-100">
          <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center text-xl">⏳</div>
          <div>
            <p className="text-2xl font-bold text-yellow-700">{formatCurrency(pending)}</p>
            <p className="text-xs text-yellow-600">A Pagar/Receber</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card p-5 lg:col-span-2">
          <h2 className="section-title mb-4">Receitas vs Despesas — Últimos 3 meses</h2>
          {!hasChartData ? (
            <div className="h-[220px] flex flex-col items-center justify-center text-gray-400">
              <p className="text-3xl mb-2">📊</p>
              <p className="text-sm">Nenhum lançamento registrado ainda.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="mes" tick={{ fontSize: 12 }}/>
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`}/>
                <Tooltip formatter={(v: number, n: string) => [formatCurrency(v), n === 'receita' ? 'Receita' : 'Despesa']} contentStyle={{ borderRadius: 8 }}/>
                <Bar dataKey="receita" fill="#16a34a" radius={[4,4,0,0]} name="receita"/>
                <Bar dataKey="despesa" fill="#fca5a5" radius={[4,4,0,0]} name="despesa"/>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card p-5">
          <h2 className="section-title mb-4">Despesas por Categoria</h2>
          {pieData.length === 0 ? (
            <div className="h-[160px] flex flex-col items-center justify-center text-gray-400">
              <p className="text-2xl mb-2">📉</p>
              <p className="text-sm text-center">Nenhuma despesa registrada.</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={65} dataKey="value">
                    {pieData.map((e, i) => <Cell key={i} fill={e.color}/>)}
                  </Pie>
                  <Tooltip formatter={(v: number) => [formatCurrency(v), '']}/>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {pieData.map((c) => (
                  <div key={c.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: c.color }}/>
                      <span className="text-gray-600 truncate max-w-[120px]">{c.name}</span>
                    </div>
                    <span className="font-medium text-gray-800">{formatCurrency(c.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Transactions */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-wrap gap-3 items-center justify-between">
          <h2 className="section-title">Lançamentos</h2>
          <div className="flex gap-2">
            <select className="input-field w-auto text-sm" value={filterType} onChange={(e) => setFilterType(e.target.value as typeof filterType)}>
              <option value="ALL">Todos</option>
              <option value="INCOME">Receitas</option>
              <option value="EXPENSE">Despesas</option>
            </select>
            <select className="input-field w-auto text-sm" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="ALL">Todos status</option>
              <option value="PAID">Pago</option>
              <option value="PENDING">Pendente</option>
              <option value="OVERDUE">Vencido</option>
            </select>
          </div>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-3xl mb-2">💰</p>
            <p className="text-sm font-medium">Nenhum lançamento encontrado.</p>
            <p className="text-xs mt-1">Clique em "+ Receita" ou "− Despesa" para adicionar.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map((record) => (
              <div key={record.id} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50">
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0',
                  record.type === 'INCOME' ? 'bg-green-100' : 'bg-red-100')}>
                  {record.type === 'INCOME' ? '📈' : '📉'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{record.description}</p>
                  <p className="text-xs text-gray-500">{record.category} · {formatDate(record.date)}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={cn('font-bold', record.type === 'INCOME' ? 'text-green-700' : 'text-red-600')}>
                    {record.type === 'INCOME' ? '+' : '−'}{formatCurrency(record.amount)}
                  </p>
                  <span className={`badge text-xs ${getStatusColor(record.paymentStatus)}`}>
                    {LABELS.paymentStatus[record.paymentStatus]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="section-title mb-1">
              {modalType === 'INCOME' ? '📈 Nova Receita' : '📉 Nova Despesa'}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {modalType === 'INCOME' ? 'Registre uma entrada financeira' : 'Registre uma saída financeira'}
            </p>
            {saveSuccess ? (
              <div className="text-center py-8">
                <div className="text-5xl mb-3">✅</div>
                <p className="font-semibold text-green-700">Lançamento registrado com sucesso!</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="label">Categoria *</label>
                  <select className="input-field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    <option value="">Selecione</option>
                    {(modalType === 'INCOME' ? FINANCIAL_CATEGORIES_INCOME : FINANCIAL_CATEGORIES_EXPENSE)
                      .map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Descrição *</label>
                  <input placeholder="Descreva o lançamento..." className="input-field"
                    value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}/>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Valor (R$) *</label>
                    <input type="number" step="0.01" min="0" placeholder="0,00" className="input-field"
                      value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}/>
                  </div>
                  <div>
                    <label className="label">Data *</label>
                    <input type="date" className="input-field" value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}/>
                  </div>
                </div>
                <div>
                  <label className="label">Status</label>
                  <select className="input-field" value={form.paymentStatus} onChange={(e) => setForm({ ...form, paymentStatus: e.target.value })}>
                    <option value="PAID">Pago</option>
                    <option value="PENDING">Pendente</option>
                  </select>
                </div>
                {saveError && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{saveError}</p>}
              </div>
            )}
            {!saveSuccess && (
              <div className="flex gap-3 mt-5">
                <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancelar</button>
                <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
                  {saving ? '⏳ Salvando...' : '✓ Salvar'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
