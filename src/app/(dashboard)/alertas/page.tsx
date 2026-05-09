'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatDate, formatRelative, daysFromToday, cn } from '@/lib/utils'
import type { Alert } from '@/types'

const PRIORITY_CONFIG = {
  CRITICAL: { label: 'Crítico', color: 'border-red-300 bg-red-50', badge: 'bg-red-100 text-red-700', dot: 'bg-red-500', icon: '🚨' },
  HIGH:     { label: 'Alto',    color: 'border-orange-300 bg-orange-50', badge: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500', icon: '⚠️' },
  MEDIUM:   { label: 'Médio',   color: 'border-yellow-300 bg-yellow-50', badge: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-400', icon: '📋' },
  LOW:      { label: 'Baixo',   color: 'border-gray-200 bg-gray-50',   badge: 'bg-gray-100 text-gray-600',   dot: 'bg-gray-400',   icon: 'ℹ️' },
} as const

const TYPE_LABELS: Record<string, string> = {
  VACCINATION: 'Vacinação', REPRODUCTIVE: 'Reprodutivo', FINANCIAL: 'Financeiro',
  HEALTH: 'Saúde', GENERAL: 'Geral', WEIGHT_CHECK: 'Pesagem',
}

export default function AlertasPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [filterPriority, setFilterPriority] = useState('ALL')
  const [filterType, setFilterType] = useState('ALL')
  const [showRead, setShowRead] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/alertas')
      const data = await res.json()
      if (Array.isArray(data.data)) setAlerts(data.data)
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function markRead(id: string) {
    setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, isRead: true } : a))
    await fetch('/api/alertas', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }).catch(() => {})
  }

  async function markAllRead() {
    setAlerts((prev) => prev.map((a) => ({ ...a, isRead: true })))
    await fetch('/api/alertas', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAllRead: true }),
    }).catch(() => {})
  }

  const filtered = alerts.filter((a) => {
    const matchPriority = filterPriority === 'ALL' || a.priority === filterPriority
    const matchType = filterType === 'ALL' || a.type === filterType
    const matchRead = showRead || !a.isRead
    return matchPriority && matchType && matchRead
  })

  const unreadCount = alerts.filter((a) => !a.isRead).length
  const criticalCount = alerts.filter((a) => a.priority === 'CRITICAL' && !a.isRead).length

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="page-title">Alertas e Notificações</h1>
          <p className="text-gray-500 text-sm">
            {loading ? 'Carregando...' : (
              <>
                {unreadCount} não lido{unreadCount !== 1 ? 's' : ''}
                {criticalCount > 0 && (
                  <span className="text-red-600 font-medium"> · {criticalCount} crítico{criticalCount !== 1 ? 's' : ''}</span>
                )}
              </>
            )}
          </p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="btn-secondary text-sm">✓ Marcar todos como lido</button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {(Object.entries(PRIORITY_CONFIG) as [string, typeof PRIORITY_CONFIG[keyof typeof PRIORITY_CONFIG]][]).map(([priority, config]) => {
          const count = alerts.filter((a) => a.priority === priority && !a.isRead).length
          return (
            <button key={priority} onClick={() => setFilterPriority(filterPriority === priority ? 'ALL' : priority)}
              className={cn('p-3 rounded-xl border-2 text-left transition-all',
                filterPriority === priority ? config.color + ' border-current' : 'bg-white border-gray-100 hover:border-gray-200')}>
              <div className="flex items-center gap-2 mb-1">
                <span>{config.icon}</span>
                <span className="text-xs text-gray-600">{config.label}</span>
              </div>
              <p className="text-xl font-bold text-gray-900">{count}</p>
            </button>
          )
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <select className="input-field w-auto text-sm" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="ALL">Todos os tipos</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={showRead} onChange={(e) => setShowRead(e.target.checked)}
            className="rounded border-gray-300 text-primary-600"/>
          Mostrar lidos
        </label>
      </div>

      {/* List */}
      {loading ? (
        <div className="card p-12 text-center text-gray-400 text-sm">Carregando alertas...</div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-4xl mb-3">🔔</p>
          <p className="text-gray-500 font-medium">
            {alerts.length === 0 ? 'Nenhum alerta cadastrado.' : 'Nenhum alerta encontrado com esses filtros.'}
          </p>
          <p className="text-gray-400 text-sm mt-1">
            {alerts.length === 0 ? 'Os alertas são gerados automaticamente pelo sistema.' : 'Tente mudar os filtros acima.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((alert) => {
            const config = PRIORITY_CONFIG[alert.priority as keyof typeof PRIORITY_CONFIG]
            const borderColor = alert.priority === 'CRITICAL' ? 'border-l-red-400' : alert.priority === 'HIGH' ? 'border-l-orange-400' : alert.priority === 'MEDIUM' ? 'border-l-yellow-400' : 'border-l-gray-300'
            return (
              <div key={alert.id}
                className={cn('card border-l-4 p-4 transition-all', alert.isRead ? 'opacity-60 border-l-gray-200 bg-gray-50' : cn(config.color, borderColor))}>
                <div className="flex items-start gap-4">
                  <div className="text-xl mt-0.5">{config.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {!alert.isRead && <div className={`w-2 h-2 rounded-full ${config.dot}`}/>}
                      <span className={`badge text-xs ${config.badge}`}>{config.label}</span>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                        {TYPE_LABELS[alert.type] ?? alert.type}
                      </span>
                    </div>
                    <p className="font-semibold text-gray-900">
                      {alert.title.startsWith('Previsão de Cio') ? '❤️ ' : ''}
                      {alert.title}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">{alert.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400 flex-wrap">
                      {alert.dueDate && (() => {
                        const days = daysFromToday(alert.dueDate)
                        const urgency = days < 0
                          ? `vencido há ${Math.abs(days)} dia${Math.abs(days) !== 1 ? 's' : ''}`
                          : days === 0
                          ? 'vence hoje!'
                          : days === 1
                          ? 'vence amanhã'
                          : `em ${days} dias`
                        const color = days < 0 ? 'text-red-600 font-semibold' : days <= 2 ? 'text-orange-600 font-semibold' : 'text-gray-600'
                        return (
                          <span>
                            📅 {formatDate(alert.dueDate)}
                            {' '}<span className={color}>({urgency})</span>
                          </span>
                        )
                      })()}
                      <span>{formatRelative(alert.createdAt)}</span>
                    </div>
                  </div>
                  {!alert.isRead && (
                    <button onClick={() => markRead(alert.id)} className="btn-ghost text-xs px-3 py-1.5 flex-shrink-0">
                      ✓ Marcar lido
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
