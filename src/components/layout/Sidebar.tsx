'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface NavItem {
  label: string
  href: string
  icon: string
  badge?: number
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: '⬛' },
  { label: 'Rebanho', href: '/rebanho', icon: '🐄' },
  { label: 'Controle Leiteiro', href: '/leite', icon: '🥛' },
  { label: 'Reprodução', href: '/reproducao', icon: '🗓️' },
  { label: 'Sanitário', href: '/sanitario', icon: '💉' },
  { label: 'Pesagem', href: '/pesagem', icon: '⚖️' },
  { label: 'Financeiro', href: '/financeiro', icon: '💰' },
  { label: 'Alertas', href: '/alertas', icon: '🔔' },
  { label: 'Relatórios', href: '/relatorios', icon: '📊' },
]

const BOTTOM_ITEMS: NavItem[] = [
  { label: 'Administração', href: '/admin', icon: '⚙️' },
  { label: 'Configurações', href: '/configuracoes', icon: '🔧' },
]

interface SidebarProps {
  alertCount?: number
  isOpen?: boolean
  onClose?: () => void
}

export function Sidebar({ alertCount = 0, isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed top-0 left-0 h-full w-64 bg-primary-950 z-30 flex flex-col transition-transform duration-300',
        'lg:translate-x-0',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-primary-800">
          <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-white font-extrabold text-sm">JE</span>
          </div>
          <div>
            <div className="text-white font-bold text-sm leading-tight">J.ELEUPEC</div>
            <div className="text-primary-400 text-xs">Gestão Pecuária</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scrollbar-thin">
          <p className="px-3 py-2 text-xs font-semibold text-primary-500 uppercase tracking-wider">Menu Principal</p>
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                isActive(item.href)
                  ? 'bg-primary-700 text-white shadow-sm'
                  : 'text-primary-200 hover:bg-primary-800 hover:text-white'
              )}
            >
              <span className="text-base w-5 text-center">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.href === '/alertas' && alertCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {alertCount > 99 ? '99+' : alertCount}
                </span>
              )}
            </Link>
          ))}
        </nav>

        {/* Bottom */}
        <div className="px-3 pb-4 border-t border-primary-800 pt-3 space-y-0.5">
          {BOTTOM_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                isActive(item.href)
                  ? 'bg-primary-700 text-white'
                  : 'text-primary-300 hover:bg-primary-800 hover:text-white'
              )}
            >
              <span className="text-base w-5 text-center">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </aside>
    </>
  )
}
