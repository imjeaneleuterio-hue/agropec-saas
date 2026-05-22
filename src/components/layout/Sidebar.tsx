'use client'

import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { PlanKey } from '@/lib/plans'
import {
  Home, Bell, Tag, Heart, CalendarDays, Scale, Syringe,
  Droplets, TrendingUp, BarChart2, Bot, ShieldCheck,
  Settings, Zap, Lock,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const LOCKED_BY_PLAN: Record<string, PlanKey[]> = {
  '/reproducao': ['FREE'],
  '/sanitario':  ['FREE'],
  '/financeiro': ['FREE'],
  '/relatorios': ['FREE'],
  '/ia':         ['FREE'],
}

interface NavItem {
  label: string
  href: string
  icon: LucideIcon
}

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Principal',
    items: [
      { label: 'Início',  href: '/dashboard', icon: Home },
      { label: 'Alertas', href: '/alertas',   icon: Bell },
    ],
  },
  {
    title: 'Rebanho',
    items: [
      { label: 'Animais',    href: '/rebanho',    icon: Tag },
      { label: 'Bezerros',   href: '/bezerros',   icon: Heart },
      { label: 'Reprodução', href: '/reproducao', icon: CalendarDays },
      { label: 'Pesagem',    href: '/pesagem',    icon: Scale },
      { label: 'Sanitário',  href: '/sanitario',  icon: Syringe },
    ],
  },
  {
    title: 'Produção',
    items: [
      { label: 'Leite',      href: '/leite',      icon: Droplets },
      { label: 'Financeiro', href: '/financeiro', icon: TrendingUp },
      { label: 'Relatórios', href: '/relatorios', icon: BarChart2 },
    ],
  },
  {
    title: 'IA',
    items: [
      { label: 'IA Veterinária', href: '/ia', icon: Bot },
    ],
  },
]

const BOTTOM_ITEMS: NavItem[] = [
  { label: 'Administração', href: '/admin',         icon: ShieldCheck },
  { label: 'Configurações', href: '/configuracoes', icon: Settings },
]

interface SidebarProps {
  alertCount?: number
  isOpen?: boolean
  onClose?: () => void
  plan?: PlanKey
  role?: string
}

export function Sidebar({ alertCount = 0, isOpen = true, onClose, plan = 'FREE', role }: SidebarProps) {
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
    router.push(href)
  }

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 z-20 lg:hidden backdrop-blur-sm" onClick={onClose} />
      )}

      <aside className={cn(
        'fixed top-0 left-0 h-full w-64 z-30 flex flex-col transition-transform duration-300',
        'bg-slate-950 border-r border-slate-800/60',
        'lg:translate-x-0',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800/60">
          <div className="w-9 h-9 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-emerald-400 font-extrabold text-xs tracking-tight">JE</span>
          </div>
          <div>
            <div className="text-white font-bold text-sm leading-tight tracking-wide">J.ELEUPEC</div>
            <div className="text-slate-500 text-xs">Gestão Pecuária</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto scrollbar-thin">
          {NAV_GROUPS.map((group) => (
            <div key={group.title}>
              <p className="px-3 mb-1.5 text-[10px] font-semibold text-slate-600 uppercase tracking-widest">
                {group.title}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const locked = isLocked(item.href)
                  const active = isActive(item.href)
                  const Icon = item.icon
                  return (
                    <button
                      key={item.href}
                      onClick={() => handleNav(item.href)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 text-left',
                        active && !locked
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : locked
                          ? 'text-slate-600 hover:bg-slate-800/50 hover:text-slate-400'
                          : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                      )}
                    >
                      <Icon className={cn(
                        'w-4 h-4 shrink-0',
                        active && !locked ? 'text-emerald-400' : locked ? 'text-slate-600' : 'text-slate-500'
                      )} />
                      <span className="flex-1">{item.label}</span>
                      {item.href === '/alertas' && alertCount > 0 && !locked && (
                        <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                          {alertCount > 99 ? '99+' : alertCount}
                        </span>
                      )}
                      {locked && (
                        <Lock className="w-3 h-3 text-slate-600" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom */}
        <div className="px-3 pb-4 border-t border-slate-800/60 pt-3 space-y-0.5">
          {BOTTOM_ITEMS
            .filter((item) => item.href !== '/admin' || role === 'ADMIN' || role === 'SUPER_ADMIN')
            .map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.href}
                  onClick={() => handleNav(item.href)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 text-left',
                    isActive(item.href)
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  )}
                >
                  <Icon className={cn('w-4 h-4 shrink-0', isActive(item.href) ? 'text-emerald-400' : 'text-slate-500')} />
                  <span>{item.label}</span>
                </button>
              )
            })
          }
          <button
            onClick={() => { onClose?.(); router.push('/planos') }}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 text-left',
              isActive('/planos')
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
            )}
          >
            <Zap className={cn('w-4 h-4 shrink-0', isActive('/planos') ? 'text-emerald-400' : 'text-slate-500')} />
            <span>Planos</span>
          </button>
        </div>
      </aside>
    </>
  )
}
