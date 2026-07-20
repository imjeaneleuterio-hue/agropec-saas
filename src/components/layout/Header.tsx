'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Menu, MapPin, ChevronDown, Check, Bell,
  Download, Settings, LogOut,
} from 'lucide-react'
import type { User } from '@/types'

interface Farm { id: string; name: string; city: string; state: string }
interface HeaderProps {
  user: User | null
  farms: Farm[]
  onMenuClick: () => void
  title?: string
}

export function Header({ user, farms, onMenuClick, title }: HeaderProps) {
  const router = useRouter()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [farmDropdownOpen, setFarmDropdownOpen] = useState(false)
  const [activeFarmId, setActiveFarmId] = useState<string>('')
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null)

  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setInstallPrompt(e) }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleInstall() {
    if (!installPrompt) return
    const prompt = installPrompt as Event & { prompt: () => void; userChoice: Promise<{ outcome: string }> }
    prompt.prompt()
    await prompt.userChoice
    setInstallPrompt(null)
  }

  useEffect(() => {
    const match = document.cookie.match(/jeleupec_farm=([^;]+)/)
    if (match) setActiveFarmId(match[1])
    else if (farms.length > 0) setActiveFarmId(farms[0].id)
  }, [farms])

  const activeFarm = farms.find((f) => f.id === activeFarmId) ?? farms[0]

  async function switchFarm(farmId: string) {
    await fetch('/api/fazenda/switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ farmId }),
    })
    setActiveFarmId(farmId)
    setFarmDropdownOpen(false)
    router.refresh()
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? 'U'

  return (
    <header className="h-16 bg-paper flex items-center justify-between px-4 lg:px-6 sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden w-10 h-10 rounded-[11px] border border-sand bg-white flex items-center justify-center text-muted-1 hover:bg-paper transition-colors"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        {title && <h1 className="font-display italic text-[26px] lg:text-[30px] text-ink hidden sm:block tracking-wide leading-none">{title}</h1>}
      </div>

      <div className="flex items-center gap-2">
        {/* Farm selector — multiple farms */}
        {farms.length > 1 && activeFarm && (
          <div className="relative">
            <button
              onClick={() => setFarmDropdownOpen(!farmDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-sand bg-white hover:bg-paper transition-colors text-sm"
            >
              <MapPin className="w-3.5 h-3.5 text-muted-3 shrink-0" />
              <span className="font-semibold text-ink max-w-[140px] truncate hidden sm:block">
                {activeFarm.name}
              </span>
              <span className="text-xs text-muted-3 hidden md:block">
                {activeFarm.city}/{activeFarm.state}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-muted-3" />
            </button>

            {farmDropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setFarmDropdownOpen(false)} />
                <div className="absolute left-0 top-12 w-64 bg-white rounded-2xl shadow-card-lg border border-sand py-1 z-20">
                  <p className="px-3 py-2 text-xs font-bold text-muted-3 uppercase tracking-wide border-b border-sand">
                    Suas fazendas
                  </p>
                  {farms.map((farm) => (
                    <button
                      key={farm.id}
                      onClick={() => switchFarm(farm.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-paper text-left ${
                        farm.id === activeFarmId ? 'text-primary-700' : 'text-muted-1'
                      }`}
                    >
                      <MapPin className="w-3.5 h-3.5 shrink-0 text-muted-3" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{farm.name}</p>
                        <p className="text-xs text-muted-3">{farm.city}/{farm.state}</p>
                      </div>
                      {farm.id === activeFarmId && (
                        <Check className="w-3.5 h-3.5 text-primary-600 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Single farm label */}
        {farms.length === 1 && activeFarm && (
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-sand text-sm">
            <MapPin className="w-3.5 h-3.5 text-muted-3 shrink-0" />
            <span className="font-semibold text-ink max-w-[160px] truncate">{activeFarm.name}</span>
          </div>
        )}

        {installPrompt && (
          <button
            onClick={handleInstall}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-gradient-card hover:opacity-90 text-white text-xs font-bold rounded-full transition-opacity"
          >
            <Download className="w-3.5 h-3.5" />
            Instalar App
          </button>
        )}

        <Link
          href="/alertas"
          className="relative w-10 h-10 rounded-[11px] border border-sand bg-white flex items-center justify-center text-muted-1 hover:bg-paper transition-colors"
        >
          <Bell className="w-5 h-5" />
        </Link>

        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 p-1.5 rounded-full hover:bg-white transition-colors"
          >
            <div className="w-9 h-9 bg-gradient-card rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-[0_3px_8px_rgba(22,163,74,0.3)]">
              {user?.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatar} alt={user.name} className="w-9 h-9 rounded-full object-cover" />
              ) : initials}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-bold text-ink leading-tight">{user?.name ?? 'Usuário'}</p>
              <p className="text-xs text-muted-3 leading-tight">{user?.email}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-muted-3 hidden md:block" />
          </button>

          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
              <div className="absolute right-0 top-12 w-52 bg-white rounded-2xl shadow-card-lg border border-sand py-1 z-20">
                <div className="px-3 py-2 border-b border-sand">
                  <p className="text-sm font-bold text-ink">{user?.name}</p>
                  <p className="text-xs text-muted-3">{user?.email}</p>
                </div>
                <Link
                  href="/configuracoes"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-sm text-muted-1 hover:bg-paper hover:text-ink transition-colors"
                >
                  <Settings className="w-4 h-4 text-muted-3" />
                  Configurações
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sair da conta
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
