'use client'

import { useState, useEffect } from 'react'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { handleTrialResponse } from '@/lib/trialEvent'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const REPORT_TYPES = [
  { id: 'milk',         icon: '🥛', label: 'Produção Leiteira' },
  { id: 'financial',    icon: '💰', label: 'Financeiro' },
  { id: 'health',       icon: '💉', label: 'Sanitário' },
  { id: 'reproductive', icon: '🗓️', label: 'Reprodutivo' },
  { id: 'herd',         icon: '🐄', label: 'Rebanho' },
  { id: 'weight',       icon: '⚖️', label: 'Pesagens' },
]

const PERIOD_MONTHS: Record<string, number> = { '1m': 1, '3m': 3, '6m': 6, '1y': 12 }

type MilkRow = { month: string; total: number; dias: number }
type FinRow  = { month: string; receita: number; despesa: number; lucro: number }

export default function RelatoriosPage() {
  const [activeReport, setActiveReport] = useState('milk')
  const [period, setPeriod] = useState('6m')
  const [milkData, setMilkData] = useState<MilkRow[]>([])
  const [financialData, setFinancialData] = useState<FinRow[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const months = PERIOD_MONTHS[period]
    setLoading(true)
    Promise.all([
      fetch(`/api/relatorios?type=milk&months=${months}`).then((r) => r.json()),
      fetch(`/api/relatorios?type=financial&months=${months}`).then((r) => r.json()),
    ])
      .then(([milk, fin]) => {
        if (handleTrialResponse(milk) || handleTrialResponse(fin)) return
        setMilkData(Array.isArray(milk.data) ? milk.data : [])
        setFinancialData(Array.isArray(fin.data) ? fin.data : [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [period])

  const lastMilk = milkData[milkData.length - 1]
  const lastFin  = financialData[financialData.length - 1]

  const kpis = [
    {
      label: 'Produção Total (mês)',
      value: lastMilk?.total ? `${formatNumber(lastMilk.total, 0)} L` : '—',
    },
    {
      label: 'Receita Total (mês)',
      value: lastFin?.receita ? formatCurrency(lastFin.receita) : '—',
    },
    {
      label: 'Despesa Total (mês)',
      value: lastFin?.despesa ? formatCurrency(lastFin.despesa) : '—',
    },
    {
      label: 'Lucro Líquido (mês)',
      value: lastFin ? formatCurrency(lastFin.lucro) : '—',
      green: lastFin ? lastFin.lucro >= 0 : null,
    },
    {
      label: 'Custo por Litro',
      value:
        lastMilk?.total && lastFin?.despesa
          ? `R$ ${formatNumber(lastFin.despesa / lastMilk.total, 2)}`
          : '—',
    },
    {
      label: 'Margem (%)',
      value:
        lastFin?.receita
          ? `${formatNumber((lastFin.lucro / lastFin.receita) * 100, 1)}%`
          : '—',
    },
  ]

  const noMilk = milkData.every((d) => d.total === 0)
  const noFin  = financialData.every((d) => d.receita === 0 && d.despesa === 0)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="page-title">Relatórios</h1>
          <p className="text-gray-500 text-sm">Análises e indicadores da fazenda</p>
        </div>
        <select
          className="input-field w-auto text-sm"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        >
          <option value="1m">Último mês</option>
          <option value="3m">Últimos 3 meses</option>
          <option value="6m">Últimos 6 meses</option>
          <option value="1y">Último ano</option>
        </select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="card p-4">
            <p className="text-xs text-gray-500 mb-1">{kpi.label}</p>
            <p
              className={`text-xl font-bold ${
                kpi.value === '—'
                  ? 'text-gray-300'
                  : kpi.green === false
                  ? 'text-red-600'
                  : 'text-gray-900'
              }`}
            >
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      {/* Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {REPORT_TYPES.map((rt) => (
          <button
            key={rt.id}
            onClick={() => setActiveReport(rt.id)}
            className={`p-3 rounded-xl border-2 text-left transition-all ${
              activeReport === rt.id
                ? 'border-primary-500 bg-primary-50'
                : 'bg-white border-gray-100 hover:border-gray-200'
            }`}
          >
            <div className="text-xl mb-1">{rt.icon}</div>
            <p
              className={`text-xs font-semibold ${
                activeReport === rt.id ? 'text-primary-700' : 'text-gray-700'
              }`}
            >
              {rt.label}
            </p>
          </button>
        ))}
      </div>

      {loading && (
        <div className="card p-12 text-center text-gray-400 text-sm">Carregando dados...</div>
      )}

      {!loading && activeReport === 'milk' && (
        noMilk ? (
          <div className="card p-12 text-center">
            <p className="text-4xl mb-3">🥛</p>
            <p className="text-gray-600 font-medium">Nenhuma produção registrada ainda.</p>
            <p className="text-gray-400 text-sm mt-1">Registre a produção diária na página de Leite.</p>
          </div>
        ) : (
          <div className="card p-5">
            <h2 className="section-title mb-4">Produção Total Mensal (L)</h2>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={milkData}>
                <defs>
                  <linearGradient id="milkGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
                />
                <Tooltip formatter={(v: number) => [`${formatNumber(v, 0)} L`, 'Total']} />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#16a34a"
                  fill="url(#milkGrad)"
                  strokeWidth={2}
                  name="Total (L)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )
      )}

      {!loading && activeReport === 'financial' && (
        noFin ? (
          <div className="card p-12 text-center">
            <p className="text-4xl mb-3">💰</p>
            <p className="text-gray-600 font-medium">Nenhum registro financeiro encontrado.</p>
            <p className="text-gray-400 text-sm mt-1">Adicione receitas e despesas na página Financeiro.</p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="card p-5">
              <h2 className="section-title mb-4">Receita vs Despesa (R$)</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={financialData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(v: number, n: string) => [
                      formatCurrency(v),
                      n === 'receita' ? 'Receita' : n === 'despesa' ? 'Despesa' : 'Lucro',
                    ]}
                  />
                  <Legend />
                  <Bar dataKey="receita" fill="#16a34a" radius={[3, 3, 0, 0]} name="receita" />
                  <Bar dataKey="despesa" fill="#fca5a5" radius={[3, 3, 0, 0]} name="despesa" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="card p-5">
              <h2 className="section-title mb-4">Lucro Líquido Mensal (R$)</h2>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={financialData}>
                  <defs>
                    <linearGradient id="lucroGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip formatter={(v: number) => [formatCurrency(v), 'Lucro']} />
                  <Area
                    type="monotone"
                    dataKey="lucro"
                    stroke="#2563eb"
                    fill="url(#lucroGrad)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )
      )}

      {!loading && !['milk', 'financial'].includes(activeReport) && (
        <div className="card p-12 text-center">
          <p className="text-4xl mb-3">
            {REPORT_TYPES.find((r) => r.id === activeReport)?.icon}
          </p>
          <p className="text-gray-600 font-medium">Relatório em desenvolvimento</p>
          <p className="text-gray-400 text-sm mt-1">Este relatório será disponibilizado em breve.</p>
        </div>
      )}
    </div>
  )
}
