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
  iconBg: string   // bg + text color classes for the icon pill
}

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Principal',
    items: [
      { label: 'Início',  href: '/dashboard', icon: Home,        iconBg: 'bg-slate-700 text-slate-300' },
      { label: 'Alertas', href: '/alertas',   icon: Bell,        iconBg: 'bg-red-500/20 text-red-400' },
    ],
  },
  {
    title: 'Rebanho',
    items: [
      { label: 'Animais',    href: '/rebanho',    icon: Tag,         iconBg: 'bg-emerald-500/20 text-emerald-400' },
      { label: 'Bezerros',   href: '/bezerros',   icon: Heart,       iconBg: 'bg-pink-500/20 text-pink-400' },
      { label: 'Reprodução', href: '/reproducao', icon: CalendarDays, iconBg: 'bg-violet-500/20 text-violet-400' },
      { label: 'Pesagem',    href: '/pesagem',    icon: Scale,       iconBg: 'bg-amber-500/20 text-amber-400' },
      { label: 'Sanitário',  href: '/sanitario',  icon: Syringe,     iconBg: 'bg-cyan-500/20 text-cyan-400' },
    ],
  },
  {
    title: 'Produção',
    items: [
      { label: 'Leite',      href: '/leite',      icon: Droplets,   iconBg: 'bg-sky-500/20 text-sky-400' },
      { label: 'Financeiro', href: '/financeiro', icon: TrendingUp, iconBg: 'bg-yellow-500/20 text-yellow-400' },
      { label: 'Relatórios', href: '/relatorios', icon: BarChart2,  iconBg: 'bg-indigo-500/20 text-indigo-400' },
    ],
  },
  {
    title: 'IA',
    items: [
      { label: 'IA Veterinária', href: '/ia', icon: Bot, iconBg: 'bg-purple-500/20 text-purple-400' },
    ],
  },
]

const BOTTOM_ITEMS: NavItem[] = [
  { label: 'Administração', href: '/admin',         icon: ShieldCheck, iconBg: 'bg-slate-700 text-slate-300' },
  { label: 'Configurações', href: '/configuracoes', icon: Settings,    iconBg: 'bg-slate-700 text-slate-300' },
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
                        'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 text-left',
                        active && !locked
                          ? 'bg-white/5 text-white'
                          : locked
                          ? 'opacity-40 hover:opacity-60'
                          : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                      )}
                    >
                      <div className={cn(
                        'w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-opacity',
                        locked ? 'opacity-50' : '',
                        item.iconBg
                      )}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
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
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 text-left',
                    isActive(item.href)
                      ? 'bg-white/5 text-white'
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                  )}
                >
                  <div className={cn('w-6 h-6 rounded-md flex items-center justify-center shrink-0', item.iconBg)}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span>{item.label}</span>
                </button>
              )
            })
          }
          <button
            onClick={() => { onClose?.(); router.push('/planos') }}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 text-left',
              isActive('/planos')
                ? 'bg-white/5 text-white'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
            )}
          >
            <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 bg-yellow-500/20 text-yellow-400">
              <Zap className="w-3.5 h-3.5" />
            </div>
            <span>Planos</span>
          </button>
        </div>
      </aside>
    </>
  )
}
