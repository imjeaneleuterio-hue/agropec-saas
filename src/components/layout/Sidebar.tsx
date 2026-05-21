'use client'

import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { PlanKey } from '@/lib/plans'

const LOCKED_BY_PLAN: Record<string, PlanKey[]> = {
  '/reproducao': ['FREE'],
  '/sanitario':  ['FREE'],
  '/financeiro': ['FREE'],
  '/relatorios': ['FREE'],
  '/ia':         ['FREE'],
}

const NAV_GROUPS = [
  {
    title: 'Principal',
    items: [
      { label: 'Início',   href: '/dashboard', icon: '🏠' },
      { label: 'Alertas',  href: '/alertas',   icon: '🔔' },
    ],
  },
  {
    title: 'Rebanho',
    items: [
      { label: 'Animais',    href: '/rebanho',    icon: '🐄' },
      { label: 'Reprodução', href: '/reproducao', icon: '🗓️' },
      { label: 'Pesagem',    href: '/pesagem',    icon: '⚖️' },
      { label: 'Sanitário',  href: '/sanitario',  icon: '💉' },
    ],
  },
  {
    title: 'Produção',
    items: [
      { label: 'Leite',      href: '/leite',      icon: '🥛' },
      { label: 'Financeiro', href: '/financeiro', icon: '💰' },
      { label: 'Relatórios', href: '/relatorios', icon: '📊' },
    ],
  },
  {
    title: 'IA',
    items: [
      { label: 'IA Veterinária', href: '/ia', icon: '🤖' },
    ],
  },
]

const BOTTOM_ITEMS = [
  { label: 'Administração', href: '/admin',         icon: '⚙️' },
  { label: 'Configurações', href: '/configuracoes', icon: '🔧' },
]

interface SidebarProps {
  alertCount?: number
  isOpen?: boolean
  onClose?: () => void
  plan?: PlanKey
}

export function Sidebar({ alertCount = 0, isOpen = true, onClose, plan = 'FREE' }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  function isLocked(href: string) {
    return LOCKED_BY_PLAN[href]?.includes(plan) ?? false
  }

  function handleNav(href: string) {
    onClose?.()
    if (isLocked(href)) {
      router.push('/planos')
    } else {
      router.push(href)
    }
  }

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={onClose} />
      )}

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
        <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto scrollbar-thin">
          {NAV_GROUPS.map((group) => (
            <div key={group.title}>
              <p className="px-3 mb-1 text-[10px] font-semibold text-primary-500 uppercase tracking-widest">
                {group.title}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const locked = isLocked(item.href)
                  const active = isActive(item.href)
                  return (
                    <button
                      key={item.href}
                      onClick={() => handleNav(item.href)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 text-left',
                        active && !locked
                          ? 'bg-primary-700 text-white shadow-sm'
                          : locked
                          ? 'text-primary-500 hover:bg-primary-800/50 hover:text-primary-300'
                          : 'text-primary-200 hover:bg-primary-800 hover:text-white'
                      )}
                    >
                      <span className="text-base w-5 text-center">{item.icon}</span>
                      <span className="flex-1">{item.label}</span>
                      {item.href === '/alertas' && alertCount > 0 && !locked && (
                        <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                          {alertCount > 99 ? '99+' : alertCount}
                        </span>
                      )}
                      {locked && (
                        <span className="text-xs text-primary-500">🔒</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom */}
        <div className="px-3 pb-4 border-t border-primary-800 pt-3 space-y-0.5">
          {BOTTOM_ITEMS.map((item) => (
            <button
              key={item.href}
              onClick={() => handleNav(item.href)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 text-left',
                isActive(item.href)
                  ? 'bg-primary-700 text-white'
                  : 'text-primary-300 hover:bg-primary-800 hover:text-white'
              )}
            >
              <span className="text-base w-5 text-center">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
          {/* Link para planos sempre visível */}
          <button
            onClick={() => { onClose?.(); router.push('/planos') }}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 text-left',
              isActive('/planos')
                ? 'bg-primary-700 text-white'
                : 'text-primary-300 hover:bg-primary-800 hover:text-white'
            )}
          >
            <span className="text-base w-5 text-center">⭐</span>
            <span>Planos</span>
          </button>
        </div>
      </aside>
    </>
  )
}
