'use client'

import { useRouter } from 'next/navigation'

const MODULE_NAMES: Record<string, string> = {
  reproducao: 'Reprodução',
  sanitario:  'Sanitário',
  financeiro: 'Financeiro',
  relatorios: 'Relatórios',
  ia:         'IA Veterinária',
  ia_voz:     'Comando de Voz',
}

const MODULE_LIMITS: Record<string, string> = {
  reproducao: '3 eventos',
  sanitario:  '5 registros',
  financeiro: '5 lançamentos',
  relatorios: '3 visualizações',
  ia:         '5 perguntas',
  ia_voz:     '3 comandos',
}

interface Props {
  module: string
  onClose: () => void
}

export function UpgradeModal({ module, onClose }: Props) {
  const router = useRouter()

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
        <div className="text-5xl mb-3">🔒</div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">Período de teste encerrado</h2>
        <p className="text-gray-500 text-sm mb-1">
          Você usou as <strong>{MODULE_LIMITS[module] ?? 'usos'} gratuitas</strong> do módulo{' '}
          <strong>{MODULE_NAMES[module] ?? module}</strong>.
        </p>
        <p className="text-gray-400 text-xs mb-5">
          Assine o plano Pro ou Premium para continuar usando sem limites.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="btn-secondary flex-1"
          >
            Fechar
          </button>
          <button
            onClick={() => { onClose(); router.push('/planos') }}
            className="btn-primary flex-1"
          >
            Ver Planos
          </button>
        </div>
      </div>
    </div>
  )
}
