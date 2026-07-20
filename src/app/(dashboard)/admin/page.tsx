'use client'

import { useState, useEffect } from 'react'
import { formatDate, formatCurrency } from '@/lib/utils'

const PLAN_COLORS: Record<string, string> = {
  FREE:    'bg-paper text-muted-2',
  PRO:     'bg-blue-100 text-blue-700',
  PREMIUM: 'bg-yellow-100 text-yellow-700',
}

const PLAN_LABELS: Record<string, string> = {
  FREE:    'Gratuito',
  PRO:     'Pro',
  PREMIUM: 'Premium',
}

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  PRODUCER: 'Produtor',
  VETERINARIAN: 'Veterinário',
  EMPLOYEE: 'Funcionário',
}

type UserRow = {
  id: string; name: string; email: string; role: string;
  farms: number; plan: string; isActive: boolean; createdAt: string
}

type Stats = {
  users: number; farms: number; animals: number
  revenue: number; pro: number; premium: number
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState(0)
  const [stats, setStats] = useState<Stats | null>(null)
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/stats').then((r) => r.json()),
      fetch('/api/admin/users').then((r) => r.json()),
    ]).then(([s, u]) => {
      if (s.data) setStats(s.data)
      if (Array.isArray(u.data)) setUsers(u.data)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const statCards = [
    { label: 'Usuários Ativos',      value: stats?.users ?? '—',                        icon: '👥' },
    { label: 'Fazendas Cadastradas', value: stats?.farms ?? '—',                        icon: '🏡' },
    { label: 'Animais no Sistema',   value: stats?.animals ?? '—',                      icon: '🐄' },
    { label: 'Receita Estimada/mês', value: stats ? formatCurrency(stats.revenue) : '—', icon: '💰', highlight: true },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Área Administrativa</h1>
        <p className="text-muted-3 text-sm">Gestão de usuários, fazendas e plataforma</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className={`stat-card ${s.highlight ? 'border border-green-200 bg-green-50' : ''}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${s.highlight ? 'bg-green-100' : 'bg-primary-50'}`}>
              {s.icon}
            </div>
            <div>
              <p className={`text-2xl font-bold ${s.highlight ? 'text-green-700' : 'text-ink'}`}>
                {loading ? '...' : s.value}
              </p>
              <p className="text-xs text-muted-3">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {stats && !loading && (
        <div className="flex gap-3 flex-wrap">
          <span className="px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 font-medium">
            {stats.pro} assinante{stats.pro !== 1 ? 's' : ''} Pro
          </span>
          <span className="px-3 py-1.5 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700 font-medium">
            {stats.premium} assinante{stats.premium !== 1 ? 's' : ''} Premium
          </span>
          <span className="px-3 py-1.5 bg-paper border border-sand rounded-lg text-sm text-muted-2 font-medium">
            {stats.users - stats.pro - stats.premium} usuário{(stats.users - stats.pro - stats.premium) !== 1 ? 's' : ''} gratuito{(stats.users - stats.pro - stats.premium) !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      <div className="border-b border-sand">
        <div className="flex gap-0">
          {['Usuários', 'Sistema'].map((tab, i) => (
            <button key={tab} onClick={() => setActiveTab(i)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === i ? 'border-primary-600 text-primary-700' : 'border-transparent text-muted-3 hover:text-muted-1'
              }`}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 0 && (
        <div className="card overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-muted-4 text-sm">Carregando...</div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center text-muted-4 text-sm">Nenhum usuário encontrado.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-paper">
                    <th className="text-left px-4 py-3 text-muted-2 font-medium">Usuário</th>
                    <th className="text-left px-4 py-3 text-muted-2 font-medium hidden md:table-cell">Perfil</th>
                    <th className="text-left px-4 py-3 text-muted-2 font-medium hidden sm:table-cell">Plano</th>
                    <th className="text-left px-4 py-3 text-muted-2 font-medium hidden lg:table-cell">Fazendas</th>
                    <th className="text-left px-4 py-3 text-muted-2 font-medium">Status</th>
                    <th className="text-left px-4 py-3 text-muted-2 font-medium hidden xl:table-cell">Cadastro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-paper">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-paper">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold text-xs flex-shrink-0">
                            {user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-ink">{user.name}</p>
                            <p className="text-xs text-muted-3">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-2 hidden md:table-cell">
                        {ROLE_LABELS[user.role] ?? user.role}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className={`badge ${PLAN_COLORS[user.plan] ?? 'bg-paper text-muted-2'}`}>
                          {PLAN_LABELS[user.plan] ?? user.plan}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-2 hidden lg:table-cell">{user.farms}</td>
                      <td className="px-4 py-3">
                        <span className={`badge ${user.isActive ? 'bg-green-100 text-green-700' : 'bg-paper text-muted-3'}`}>
                          {user.isActive ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-3 text-xs hidden xl:table-cell">
                        {formatDate(user.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 1 && (
        <div className="card p-5">
          <h3 className="section-title mb-4">Informações do Sistema</h3>
          <div className="space-y-3">
            {[
              { label: 'Nome do Sistema',  value: 'J.ELEUPEC' },
              { label: 'Versão',           value: '1.0.0' },
              { label: 'Banco de Dados',   value: 'Supabase (PostgreSQL)' },
              { label: 'Hospedagem',       value: 'Vercel' },
              { label: 'Pagamentos',       value: 'Mercado Pago' },
            ].map((item) => (
              <div key={item.label} className="flex justify-between py-2 border-b border-paper last:border-0">
                <span className="text-sm text-muted-3">{item.label}</span>
                <span className="text-sm font-medium text-ink">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
