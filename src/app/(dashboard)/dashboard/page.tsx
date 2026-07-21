'use client'

import { useCallback, useEffect, useState } from 'react'
import { formatCurrency, formatNumber, formatDate, formatDateOnly, daysFromToday } from '@/lib/utils'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import Link from 'next/link'
import { getQueue, type QueuedEntry } from '@/lib/offlineQueue'
import type { DashboardStats, Alert, UpcomingEstrus } from '@/types'
import {
  Tag, Droplets, Bell, TrendingUp, CreditCard,
  CheckCircle, CalendarDays, Scale, Syringe,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const EMPTY_STATS: DashboardStats = {
  totalAnimals: 0, activeAnimals: 0, dairyAnimals: 0,
  todayMilkTotal: 0, monthMilkTotal: 0, pendingAlerts: 0, criticalAlerts: 0,
  monthIncome: 0, monthExpense: 0, pregnantAnimals: 0, upcomingVaccinations: 0,
  upcomingEstrus: [],
}

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: 'bg-red-50 text-red-700 border-red-200',
  HIGH: 'bg-alert-bg text-alert-text border-alert-border',
  MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
  LOW: 'bg-paper text-muted-2 border-sand',
}
const PRIORITY_LABELS: Record<string, string> = {
  CRITICAL: 'Crítico', HIGH: 'Alto', MEDIUM: 'Médio', LOW: 'Baixo',
}

type DayMilk = { day: string; dateStr: string; liters: number }

