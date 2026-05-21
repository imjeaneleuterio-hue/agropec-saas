'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { PLANS } from '@/lib/plans'
import type { PlanKey } from '@/lib/plans'

type Sub = { plan: string; status: string; endDate?: string | null }

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

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d.data?.subscription) setSub(d.data.subscription)
    })
  }, [status])

  const currentPlan: PlanKey =
    sub?.status === 'ACTIVE' && (sub.plan === 'PRO' || sub.plan === 'PREMIUM')
      ? (sub.plan as PlanKey)
      : 'FREE'

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
        <p className="text-gray-500 text-sm">Escolha o plano ideal para sua fazenda</p>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(['FREE', 'PRO', 'PREMIUM'] as PlanKey[]).map((key) => {
          const plan = PLANS[key]
          const isCurrent = currentPlan === key
          const isPopular = key === 'PRO'

          return (
            <div
              key={key}
              className={`relative card p-6 flex flex-col gap-4 ${
                isPopular ? 'border-2 border-primary-500 shadow-lg' : ''
              } ${isCurrent ? 'ring-2 ring-primary-400' : ''}`}
            >
              {isPopular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                  MAIS POPULAR
                </span>
              )}
              {isCurrent && (
                <span className="absolute -top-3 right-4 bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                  ATUAL
                </span>
              )}

              <div>
                <h2 className="text-lg font-bold text-gray-900">{plan.name}</h2>
                <div className="flex items-end gap-1 mt-1">
                  {plan.price === 0 ? (
                    <span className="text-3xl font-extrabold text-gray-900">Grátis</span>
                  ) : (
                    <>
                      <span className="text-sm text-gray-500 mb-1">R$</span>
                      <span className="text-3xl font-extrabold text-gray-900">{plan.price}</span>
                      <span className="text-sm text-gray-500 mb-1">/mês</span>
                    </>
                  )}
                </div>
              </div>

              <ul className="space-y-1.5 flex-1">
                {FEATURES[key].map((f) => (
                  <li key={f} className={`text-sm ${f.startsWith('❌') ? 'text-gray-400' : 'text-gray-700'}`}>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleCheckout(key)}
                disabled={isCurrent || key === 'FREE' || loading === key}
                className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  isCurrent
                    ? 'bg-gray-100 text-gray-400 cursor-default'
                    : key === 'FREE'
                    ? 'bg-gray-100 text-gray-400 cursor-default'
                    : isPopular
                    ? 'bg-primary-600 hover:bg-primary-700 text-white'
                    : 'bg-gray-800 hover:bg-gray-900 text-white'
                } disabled:opacity-60 disabled:cursor-not-allowed`}
              >
                {loading === key
                  ? 'Aguarde...'
                  : isCurrent
                  ? 'Plano atual'
                  : key === 'FREE'
                  ? 'Plano gratuito'
                  : `Assinar ${plan.name}`}
              </button>
            </div>
          )
        })}
      </div>

      <p className="text-xs text-gray-400 text-center">
        Pagamentos processados pelo Mercado Pago. PIX, cartão e boleto aceitos.
        Renovação mensal — cancele quando quiser.
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
