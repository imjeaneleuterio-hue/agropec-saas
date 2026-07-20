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
      { label: 'Início',  href: '/dashboard', icon: Home,        iconBg: 'bg-white/10 text-primary-100' },
      { label: 'Alertas', href: '/alertas',   icon: Bell,        iconBg: 'bg-white/10 text-primary-100' },
    ],
  },
  {
    title: 'Rebanho',
    items: [
      { label: 'Animais',    href: '/rebanho',    icon: Tag,         iconBg: 'bg-white/10 text-primary-100' },
      { label: 'Bezerros',   href: '/bezerros',   icon: Heart,       iconBg: 'bg-white/10 text-primary-100' },
      { label: 'Reprodução', href: '/reproducao', icon: CalendarDays, iconBg: 'bg-white/10 text-primary-100' },
      { label: 'Pesagem',    href: '/pesagem',    icon: Scale,       iconBg: 'bg-white/10 text-primary-100' },
      { label: 'Sanitário',  href: '/sanitario',  icon: Syringe,     iconBg: 'bg-white/10 text-primary-100' },
    ],
  },
  {
    title: 'Produção',
    items: [
      { label: 'Leite',      href: '/leite',      icon: Droplets,   iconBg: 'bg-white/10 text-primary-100' },
      { label: 'Financeiro', href: '/financeiro', icon: TrendingUp, iconBg: 'bg-white/10 text-primary-100' },
      { label: 'Relatórios', href: '/relatorios', icon: BarChart2,  iconBg: 'bg-white/10 text-primary-100' },
    ],
  },
  {
    title: 'IA',
    items: [
      { label: 'IA Veterinária', href: '/ia', icon: Bot, iconBg: 'bg-white/10 text-primary-100' },
    ],
  },
]

const BOTTOM_ITEMS: NavItem[] = [
  { label: 'Administração', href: '/admin',         icon: ShieldCheck, iconBg: 'bg-white/10 text-primary-100' },
  { label: 'Configurações', href: '/configuracoes', icon: Settings,    iconBg: 'bg-white/10 text-primary-100' },
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
        'bg-gradient-sidebar',
        'lg:translate-x-0',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 pt-6 pb-5">
          <div className="w-[38px] h-[38px] rounded-xl bg-gradient-card flex items-center justify-center flex-shrink-0 shadow-[0_4px_10px_rgba(0,0,0,0.25)]">
            <Droplets className="w-5 h-5 text-[#0f3d21]" strokeWidth={2.4} />
          </div>
          <div>
            <div className="text-white font-display italic text-[22px] leading-none tracking-wide">Jeleupec</div>
            <div className="text-primary-200/70 text-[11px] font-medium mt-0.5">Gestão Pecuária</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3.5 pb-4 space-y-4 overflow-y-auto scrollbar-thin">
          {NAV_GROUPS.map((group) => (
            <div key={group.title}>
              <p className="px-3 mb-1.5 text-[10px] font-bold text-primary-200/50 uppercase tracking-widest">
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
                        'w-full flex items-center gap-0 pl-2.5 pr-3 py-2.5 rounded-[10px] text-sm transition-all duration-150 text-left border-l-[3px]',
                        active && !locked
                          ? 'bg-white/[0.08] text-white font-bold border-primary-400'
                          : locked
                          ? 'opacity-40 hover:opacity-60 font-semibold border-transparent'
                          : 'text-primary-100/80 hover:bg-white/[0.06] hover:text-white font-semibold border-transparent'
                      )}
                    >
                      <div className={cn(
                        'w-5 h-5 flex items-center justify-center shrink-0 mr-2.5',
                      )}>
                        <Icon className="w-[18px] h-[18px]" />
                      </div>
                      <span className="flex-1">{item.label}</span>
                      {item.href === '/alertas' && alertCount > 0 && !locked && (
                        <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                          {alertCount > 99 ? '99+' : alertCount}
                        </span>
                      )}
                      {locked && (
                        <Lock className="w-3 h-3 text-primary-200/60" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom */}
        <div className="px-3.5 pb-4 pt-2 space-y-0.5">
          {BOTTOM_ITEMS
            .filter((item) => item.href !== '/admin' || role === 'ADMIN' || role === 'SUPER_ADMIN')
            .map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <button
                  key={item.href}
                  onClick={() => handleNav(item.href)}
                  className={cn(
                    'w-full flex items-center gap-0 pl-2.5 pr-3 py-2.5 rounded-[10px] text-sm transition-all duration-150 text-left border-l-[3px]',
                    active
                      ? 'bg-white/[0.08] text-white font-bold border-primary-400'
                      : 'text-primary-100/80 hover:bg-white/[0.06] hover:text-white font-semibold border-transparent'
                  )}
                >
                  <div className="w-5 h-5 flex items-center justify-center shrink-0 mr-2.5">
                    <Icon className="w-[18px] h-[18px]" />
                  </div>
                  <span>{item.label}</span>
                </button>
              )
            })
          }
          <button
            onClick={() => { onClose?.(); router.push('/planos') }}
            className={cn(
              'w-full flex items-center gap-0 pl-2.5 pr-3 py-2.5 rounded-[10px] text-sm transition-all duration-150 text-left border-l-[3px]',
              isActive('/planos')
                ? 'bg-white/[0.08] text-white font-bold border-primary-400'
                : 'text-primary-100/80 hover:bg-white/[0.06] hover:text-white font-semibold border-transparent'
            )}
          >
            <div className="w-5 h-5 flex items-center justify-center shrink-0 mr-2.5">
              <Zap className="w-[18px] h-[18px]" />
            </div>
            <span>Planos</span>
          </button>
        </div>
      </aside>
    </>
  )
}