function getSaudacao(nome?: string | null): string {
  const h = new Date().getHours()
  const period = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
  const first = nome?.split(' ')[0]
  return first ? `${period}, ${first}` : period
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [milkChart, setMilkChart] = useState<DayMilk[]>([])
  const [loading, setLoading] = useState(true)
  const [farmNotes, setFarmNotes] = useState<{ id: string; content: string; createdAt: string }[]>([])
  const [newNote, setNewNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [userName, setUserName] = useState<string | null>(null)
  // Hora local e data de "agora" dependem do fuso do navegador — calcular só
  // depois de montar evita divergir do horário (UTC) usado na renderização
  // no servidor, o que quebrava a hidratação do React (erro #418) e travava
  // a navegação do app inteiro.
  const [now, setNow] = useState<Date | null>(null)
  const [queue, setQueue] = useState<QueuedEntry[]>([])

  useEffect(() => {
    setNow(new Date())
  }, [])

  const loadDashboard = useCallback(() => {
    const today = new Date()
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(today.getDate() - 6)

    fetch('/api/auth/me').then((r) => r.json()).then((d) => {
      if (d.data?.name) setUserName(d.data.name)
    }).catch(() => {})

    fetch('/api/fazenda/notas').then((r) => r.json()).then((res) => {
      if (Array.isArray(res.data)) setFarmNotes(res.data)
    }).catch(() => {})

    Promise.all([
      fetch('/api/dashboard').then((r) => r.json()),
      fetch('/api/alertas?unread=true&withinDays=30').then((r) => r.json()),
      fetch(`/api/leite/diario?startDate=${sevenDaysAgo.toISOString().split('T')[0]}&limit=7`).then((r) => r.json()),
    ]).then(([dash, alertsRes, milkRes]) => {
      if (dash.data) setStats({ ...EMPTY_STATS, ...dash.data })
      if (Array.isArray(alertsRes.data)) setAlerts(alertsRes.data.slice(0, 3))

      const days: { dateStr: string; label: string }[] = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today)
        d.setDate(today.getDate() - i)
        days.push({
          dateStr: d.toLocaleDateString('en-CA'),
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
      setMilkChart(days.map(({ dateStr, label }) => ({ day: label, dateStr, liters: totals[dateStr] })))
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadDashboard() }, [loadDashboard])

  // Lançamentos de leite feitos sem internet (em qualquer tela) ficam
  // guardados no aparelho até sincronizar — sem isso, a produção de hoje
  // lançada offline nunca aparecia aqui, só na tela de Leite.
  useEffect(() => {
    setQueue(getQueue())
    function handleQueueChanged() { setQueue(getQueue()); loadDashboard() }
    window.addEventListener('offline-queue:changed', handleQueueChanged)
    return () => window.removeEventListener('offline-queue:changed', handleQueueChanged)
  }, [loadDashboard])

  const pendingDiarioByDate = queue
    .filter((q) => q.kind === 'diario')
    .reduce<Record<string, number>>((acc, q) => {
      const morning = Number(q.payload.morningLiters) || 0
      const afternoon = Number(q.payload.afternoonLiters) || 0
      const evening = Number(q.payload.eveningLiters) || 0
      const dateStr = String(q.payload.date ?? '').split('T')[0]
      if (dateStr) acc[dateStr] = morning + afternoon + evening
      return acc
    }, {})

  const displayedMilkChart = milkChart.map((d) =>
    d.dateStr in pendingDiarioByDate ? { ...d, liters: pendingDiarioByDate[d.dateStr] } : d
  )
  const todayStr = new Date().toLocaleDateString('en-CA')
  const todayChartEntry = displayedMilkChart.find((d) => d.dateStr === todayStr)
  const displayedTodayMilkTotal = todayChartEntry ? todayChartEntry.liters : stats.todayMilkTotal

  const balance = stats.monthIncome - stats.monthExpense
  const hasMilkData = displayedMilkChart.some((d) => d.liters > 0)

  async function handleAddNote() {
    if (!newNote.trim()) return
    setSavingNote(true)
    try {
      const res = await fetch('/api/fazenda/notas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNote.trim() }),
      })
      const data = await res.json()
      if (data.data) {
        setFarmNotes((prev) => [data.data, ...prev])
        setNewNote('')
      }
    } finally {
      setSavingNote(false)
    }
  }

  async function handleDeleteNote(noteId: string) {
    await fetch('/api/fazenda/notas', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ noteId }),
    })
    setFarmNotes((prev) => prev.filter((n) => n.id !== noteId))
  }

  return (
    <div className="space-y-6">
      <div className="relative rounded-[22px] px-6 py-7 sm:px-8 overflow-hidden bg-gradient-agro">
        <div className="absolute inset-0 opacity-70" style={{
          background: 'radial-gradient(circle at 15% 20%, rgba(220,252,231,0.35), transparent 55%), radial-gradient(circle at 90% 0%, rgba(254,243,199,0.3), transparent 45%)',
        }} />
        <div className="relative">
          <p className="text-[13px] font-bold text-primary-50 uppercase tracking-widest mb-1.5" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.35)' }}>
            {now ? getSaudacao(userName) : 'Olá'}
          </p>
          <h1 className="font-display italic text-2xl sm:text-[26px] text-white max-w-xl leading-snug" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
            {loading
              ? 'Carregando os números da sua fazenda…'
              : `Sua fazenda produziu ${formatNumber(displayedTodayMilkTotal)} litros de leite hoje.`}
          </h1>
          {now && <p className="text-primary-100/80 text-sm mt-2">{formatDate(now, "EEEE, dd 'de' MMMM 'de' yyyy")}</p>}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="stat-card animate-pulse"><div className="w-10 h-10 bg-sand rounded-xl"/><div className="space-y-2"><div className="h-7 bg-sand rounded w-20"/><div className="h-3 bg-paper rounded w-24"/></div></div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon="🐄🐂" label="Total de Animais" value={stats.totalAnimals.toString()}
              sub={`${stats.activeAnimals} ativos`} color="green" />
            <StatCard icon="🥛" label="Produção Hoje" value={`${formatNumber(displayedTodayMilkTotal)} L`}
              sub={`${formatNumber(stats.monthMilkTotal)} L no mês`} color="blue" />
            <StatCard icon={Bell} label="Alertas Pendentes" value={stats.pendingAlerts.toString()}
              sub={`${stats.criticalAlerts} críticos`} color="red" link="/alertas" />
            <StatCard icon="💰" label="Saldo do Mês" value={formatCurrency(balance)}
              sub={`Receita: ${formatCurrency(stats.monthIncome)}`} color={balance >= 0 ? 'green' : 'red'} />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <MiniCard label="Leiteiras" value={stats.dairyAnimals} icon="🐄" />
            <MiniCard label="Prenhas" value={stats.pregnantAnimals} icon="🤰" />
            <MiniCard label="A Pagar Mês" value={formatCurrency(stats.monthExpense)} icon={CreditCard} isText />
          </div>
        </>
      )}

      <div className="card p-5">
        <h2 className="section-title mb-4">Atalhos rápidos</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/leite" className="btn-primary">
            <Droplets className="w-[17px] h-[17px]" />
            Lançar produção do dia
          </Link>
          <Link href="/pesagem" className="btn-secondary">
            <Scale className="w-[17px] h-[17px]" />
            Registrar pesagem
          </Link>
          <Link href="/sanitario" className="btn-secondary">
            <Syringe className="w-[17px] h-[17px]" />
            Nova ocorrência sanitária
          </Link>
          <Link href="/rebanho/novo" className="btn-secondary">
            <Tag className="w-[17px] h-[17px]" />
            Cadastrar animal
          </Link>
        </div>
      </div>

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
              <AreaChart data={displayedMilkChart}>
                <defs>
                  <linearGradient id="milkGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#efe9db"/>
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#9a9280' }}/>
                <YAxis tick={{ fontSize: 12, fill: '#9a9280' }}/>
                <Tooltip formatter={(v: number) => [`${formatNumber(v)} L`, 'Produção']} contentStyle={{ borderRadius: 12, border: '1px solid #efe9db' }}/>
                <Area type="monotone" dataKey="liters" stroke="#16a34a" fill="url(#milkGrad)" strokeWidth={2}/>
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex flex-col items-center justify-center text-muted-4 gap-2">
              <Droplets className="w-8 h-8 opacity-40" />
              <p className="text-sm">Nenhuma produção registrada nos últimos 7 dias.</p>
              <Link href="/leite" className="text-primary-600 text-sm hover:underline">Registrar produção →</Link>
            </div>
          )}
        </div>

        <div className="card p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="section-title">Alertas Recentes</h2>
            <Link href="/alertas" className="text-sm text-primary-600 hover:underline">Ver todos →</Link>
          </div>
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-muted-4 flex flex-col items-center gap-2">
              <CheckCircle className="w-8 h-8 opacity-40" />
              <p className="text-sm">Nenhum alerta pendente!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div key={alert.id} className={`p-3 rounded-xl border ${PRIORITY_COLORS[alert.priority]}`}>
                  <div className="flex justify-between items-start gap-2">
                    <p className="text-sm font-semibold leading-snug">{alert.title}</p>
                    <span className="text-xs font-bold whitespace-nowrap">{PRIORITY_LABELS[alert.priority]}</span>
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
            <div className="h-[200px] flex flex-col items-center justify-center text-muted-4 gap-2">
              <TrendingUp className="w-8 h-8 opacity-40" />
              <p className="text-sm">Nenhum lançamento financeiro este mês.</p>
              <Link href="/financeiro" className="text-primary-600 text-sm hover:underline">Registrar lançamento →</Link>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={[{ mes: 'Este mês', receita: stats.monthIncome, despesa: stats.monthExpense }]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#efe9db"/>
                <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#9a9280' }}/>
                <YAxis tick={{ fontSize: 12, fill: '#9a9280' }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`}/>
                <Tooltip formatter={(v: number, n: string) => [formatCurrency(v), n === 'receita' ? 'Receita' : 'Despesa']} contentStyle={{ borderRadius: 12, border: '1px solid #efe9db' }}/>
                <Bar dataKey="receita" fill="#16a34a" radius={[4,4,0,0]}/>
                <Bar dataKey="despesa" fill="#92400e" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card p-5 flex flex-col gap-3">
          <h2 className="section-title">Anotações da Fazenda</h2>
          <div className="flex gap-2">
            <textarea
              className="input-field resize-none text-sm flex-1"
              rows={2}
              placeholder="Escreva uma anotação..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddNote() } }}
            />
            <button
              onClick={handleAddNote}
              disabled={savingNote || !newNote.trim()}
              className="btn-primary text-sm px-3 self-end"
            >
              {savingNote ? '...' : 'Salvar'}
            </button>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {farmNotes.length === 0 ? (
              <p className="text-xs text-muted-4 text-center py-4">Nenhuma anotação ainda.</p>
            ) : farmNotes.map((note) => (
              <div key={note.id} className="flex items-start justify-between gap-2 bg-paper rounded-lg px-3 py-2">
                <p className="text-sm text-muted-1 whitespace-pre-wrap flex-1">{note.content}</p>
                <button
                  onClick={() => handleDeleteNote(note.id)}
                  className="text-muted-4 hover:text-red-400 transition-colors text-xs shrink-0 mt-0.5"
                  title="Excluir"
                >✕</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon: iconProp, label, value, sub, color, link }: {
  icon: LucideIcon | string; label: string; value: string; sub?: string; color: string; link?: string
}) {
  const colorMap: Record<string, string> = {
    green: 'bg-primary-50 text-primary-700', blue: 'bg-sky-50 text-sky-700',
    red: 'bg-red-50 text-red-600', yellow: 'bg-amber-50 text-amber-700',
  }
  const deltaColorMap: Record<string, string> = {
    green: 'text-primary-600', blue: 'text-muted-3', red: 'text-alert-text', yellow: 'text-alert-text',
  }
  function IconNode() {
    if (typeof iconProp === 'string') return <span className="text-xl leading-none">{iconProp}</span>
    const I = iconProp
    return <I className="w-5 h-5" />
  }
  const content = (
    <div className="stat-card hover:shadow-card-lg transition-shadow">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorMap[color] ?? colorMap.green}`}>
        <IconNode />
      </div>
      <div>
        <p className="font-display italic text-4xl text-ink leading-none">{value}</p>
        <p className="text-[11px] font-bold text-muted-3 uppercase tracking-wide mt-2.5">{label}</p>
        {sub && <p className={`text-xs font-semibold mt-1 ${deltaColorMap[color] ?? 'text-muted-4'}`}>{sub}</p>}
      </div>
    </div>
  )
  return link ? <Link href={link}>{content}</Link> : content
}

