'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import type { User } from '@/types'

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
  '/admin': 'Administração',
  '/configuracoes': 'Configurações',
}

type Farm = { id: string; name: string; city: string; state: string }

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [farms, setFarms] = useState<Farm[]>([])
  const pathname = usePathname()

  const title = Object.entries(PAGE_TITLES).find(([key]) =>
    pathname === key || pathname.startsWith(key + '/')
  )?.[1] ?? 'J.ELEUPEC'

  useEffect(() => {
    fetch('/api/auth/me').then((r) => r.json()).then((d) => {
      if (d.data) {
        setUser(d.data)
        setFarms(d.data.farms ?? [])
      }
    })
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-col flex-1 min-w-0 lg:ml-64 overflow-hidden">
        <Header user={user} farms={farms} onMenuClick={() => setSidebarOpen(true)} title={title} />
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6 max-w-screen-2xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
