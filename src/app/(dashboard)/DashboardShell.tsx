'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { VoiceButton } from '@/components/VoiceButton'
import { UpgradeModal } from '@/components/UpgradeModal'
import { UpdateBanner } from '@/components/UpdateBanner'
import type { User } from '@/types'
import type { PlanKey } from '@/lib/plans'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/rebanho': 'Gestão de Rebanho',
  '/leite': 'Controle Leiteiro',
  '/reproducao': 'Calendário Reprodutivo',
  '/sanitario': 'Controle Sanitário',
  '/pesagem': 'Controle de Pesagem',
  '/financeiro': 'Financeiro Rural',
  '/alertas': 'Alertas e Notificações',
  '/relatorios': 'Relatórios',
  '/ia': 'IA Veterinária',
  '/admin': 'Administração',
  '/configuracoes': 'Configurações',
  '/planos': 'Planos',
}

type Farm = { id: string; name: string; city: string; state: string }

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [farms, setFarms] = useState<Farm[]>([])
  const [plan, setPlan] = useState<PlanKey>('FREE')
  const [role, setRole] = useState<string>('')
  const [upgradeModule, setUpgradeModule] = useState<string | null>(null)
  const pathname = usePathname()

  const title = Object.entries(PAGE_TITLES).find(([key]) =>
    pathname === key || pathname.startsWith(key + '/')
  )?.[1] ?? 'J.ELEUPEC'

  useEffect(() => {
    fetch('/api/auth/me').then((r) => r.json()).then((d) => {
      if (d.data) {
        setUser(d.data)
        setFarms(d.data.farms ?? [])
        setRole(d.data.role ?? '')
        const userRole = d.data.role ?? ''
        if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') {
          setPlan('PREMIUM')
        } else {
          const sub = d.data.subscription
          if (sub?.status === 'ACTIVE') {
            const PLAN_MAP: Record<string, PlanKey> = {
              PRO: 'PRO', PREMIUM: 'PREMIUM',
              PROFESSIONAL: 'PREMIUM', ENTERPRISE: 'PREMIUM', BASIC: 'PRO',
            }
            const mapped = PLAN_MAP[sub.plan]
            if (mapped) setPlan(mapped)
          }
        }
      }
    })
  }, [])

  useEffect(() => {
    function onTrialExhausted(e: Event) {
      const detail = (e as CustomEvent).detail as { module: string }
      setUpgradeModule(detail.module)
    }
    window.addEventListener('trial:exhausted', onTrialExhausted)
    return () => window.removeEventListener('trial:exhausted', onTrialExhausted)
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-paper">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} plan={plan} role={role} />
      <div className="flex flex-col flex-1 min-w-0 lg:ml-64 overflow-hidden">
        <Header user={user} farms={farms} onMenuClick={() => setSidebarOpen(true)} title={title} />
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6 max-w-screen-2xl mx-auto">
            {children}
          </div>
        </main>
        <VoiceButton />
        <UpdateBanner />
      </div>

      {upgradeModule && (
        <UpgradeModal module={upgradeModule} onClose={() => setUpgradeModule(null)} />
      )}
    </div>
  )
}