function MiniCard({ label, value, icon: iconProp, isText }: { label: string; value: number | string; icon: LucideIcon | string; isText?: boolean }) {
  function IconNode() {
    if (typeof iconProp === 'string') return <span className="text-lg leading-none">{iconProp}</span>
    const I = iconProp
    return <I className="w-4 h-4 text-muted-2" />
  }
  return (
    <div className="bg-white rounded-xl border border-sand px-4 py-3 flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-paper flex items-center justify-center shrink-0">
        <IconNode />
      </div>
      <div>
        <p className={`font-bold text-ink ${isText ? 'text-base' : 'text-lg'}`}>{value}</p>
        <p className="text-xs text-muted-3">{label}</p>
      </div>
    </div>
  )
}

function EstrusCard({ items }: { items: UpcomingEstrus[] }) {
  return (
    <div className="card p-5">
      <div className="flex justify-between items-center mb-4">
        <h2 className="section-title flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-pink-500" />
          Previsão de Cio — próximos 14 dias
        </h2>
        <Link href="/reproducao" className="text-sm text-primary-600 hover:underline">Ver reprodução →</Link>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {items.map((item) => {
          const days = daysFromToday(item.dueDate)
          const animalName = item.title.replace('Previsão de Cio — ', '')
          const urgency = days === 0 ? 'hoje!' : days === 1 ? 'amanhã' : `em ${days} dias`
          const color = days <= 1 ? 'border-pink-300 bg-pink-50' : days <= 5 ? 'border-orange-200 bg-orange-50' : 'border-sand bg-paper'
          const textColor = days <= 1 ? 'text-pink-700' : days <= 5 ? 'text-orange-600' : 'text-muted-3'
          return (
            <div key={item.id} className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${color}`}>
              <Tag className="w-5 h-5 text-muted-4 shrink-0" />
              <div className="min-w-0">
                <p className="font-semibold text-ink text-sm truncate">{animalName}</p>
                <p className={`text-xs font-medium ${textColor}`}>
                  {formatDateOnly(item.dueDate)} · {urgency}
                </p>
                <p className="text-xs text-muted-4 truncate">{item.description.split('—')[0].trim()}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
