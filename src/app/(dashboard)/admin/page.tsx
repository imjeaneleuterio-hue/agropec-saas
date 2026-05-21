'use client'

import { useState, useEffect } from 'react'
import { formatDate, formatCurrency } from '@/lib/utils'

const PLAN_COLORS: Record<string, string> = {
  FREE:    'bg-gray-100 text-gray-600',
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
        <p className="text-gray-500 text-sm">Gestão de usuários, fazendas e plataforma</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className={`stat-card ${s.highlight ? 'border border-green-200 bg-green-50' : ''}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${s.highlight ? 'bg-green-100' : 'bg-primary-50'}`}>
              {s.icon}
            </div>
            <div>
              <p className={`text-2xl font-bold ${s.highlight ? 'text-green-700' : 'text-gray-900'}`}>
                {loading ? '...' : s.value}
              </p>
              <p className="text-xs text-gray-500">{s.label}</p>
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
          <span className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 font-medium">
            {stats.users - stats.pro - stats.premium} usuário{(stats.users - stats.pro - stats.premium) !== 1 ? 's' : ''} gratuito{(stats.users - stats.pro - stats.premium) !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      <div className="border-b border-gray-200">
        <div className="flex gap-0">
          {['Usuários', 'Sistema'].map((tab, i) => (
            <button key={tab} onClick={() => setActiveTab(i)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === i ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 0 && (
        <div className="card overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-400 text-sm">Carregando...</div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-sm">Nenhum usuário encontrado.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Usuário</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium hidden md:table-cell">Perfil</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium hidden sm:table-cell">Plano</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium hidden lg:table-cell">Fazendas</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Status</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium hidden xl:table-cell">Cadastro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold text-xs flex-shrink-0">
                            {user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{user.name}</p>
                            <p className="text-xs text-gray-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
                        {ROLE_LABELS[user.role] ?? user.role}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className={`badge ${PLAN_COLORS[user.plan] ?? 'bg-gray-100 text-gray-600'}`}>
                          {PLAN_LABELS[user.plan] ?? user.plan}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">{user.farms}</td>
                      <td className="px-4 py-3">
                        <span className={`badge ${user.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {user.isActive ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs hidden xl:table-cell">
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
              <div key={item.label} className="flex justify-between py-2 border-b border-gray-100 last:border-0">
                <span className="text-sm text-gray-500">{item.label}</span>
                <span className="text-sm font-medium text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
