'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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

  useEffect(() => {
    // Read the farm cookie (httpOnly: false so JS can read it)
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
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600"
          aria-label="Toggle menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        {title && <h1 className="text-lg font-semibold text-gray-900 hidden sm:block">{title}</h1>}
      </div>

      <div className="flex items-center gap-3">
        {/* Farm selector — only shows when user has multiple farms */}
        {farms.length > 1 && activeFarm && (
          <div className="relative">
            <button
              onClick={() => setFarmDropdownOpen(!farmDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-sm"
            >
              <span className="text-base">🏡</span>
              <span className="font-medium text-gray-800 max-w-[140px] truncate hidden sm:block">
                {activeFarm.name}
              </span>
              <span className="text-xs text-gray-400 hidden md:block">
                {activeFarm.city}/{activeFarm.state}
              </span>
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {farmDropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setFarmDropdownOpen(false)} />
                <div className="absolute left-0 top-12 w-64 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20">
                  <p className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100">
                    Suas fazendas
                  </p>
                  {farms.map((farm) => (
                    <button
                      key={farm.id}
                      onClick={() => switchFarm(farm.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-gray-50 text-left ${
                        farm.id === activeFarmId ? 'bg-primary-50 text-primary-700' : 'text-gray-700'
                      }`}
                    >
                      <span className="text-base">🏡</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{farm.name}</p>
                        <p className="text-xs text-gray-400">{farm.city}/{farm.state}</p>
                      </div>
                      {farm.id === activeFarmId && (
                        <span className="text-primary-600 text-xs font-bold">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Single farm label (no switcher) */}
        {farms.length === 1 && activeFarm && (
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-sm">
            <span className="text-base">🏡</span>
            <span className="font-medium text-gray-700 max-w-[160px] truncate">{activeFarm.name}</span>
          </div>
        )}

        <Link href="/alertas"
          className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </Link>

        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="w-8 h-8 bg-gradient-card rounded-full flex items-center justify-center text-white text-sm font-bold">
              {user?.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
              ) : initials}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-gray-900 leading-tight">{user?.name ?? 'Usuário'}</p>
              <p className="text-xs text-gray-500 leading-tight">{user?.email}</p>
            </div>
            <svg className="w-4 h-4 text-gray-400 hidden md:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
              <div className="absolute right-0 top-12 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20">
                <div className="px-3 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
                <Link href="/configuracoes" onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  ⚙️ Configurações
                </Link>
                <button onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                  🚪 Sair da conta
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
