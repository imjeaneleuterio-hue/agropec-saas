'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatDate, formatRelative, daysFromToday, cn } from '@/lib/utils'
import type { Alert } from '@/types'

const PRIORITY_CONFIG = {
  CRITICAL: { label: 'Crítico', color: 'border-red-300 bg-red-50', badge: 'bg-red-100 text-red-700', borderLeft: 'border-l-red-400', dot: 'bg-red-500', icon: '🚨' },
  HIGH:     { label: 'Alto',    color: 'border-orange-300 bg-orange-50', badge: 'bg-orange-100 text-orange-700', borderLeft: 'border-l-orange-400', dot: 'bg-orange-500', icon: '⚠️' },
  MEDIUM:   { label: 'Médio',   color: 'border-yellow-300 bg-yellow-50', badge: 'bg-yellow-100 text-yellow-700', borderLeft: 'border-l-yellow-400', dot: 'bg-yellow-400', icon: '📋' },
  LOW:      { label: 'Baixo',   color: 'border-gray-200 bg-gray-50',    badge: 'bg-gray-100 text-gray-600',    borderLeft: 'border-l-gray-300',   dot: 'bg-gray-400',   icon: 'ℹ️' },
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
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

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

  async function apagar(id: string) {
    setConfirmId(null)
    setDeletingId(id)
    try {
      await fetch(`/api/alertas?id=${id}`, { method: 'DELETE' })
      setAlerts((prev) => prev.filter((a) => a.id !== id))
    } catch {}
    setDeletingId(null)
  }

  const filtered = alerts.filter((a) => {
    const matchPriority = filterPriority === 'ALL' || a.priority === filterPriority
    const matchType = filterType === 'ALL' || a.type === filterType
    return matchPriority && matchType
  })

  const criticalCount = alerts.filter((a) => a.priority === 'CRITICAL').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Alertas e Notificações</h1>
        <p className="text-gray-500 text-sm">
          {loading ? 'Carregando...' : (
            <>
              {alerts.length} alerta{alerts.length !== 1 ? 's' : ''}
              {criticalCount > 0 && (
                <span className="text-red-600 font-medium"> · {criticalCount} crítico{criticalCount !== 1 ? 's' : ''}</span>
              )}
            </>
          )}
        </p>
      </div>

      {/* Contadores por prioridade */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {(Object.entries(PRIORITY_CONFIG) as [string, typeof PRIORITY_CONFIG[keyof typeof PRIORITY_CONFIG]][]).map(([priority, config]) => {
          const count = alerts.filter((a) => a.priority === priority).length
          return (
            <button
              key={priority}
              onClick={() => setFilterPriority(filterPriority === priority ? 'ALL' : priority)}
              className={cn(
                'p-3 rounded-xl border-2 text-left transition-all',
                filterPriority === priority
                  ? config.color + ' border-current'
                  : 'bg-white border-gray-100 hover:border-gray-200'
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <span>{config.icon}</span>
                <span className="text-xs text-gray-600">{config.label}</span>
              </div>
              <p className="text-xl font-bold text-gray-900">{count}</p>
            </button>
          )
        })}
      </div>

      {/* Filtro por tipo */}
      <div>
        <select
          className="input-field w-auto text-sm"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="ALL">Todos os tipos</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="card p-12 text-center text-gray-400 text-sm">Carregando alertas...</div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-4xl mb-3">✅</p>
          <p className="text-gray-500 font-medium">
            {alerts.length === 0 ? 'Nenhum alerta no momento.' : 'Nenhum alerta com esses filtros.'}
          </p>
          <p className="text-gray-400 text-sm mt-1">Os alertas são gerados automaticamente pelo sistema.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((alert) => {
            const config = PRIORITY_CONFIG[alert.priority as keyof typeof PRIORITY_CONFIG]
            return (
              <div
                key={alert.id}
                className={cn('card border-l-4 p-4 transition-all', config.color, config.borderLeft)}
              >
                <div className="flex items-start gap-4">
                  <div className="text-xl mt-0.5">{config.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
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
                          : days === 0 ? 'vence hoje!'
                          : days === 1 ? 'vence amanhã'
                          : `em ${days} dias`
                        const color = days < 0 ? 'text-red-600 font-semibold' : days <= 2 ? 'text-orange-600 font-semibold' : 'text-gray-600'
                        return (
                          <span>
                            📅 {formatDate(alert.dueDate)}{' '}
                            <span className={color}>({urgency})</span>
                          </span>
                        )
                      })()}
                      <span>{formatRelative(alert.createdAt)}</span>
                    </div>
                  </div>
                  {confirmId === alert.id ? (
                    <div className="flex-shrink-0 flex items-center gap-2">
                      <span className="text-xs text-gray-600">Apagar?</span>
                      <button
                        onClick={() => apagar(alert.id)}
                        className="px-2.5 py-1 text-xs font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Sim
                      </button>
                      <button
                        onClick={() => setConfirmId(null)}
                        className="px-2.5 py-1 text-xs font-semibold bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Não
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmId(alert.id)}
                      disabled={deletingId === alert.id}
                      title="Apagar alerta"
                      className="flex-shrink-0 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {deletingId === alert.id ? '...' : '🗑️'}
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
