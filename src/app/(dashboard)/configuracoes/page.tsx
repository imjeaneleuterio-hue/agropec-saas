'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { STATES_BR, LABELS, formatDate } from '@/lib/utils'
import { usePushNotifications } from '@/hooks/usePushNotifications'

type UserData = {
  id: string; name: string; email: string; role: string;
  phone?: string; cpf?: string;
  subscription?: { plan: string; status: string; endDate?: string } | null
}
type FarmData = {
  id: string; name: string; cnpj?: string; address?: string;
  city: string; state: string; cep?: string; hectares?: number; type: string
}

export default function ConfiguracoesPage() {
  const router = useRouter()
  const push = usePushNotifications()
  const [activeTab, setActiveTab] = useState(0)
  const [user, setUser] = useState<UserData | null>(null)
  const [farm, setFarm] = useState<FarmData | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const deleteInputRef = useRef<HTMLInputElement>(null)

  // Profile form
  const [profileForm, setProfileForm] = useState({ name: '', phone: '', cpf: '' })
  // Farm form
  const [farmForm, setFarmForm] = useState({ name: '', cnpj: '', address: '', city: '', state: '', cep: '', hectares: '', type: 'MIXED' })
  // Password form
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwSaved, setPwSaved] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then((r) => r.json()),
      fetch('/api/fazenda').then((r) => r.json()),
    ]).then(([u, f]) => {
      if (u.data) {
        setUser(u.data)
        setProfileForm({ name: u.data.name ?? '', phone: u.data.phone ?? '', cpf: u.data.cpf ?? '' })
      }
      if (f.data) {
        setFarm(f.data)
        setFarmForm({
          name: f.data.name ?? '',
          cnpj: f.data.cnpj ?? '',
          address: f.data.address ?? '',
          city: f.data.city ?? '',
          state: f.data.state ?? '',
          cep: f.data.cep ?? '',
          hectares: f.data.hectares?.toString() ?? '',
          type: f.data.type ?? 'MIXED',
        })
      }
    }).catch(() => {})
  }, [])

  function showSaved() { setSaved(true); setTimeout(() => setSaved(false), 3000) }

  async function changePassword() {
    setPwError('')
    if (!pwForm.current) { setPwError('Informe a senha atual'); return }
    if (pwForm.next.length < 6) { setPwError('Nova senha deve ter pelo menos 6 caracteres'); return }
    if (pwForm.next !== pwForm.confirm) { setPwError('As senhas não conferem'); return }
    setPwSaving(true)
    try {
      const res = await fetch('/api/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pwForm),
      })
      const data = await res.json()
      if (!res.ok) { setPwError(data.error ?? 'Erro ao alterar senha'); return }
      setPwSaved(true)
      setPwForm({ current: '', next: '', confirm: '' })
      setTimeout(() => setPwSaved(false), 3000)
    } catch {
      setPwError('Erro de conexão. Tente novamente.')
    } finally {
      setPwSaving(false)
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true)
    setDeleteError('')
    try {
      const res = await fetch('/api/auth/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: deletePassword }),
      })
      const data = await res.json()
      if (!res.ok) { setDeleteError(data.error ?? 'Erro ao excluir conta.'); setDeleting(false); return }
      router.push('/login')
    } catch {
      setDeleteError('Erro de conexão.')
      setDeleting(false)
    }
  }

  async function saveProfile() {
    setSaving(true); setError('')
    const res = await fetch('/api/auth/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: profileForm.name, phone: profileForm.phone || undefined, cpf: profileForm.cpf || undefined }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Erro ao salvar'); setSaving(false); return }
    setUser((u) => u ? { ...u, ...data.data } : u)
    showSaved()
    setSaving(false)
  }

  async function saveFarm() {
    setSaving(true); setError('')
    const res = await fetch('/api/fazenda', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: farmForm.name || undefined,
        cnpj: farmForm.cnpj || undefined,
        address: farmForm.address || undefined,
        city: farmForm.city || undefined,
        state: farmForm.state || undefined,
        cep: farmForm.cep || undefined,
        hectares: farmForm.hectares ? Number(farmForm.hectares) : undefined,
        type: farmForm.type,
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Erro ao salvar'); setSaving(false); return }
    showSaved()
    setSaving(false)
  }

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  const planLabel = LABELS.plan[user?.subscription?.plan as keyof typeof LABELS.plan] ?? 'Gratuito'

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="page-title">Configurações</h1>
        <p className="text-gray-500 text-sm">Gerencie sua conta e preferências</p>
      </div>

      {saved && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          ✓ Salvo com sucesso!
        </div>
      )}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="border-b border-gray-200">
        <div className="flex gap-0 flex-wrap">
          {['Meu Perfil', 'Minha Fazenda', 'Plano', 'Segurança', 'Notificações'].map((tab, i) => (
            <button key={tab} onClick={() => { setActiveTab(i); setError('') }}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === i ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 0 && (
        <div className="card p-6 space-y-5">
          <h2 className="section-title">Informações Pessoais</h2>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-card rounded-full flex items-center justify-center text-white font-bold text-xl">
              {initials}
            </div>
            <div>
              <p className="font-medium text-gray-900">{user?.name ?? '—'}</p>
              <p className="text-sm text-gray-500">{user?.email}</p>
              <p className="text-xs text-gray-400 mt-0.5">{LABELS.role[user?.role as keyof typeof LABELS.role] ?? user?.role}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="label">Nome completo</label>
              <input className="input-field" value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="label">E-mail</label>
              <input type="email" className="input-field bg-gray-50" value={user?.email ?? ''} disabled />
            </div>
            <div>
              <label className="label">Telefone</label>
              <input className="input-field" placeholder="(XX) 9XXXX-XXXX" value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} />
            </div>
            <div>
              <label className="label">CPF</label>
              <input className="input-field" placeholder="000.000.000-00" value={profileForm.cpf}
                onChange={(e) => setProfileForm({ ...profileForm, cpf: e.target.value })} />
            </div>
          </div>
          <button onClick={saveProfile} disabled={saving} className="btn-primary">
            {saving ? 'Salvando...' : 'Salvar Perfil'}
          </button>
        </div>
      )}

      {activeTab === 1 && (
        <div className="card p-6 space-y-5">
          <h2 className="section-title">Dados da Fazenda</h2>
          {!farm ? (
            <p className="text-gray-400 text-sm text-center py-8">Nenhuma fazenda cadastrada na conta.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="label">Nome da Fazenda</label>
                  <input className="input-field" value={farmForm.name}
                    onChange={(e) => setFarmForm({ ...farmForm, name: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <label className="label">CNPJ / CPF</label>
                  <input className="input-field" placeholder="00.000.000/0000-00" value={farmForm.cnpj}
                    onChange={(e) => setFarmForm({ ...farmForm, cnpj: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <label className="label">Endereço</label>
                  <input className="input-field" placeholder="Rodovia, Km..." value={farmForm.address}
                    onChange={(e) => setFarmForm({ ...farmForm, address: e.target.value })} />
                </div>
                <div>
                  <label className="label">Cidade</label>
                  <input className="input-field" value={farmForm.city}
                    onChange={(e) => setFarmForm({ ...farmForm, city: e.target.value })} />
                </div>
                <div>
                  <label className="label">Estado</label>
                  <select className="input-field" value={farmForm.state}
                    onChange={(e) => setFarmForm({ ...farmForm, state: e.target.value })}>
                    <option value="">Selecione</option>
                    {STATES_BR.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">CEP</label>
                  <input className="input-field" placeholder="00000-000" value={farmForm.cep}
                    onChange={(e) => setFarmForm({ ...farmForm, cep: e.target.value })} />
                </div>
                <div>
                  <label className="label">Área (hectares)</label>
                  <input type="number" min="0" step="0.1" className="input-field" value={farmForm.hectares}
                    onChange={(e) => setFarmForm({ ...farmForm, hectares: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <label className="label">Tipo de Pecuária</label>
                  <select className="input-field" value={farmForm.type}
                    onChange={(e) => setFarmForm({ ...farmForm, type: e.target.value })}>
                    <option value="DAIRY">Leiteira</option>
                  </select>
                </div>
              </div>
              <button onClick={saveFarm} disabled={saving} className="btn-primary">
                {saving ? 'Salvando...' : 'Salvar Fazenda'}
              </button>
            </>
          )}
        </div>
      )}

      {activeTab === 2 && (
        <div className="space-y-4">
          <div className="card p-6">
            <h2 className="section-title mb-4">Plano Atual</h2>
            {user?.subscription ? (
              <div className="flex items-center gap-4 p-4 bg-primary-50 border-2 border-primary-200 rounded-xl">
                <div className="text-3xl">⭐</div>
                <div>
                  <p className="font-bold text-primary-700 text-lg">{planLabel}</p>
                  {user.subscription.endDate && (
                    <p className="text-sm text-gray-600">Renova em {formatDate(user.subscription.endDate)}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-0.5">
                    Status: {user.subscription.status === 'ACTIVE' ? 'Ativo' : user.subscription.status}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                <p className="text-gray-600 font-medium">Plano Gratuito</p>
                <p className="text-sm text-gray-500 mt-1">Sem assinatura ativa.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 3 && (
        <div className="card p-6 space-y-5">
          <h2 className="section-title">Segurança da Conta</h2>
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Alterar Senha</h3>
            {pwSaved && (
              <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                ✓ Senha alterada com sucesso!
              </div>
            )}
            {pwError && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {pwError}
              </div>
            )}
            <div className="space-y-3">
              <div>
                <label className="label">Senha atual</label>
                <input type="password" placeholder="••••••••" className="input-field"
                  value={pwForm.current} onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })} />
              </div>
              <div>
                <label className="label">Nova senha</label>
                <input type="password" placeholder="Mínimo 6 caracteres" className="input-field"
                  value={pwForm.next} onChange={(e) => setPwForm({ ...pwForm, next: e.target.value })} />
              </div>
              <div>
                <label className="label">Confirmar nova senha</label>
                <input type="password" placeholder="Repita a nova senha" className="input-field"
                  value={pwForm.confirm} onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })} />
              </div>
            </div>
            <button
              onClick={changePassword}
              disabled={pwSaving}
              className="btn-primary mt-4"
            >
              {pwSaving ? 'Salvando...' : 'Alterar Senha'}
            </button>
          </div>

          <div className="pt-4 border-t border-red-100">
            <h3 className="text-sm font-semibold text-red-600 mb-1">Zona de perigo</h3>
            <p className="text-xs text-gray-500 mb-3">
              Excluir sua conta remove permanentemente todos os seus dados, animais e registros. Esta ação não pode ser desfeita.
            </p>
            <button
              onClick={() => { setDeleteConfirm(true); setDeleteError(''); setDeletePassword(''); setTimeout(() => deleteInputRef.current?.focus(), 100) }}
              className="px-4 py-2 text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
            >
              🗑️ Excluir minha conta
            </button>
          </div>
        </div>
      )}

      {activeTab === 4 && (
        <div className="card p-6 space-y-5">
          <div>
            <h2 className="section-title">Notificações Push</h2>
            <p className="text-sm text-gray-500 mt-1">
              Receba alertas de parto, vacinação e cio diretamente no seu celular, mesmo com o app fechado.
            </p>
          </div>

          {!push.supported && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 text-sm">
              Seu navegador não suporta notificações push. Use o Chrome ou Safari no iOS 16.4+.
            </div>
          )}

          {push.supported && push.permission === 'denied' && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              Notificações bloqueadas pelo navegador. Clique no cadeado na barra de endereço e permita notificações.
            </div>
          )}

          {push.error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {push.error}
            </div>
          )}

          {push.supported && push.permission !== 'denied' && (
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div>
                <p className="font-medium text-gray-900 text-sm">
                  {push.subscribed ? 'Notificações ativas' : 'Notificações desativadas'}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {push.subscribed
                    ? 'Você receberá alertas de parto, cio e vacinação.'
                    : 'Ative para receber alertas no celular.'}
                </p>
              </div>
              <button
                onClick={push.subscribed ? push.unsubscribe : push.subscribe}
                disabled={push.loading}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
                  push.subscribed ? 'bg-primary-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    push.subscribed ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          )}

          {push.subscribed && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Tipos de alerta</p>
              {[
                { icon: '🐄', label: 'Parto previsto', desc: 'Aviso quando um parto está próximo' },
                { icon: '💉', label: 'Vacinação e sanitário', desc: 'Lembretes de retorno e próximas doses' },
                { icon: '🔁', label: 'Previsão de cio', desc: 'Ciclo estral e retorno ao cio pós-parto' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3 p-3 bg-green-50 border border-green-100 rounded-lg">
                  <span className="text-lg">{item.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{item.label}</p>
                    <p className="text-xs text-gray-500">{item.desc}</p>
                  </div>
                  <span className="ml-auto text-xs text-green-600 font-medium">Ativo</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Excluir conta?</h2>
            <p className="text-gray-500 text-sm mb-4">
              Esta ação é permanente e não pode ser desfeita. Digite sua senha para confirmar.
            </p>
            {deleteError && (
              <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{deleteError}</div>
            )}
            <input
              ref={deleteInputRef}
              type="password"
              placeholder="Sua senha"
              className="input-field mb-4"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
            />
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(false)} className="btn-secondary flex-1">Cancelar</button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting || !deletePassword}
                className="flex-1 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm"
              >
                {deleting ? 'Excluindo...' : 'Excluir conta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
