'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const MODULE_LABELS: Record<string, { action: string; unit: string }> = {
  reproducao: { action: 'evento',       unit: 'eventos'      },
  sanitario:  { action: 'registro',     unit: 'registros'    },
  financeiro: { action: 'lançamento',   unit: 'lançamentos'  },
  relatorios: { action: 'visualização', unit: 'visualizações'},
  ia:         { action: 'pergunta',     unit: 'perguntas'    },
  ia_voz:     { action: 'comando',      unit: 'comandos'     },
}

interface Props {
  module: string
}

export function TrialBanner({ module }: Props) {
  const router = useRouter()
  const [state, setState] = useState<{
    unlocked: boolean; used: number; limit: number; remaining: number
  } | null>(null)

  useEffect(() => {
    fetch(`/api/trial/usage?module=${module}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.unlocked === false) setState({ unlocked: false, used: d.used, limit: d.limit, remaining: d.remaining })
      })
      .catch(() => {})
  }, [module])

  if (!state) return null

  const { remaining, limit, used } = state
  const pct = Math.max(0, (remaining / limit) * 100)
  const labels = MODULE_LABELS[module] ?? { action: 'uso', unit: 'usos' }

  if (remaining <= 0) {
    return (
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm">
        <div className="flex items-center gap-2">
          <span className="text-red-500">🔒</span>
          <span className="text-red-700 font-medium">
            Teste encerrado — todos os {limit} {labels.unit} gratuitos foram usados.
          </span>
        </div>
        <button
          onClick={() => router.push('/planos')}
          className="shrink-0 px-3 py-1 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition-colors"
        >
          Assinar
        </button>
      </div>
    )
  }

  const color = remaining === 1
    ? { bar: 'bg-yellow-400', bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800', sub: 'text-yellow-600' }
    : { bar: 'bg-green-400',  bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-800',  sub: 'text-green-600'  }

  return (
    <div className={`px-4 py-3 ${color.bg} border ${color.border} rounded-xl`}>
      <div className="flex items-center justify-between gap-3 mb-2">
        <span className={`text-sm font-medium ${color.text}`}>
          {remaining === 1
            ? `⚠️ Último ${labels.action} gratuito!`
            : `🧪 Teste gratuito — ${remaining} de ${limit} ${labels.unit} restantes`}
        </span>
        <button
          onClick={() => router.push('/planos')}
          className={`shrink-0 text-xs font-semibold ${color.sub} hover:underline`}
        >
          Assinar para uso ilimitado →
        </button>
      </div>
      <div className="h-1.5 bg-white/60 rounded-full overflow-hidden">
        <div
          className={`h-full ${color.bar} rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className={`text-xs ${color.sub} mt-1`}>
        {used} {used === 1 ? labels.action : labels.unit} usado{used !== 1 ? 's' : ''}
      </p>
    </div>
  )
}
