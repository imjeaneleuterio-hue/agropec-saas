'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { PLANS } from '@/lib/plans'
import type { PlanKey } from '@/lib/plans'

type Sub = { plan: string; status: string; endDate?: string | null; preapprovalId?: string | null }

const FEATURES = {
  FREE: [
    '✅ Até 5 animais',
    '✅ Dashboard',
    '✅ Controle leiteiro',
    '✅ Pesagem',
    '✅ Alertas',
    '❌ Reprodução',
    '❌ Sanitário',
    '❌ Financeiro',
    '❌ Relatórios',
    '❌ IA Veterinária',
    '❌ Comando de voz',
  ],
  PRO: [
    '✅ Até 200 animais',
    '✅ Dashboard',
    '✅ Controle leiteiro',
    '✅ Pesagem',
    '✅ Alertas',
    '✅ Reprodução',
    '✅ Sanitário',
    '✅ Financeiro',
    '✅ Relatórios',
    '✅ IA Veterinária',
    '❌ Comando de voz',
  ],
  PREMIUM: [
    '✅ Animais ilimitados',
    '✅ Dashboard',
    '✅ Controle leiteiro',
    '✅ Pesagem',
    '✅ Alertas',
    '✅ Reprodução',
    '✅ Sanitário',
    '✅ Financeiro',
    '✅ Relatórios',
    '✅ IA Veterinária',
    '✅ Comando de voz',
  ],
}

function PlanosContent() {
  const searchParams = useSearchParams()
  const status = searchParams.get('status')
  const [sub, setSub] = useState<Sub | null>(null)
  const [loading, setLoading] = useState<PlanKey | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [cancelMsg, setCancelMsg] = useState('')

  useEffect(() => {
    const paymentId = searchParams.get('payment_id')

    // Ativa o plano direto se MP redirecionou com payment_id aprovado
    if (paymentId && status === 'aprovado') {
      fetch('/api/planos/ativar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId }),
      })
        .then(r => r.json())
        .then(() => fetch('/api/auth/me').then(r => r.json()).then(d => {
          if (d.data?.subscription) setSub(d.data.subscription)
        }))
        .catch(() => {})
      return
    }

    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d.data?.subscription) setSub(d.data.subscription)
    })
  }, [status, searchParams])

  const currentPlan: PlanKey =
    sub?.status === 'ACTIVE' && (sub.plan === 'PRO' || sub.plan === 'PREMIUM')
      ? (sub.plan as PlanKey)
      : 'FREE'

  async function handleCancelar() {
    if (!confirm('Confirmar cancelamento? Você ainda terá acesso até o fim do período pago.')) return
    setCancelling(true)
    try {
      const res = await fetch('/api/planos/cancelar', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setCancelMsg(data.message)
        setSub((prev) => prev ? { ...prev, status: 'CANCELLED' } : prev)
      } else {
        alert(data.error ?? 'Erro ao cancelar')
      }
    } catch {
      alert('Erro de conexão')
    } finally {
      setCancelling(false)
    }
  }

  async function handleCheckout(plan: PlanKey) {
    if (plan === 'FREE') return
    setLoading(plan)
    try {
      const res = await fetch('/api/planos/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      } else {
        alert(data.error ?? 'Erro ao abrir checkout')
      }
    } catch {
      alert('Erro de conexão')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="page-title">Planos</h1>
        <p className="text-muted-3 text-sm">Escolha o plano ideal para sua fazenda</p>
      </div>

      {status === 'aprovado' && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-800 font-medium">
          Pagamento aprovado! Seu plano foi atualizado.
        </div>
      )}
      {status === 'pendente' && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 font-medium">
          Pagamento em análise. Avisaremos quando for confirmado.
        </div>
      )}
      {status === 'erro' && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 font-medium">
          Pagamento não concluído. Tente novamente.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {(['FREE', 'PRO', 'PREMIUM'] as PlanKey[]).map((key) => {
          const plan = PLANS[key]
          const isCurrent = currentPlan === key
          const isPopular = key === 'PRO'

          return (
            <div
              key={key}
              className={`relative rounded-[20px] bg-white p-6 pt-7 flex flex-col gap-4 border-2 ${
                isPopular ? 'border-primary-600 shadow-card-lg' : 'border-sand shadow-card'
              } ${isCurrent ? 'ring-2 ring-primary-300' : ''}`}
            >
              {isPopular && (
                <span className="absolute -top-[1px] left-6 bg-primary-900 text-primary-50 text-[11px] font-bold px-3.5 py-1.5 rounded-b-[10px] tracking-wide">
                  MAIS POPULAR
                </span>
              )}
              {isCurrent && (
                <span className="absolute -top-3 right-4 bg-gradient-card text-white text-xs font-bold px-3 py-1 rounded-full">
                  ATUAL
                </span>
              )}

              <div>
                <h2 className="text-[17px] font-bold text-ink">{plan.name}</h2>
                <div className="flex items-end gap-1 mt-2">
                  {plan.price === 0 ? (
                    <span className="font-display italic text-4xl text-ink">Grátis</span>
                  ) : (
                    <>
                      <span className="text-sm text-muted-3 mb-1.5">R$</span>
                      <span className="font-display italic text-4xl text-ink leading-none">{plan.price}</span>
                      <span className="text-sm text-muted-3 mb-1.5">/mês</span>
                    </>
                  )}
                </div>
              </div>

              <ul className="space-y-2 flex-1">
                {FEATURES[key].map((f) => (
                  <li key={f} className={`text-[13.5px] font-medium ${f.startsWith('❌') ? 'text-muted-4' : 'text-muted-1'}`}>
                    {f}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <div className="w-full py-3 rounded-full text-[13.5px] font-bold text-center bg-primary-50 text-primary-700">
                  Seu plano atual
                </div>
              ) : key === 'FREE' ? (
                <div className="w-full py-3 rounded-full text-[13.5px] font-bold text-center bg-paper text-muted-4">
                  Plano gratuito
                </div>
              ) : (
                <button
                  onClick={() => handleCheckout(key)}
                  disabled={loading === key}
                  className="btn-primary w-full py-3 text-[13.5px] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading === key ? 'Aguarde...' : `Assinar ${plan.name}`}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {cancelMsg && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-800 text-sm">
          {cancelMsg}
        </div>
      )}

      {currentPlan !== 'FREE' && sub?.status !== 'CANCELLED' && (
        <div className="text-center">
          <button
            onClick={handleCancelar}
            disabled={cancelling}
            className="text-sm text-red-500 hover:text-red-700 hover:underline disabled:opacity-50"
          >
            {cancelling ? 'Cancelando...' : 'Cancelar assinatura'}
          </button>
          <p className="text-xs text-muted-4 mt-1">
            O acesso continua até o fim do período pago.
          </p>
        </div>
      )}

      {sub?.status === 'CANCELLED' && sub.endDate && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 text-sm text-center">
          Assinatura cancelada. Acesso ativo até {new Date(sub.endDate).toLocaleDateString('pt-BR')}.
        </div>
      )}

      <p className="text-xs text-muted-4 text-center">
        Pagamentos processados pelo Mercado Pago. PIX, cartão e boleto aceitos.
        Renovação mensal automática — cancele quando quiser.
      </p>
    </div>
  )
}

export default function PlanosPage() {
  return (
    <Suspense>
      <PlanosContent />
    </Suspense>
  )
}
