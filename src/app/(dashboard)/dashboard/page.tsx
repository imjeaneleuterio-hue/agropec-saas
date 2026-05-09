'use client'

import { useEffect, useState } from 'react'
import { formatCurrency, formatNumber, formatDate } from '@/lib/utils'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'
import Link from 'next/link'
import type { DashboardStats, Alert, UpcomingEstrus } from '@/types'

const EMPTY_STATS: DashboardStats = {
  totalAnimals: 0, activeAnimals: 0, dairyAnimals: 0, beefAnimals: 0,
  todayMilkTotal: 0, monthMilkTotal: 0, pendingAlerts: 0, criticalAlerts: 0,
  monthIncome: 0, monthExpense: 0, pregnantAnimals: 0, upcomingVaccinations: 0,
  upcomingEstrus: [],
}

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700 border-red-200',
  HIGH: 'bg-orange-100 text-orange-700 border-orange-200',
  MEDIUM: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  LOW: 'bg-gray-100 text-gray-600 border-gray-200',
}
const PRIORITY_LABELS: Record<string, string> = {
  CRITICAL: 'Crítico', HIGH: 'Alto', MEDIUM: 'Médio', LOW: 'Baixo',
}

type DayMilk = { day: string; liters: number }

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [milkChart, setMilkChart] = useState<DayMilk[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const today = new Date()
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(today.getDate() - 6)

    Promise.all([
      fetch('/api/dashboard').then((r) => r.json()),
      fetch('/api/alertas?unread=true&withinDays=30').then((r) => r.json()),
      fetch(`/api/leite/diario?startDate=${sevenDaysAgo.toISOString().split('T')[0]}&limit=7`).then((r) => r.json()),
    ]).then(([dash, alertsRes, milkRes]) => {
      if (dash.data) setStats({ ...EMPTY_STATS, ...dash.data })
      if (Array.isArray(alertsRes.data)) setAlerts(alertsRes.data.slice(0, 3))

      // Build 7-day milk chart from DailyMilkTotal
      const days: { dateStr: string; label: string }[] = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today)
        d.setDate(today.getDate() - i)
        days.push({
          dateStr: d.toLocaleDateString('en-CA'), // YYYY-MM-DD
          label: d.toLocaleDateString('pt-BR', { weekday: 'short' }),
        })
      }
      const totals: Record<string, number> = {}
      days.forEach(({ dateStr }) => { totals[dateStr] = 0 })
      if (Array.isArray(milkRes.data)) {
        milkRes.data.forEach((r: { date: string; totalLiters: number }) => {
          const dateStr = r.date.split('T')[0]
          if (dateStr in totals) totals[dateStr] = r.totalLiters ?? 0
        })
      }
      setMilkChart(days.map(({ dateStr, label }) => ({ day: label, liters: totals[dateStr] })))
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const balance = stats.monthIncome - stats.monthExpense

  const piData = [
    { name: 'Leiteiras', value: stats.dairyAnimals, color: '#16a34a' },
    { name: 'Corte', value: stats.beefAnimals, color: '#22c55e' },
    { name: 'Outros', value: Math.max(0, stats.activeAnimals - stats.dairyAnimals - stats.beefAnimals), color: '#86efac' },
  ].filter((d) => d.value > 0)

  const hasMilkData = milkChart.some((d) => d.liters > 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="page-title">Bom dia, produtor! 👋</h1>
          <p className="text-gray-500 text-sm mt-0.5">{formatDate(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy")}</p>
        </div>
        <Link href="/rebanho/novo" className="btn-primary">+ Cadastrar Animal</Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="stat-card animate-pulse"><div className="w-10 h-10 bg-gray-200 rounded-xl"/><div className="space-y-2"><div className="h-7 bg-gray-200 rounded w-20"/><div className="h-3 bg-gray-100 rounded w-24"/></div></div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon="🐄" label="Total de Animais" value={stats.totalAnimals.toString()}
              sub={`${stats.activeAnimals} ativos`} color="green" />
            <StatCard icon="🥛" label="Produção Hoje" value={`${formatNumber(stats.todayMilkTotal)} L`}
              sub={`${formatNumber(stats.monthMilkTotal)} L no mês`} color="blue" />
            <StatCard icon="🔔" label="Alertas Pendentes" value={stats.pendingAlerts.toString()}
              sub={`${stats.criticalAlerts} críticos`} color="red" link="/alertas" />
            <StatCard icon="💰" label="Saldo do Mês" value={formatCurrency(balance)}
              sub={`Receita: ${formatCurrency(stats.monthIncome)}`} color={balance >= 0 ? 'green' : 'red'} />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MiniCard label="Leiteiras" value={stats.dairyAnimals} icon="🥛" />
            <MiniCard label="Corte" value={stats.beefAnimals} icon="🥩" />
            <MiniCard label="Prenhas" value={stats.pregnantAnimals} icon="🤰" />
            <MiniCard label="A Pagar Mês" value={formatCurrency(stats.monthExpense)} icon="💸" isText />
          </div>
        </>
      )}

      {stats.upcomingEstrus.length > 0 && (
        <EstrusCard items={stats.upcomingEstrus} />
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card p-5 lg:col-span-2">
          <div className="flex justify-between items-center mb-5">
            <h2 className="section-title">Produção Leiteira — Últimos 7 dias</h2>
            <Link href="/leite" className="text-sm text-primary-600 hover:underline">Ver mais →</Link>
          </div>
          {hasMilkData ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={milkChart}>
                <defs>
                  <linearGradient id="milkGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="day" tick={{ fontSize: 12 }}/>
                <YAxis tick={{ fontSize: 12 }}/>
                <Tooltip formatter={(v: number) => [`${formatNumber(v)} L`, 'Produção']} contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }}/>
                <Area type="monotone" dataKey="liters" stroke="#16a34a" fill="url(#milkGrad)" strokeWidth={2}/>
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex flex-col items-center justify-center text-gray-400">
              <p className="text-3xl mb-2">🥛</p>
              <p className="text-sm">Nenhuma produção registrada nos últimos 7 dias.</p>
              <Link href="/leite" className="text-primary-600 text-sm hover:underline mt-1">Registrar produção →</Link>
            </div>
          )}
        </div>

        <div className="card p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="section-title">Alertas Recentes</h2>
            <Link href="/alertas" className="text-sm text-primary-600 hover:underline">Ver todos →</Link>
          </div>
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p className="text-3xl mb-2">✅</p>
              <p className="text-sm">Nenhum alerta pendente!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div key={alert.id} className={`p-3 rounded-lg border ${PRIORITY_COLORS[alert.priority]}`}>
                  <div className="flex justify-between items-start gap-2">
                    <p className="text-sm font-medium leading-snug">{alert.title}</p>
                    <span className="text-xs font-semibold whitespace-nowrap">{PRIORITY_LABELS[alert.priority]}</span>
                  </div>
                  <p className="text-xs mt-1 opacity-80">{alert.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card p-5 lg:col-span-2">
          <div className="flex justify-between items-center mb-5">
            <h2 className="section-title">Resumo Financeiro do Mês</h2>
            <Link href="/financeiro" className="text-sm text-primary-600 hover:underline">Ver mais →</Link>
          </div>
          {stats.monthIncome === 0 && stats.monthExpense === 0 ? (
            <div className="h-[200px] flex flex-col items-center justify-center text-gray-400">
              <p className="text-3xl mb-2">💰</p>
              <p className="text-sm">Nenhum lançamento financeiro este mês.</p>
              <Link href="/financeiro" className="text-primary-600 text-sm hover:underline mt-1">Registrar lançamento →</Link>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={[{ mes: 'Este mês', receita: stats.monthIncome, despesa: stats.monthExpense }]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="mes" tick={{ fontSize: 12 }}/>
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`}/>
                <Tooltip formatter={(v: number, n: string) => [formatCurrency(v), n === 'receita' ? 'Receita' : 'Despesa']} contentStyle={{ borderRadius: 8 }}/>
                <Bar dataKey="receita" fill="#16a34a" radius={[4,4,0,0]}/>
                <Bar dataKey="despesa" fill="#fca5a5" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="section-title">Distribuição do Rebanho</h2>
          </div>
          {stats.totalAnimals === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p className="text-3xl mb-2">🐄</p>
              <p className="text-sm">Nenhum animal cadastrado.</p>
              <Link href="/rebanho/novo" className="text-primary-600 text-sm hover:underline mt-1">Cadastrar animal →</Link>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={piData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" strokeWidth={2}>
                    {piData.map((entry, i) => <Cell key={i} fill={entry.color}/>)}
                  </Pie>
                  <Tooltip formatter={(v: number, name: string) => [v, name]}/>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {piData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }}/>
                      <span className="text-gray-600">{item.name}</span>
                    </div>
                    <span className="font-semibold text-gray-800">{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, sub, color, link }: {
  icon: string; label: string; value: string; sub?: string; color: string; link?: string
}) {
  const colorMap: Record<string, string> = {
    green: 'bg-green-50 text-green-700', blue: 'bg-blue-50 text-blue-700',
    red: 'bg-red-50 text-red-700', yellow: 'bg-yellow-50 text-yellow-700',
  }
  const content = (
    <div className="stat-card hover:shadow-card-lg transition-shadow">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${colorMap[color] ?? colorMap.green}`}>{icon}</div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
  return link ? <Link href={link}>{content}</Link> : content
}

function MiniCard({ label, value, icon, isText }: { label: string; value: number | string; icon: string; isText?: boolean }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3">
      <span className="text-xl">{icon}</span>
      <div>
        <p className={`font-bold text-gray-900 ${isText ? 'text-base' : 'text-lg'}`}>{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  )
}

function EstrusCard({ items }: { items: UpcomingEstrus[] }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return (
    <div className="card p-5">
      <div className="flex justify-between items-center mb-4">
        <h2 className="section-title">❤️ Previsão de Cio — próximos 14 dias</h2>
        <Link href="/reproducao" className="text-sm text-primary-600 hover:underline">Ver reprodução →</Link>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {items.map((item) => {
          const due = new Date(item.dueDate)
          due.setHours(0, 0, 0, 0)
          const days = Math.round((due.getTime() - today.getTime()) / 86400000)
          const animalName = item.title.replace('Previsão de Cio — ', '')
          const urgency = days === 0 ? 'hoje!' : days === 1 ? 'amanhã' : `em ${days} dias`
          const color = days <= 1 ? 'border-pink-300 bg-pink-50' : days <= 5 ? 'border-orange-200 bg-orange-50' : 'border-gray-200 bg-gray-50'
          const textColor = days <= 1 ? 'text-pink-700' : days <= 5 ? 'text-orange-600' : 'text-gray-500'
          return (
            <div key={item.id} className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${color}`}>
              <span className="text-2xl">🐄</span>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">{animalName}</p>
                <p className={`text-xs font-medium ${textColor}`}>
                  {formatDate(item.dueDate)} · {urgency}
                </p>
                <p className="text-xs text-gray-400 truncate">{item.description.split('—')[0].trim()}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
