'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { BREEDS_DAIRY, BREEDS_BEEF } from '@/lib/utils'

export default function NovoAnimalPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [form, setForm] = useState({
    tag: '', name: '', breed: '', sex: 'FEMALE', type: 'DAIRY',
    birthDate: '', status: 'ACTIVE', purchaseDate: '', purchasePrice: '',
    motherId: '', observations: '',
  })

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const breeds = form.type === 'DAIRY' ? BREEDS_DAIRY : BREEDS_BEEF

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      let photoUrl: string | undefined
      if (photo) {
        const fd = new FormData()
        fd.append('file', photo)
        const upRes = await fetch('/api/upload', { method: 'POST', body: fd })
        const upData = await upRes.json()
        photoUrl = upData.url
      }
      const res = await fetch('/api/animais', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, photoUrl }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Erro ao cadastrar animal'); return }
      router.push('/rebanho')
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/rebanho" className="btn-ghost p-2">←</Link>
        <div>
          <h1 className="page-title">Cadastrar Novo Animal</h1>
          <p className="text-gray-500 text-sm">Preencha os dados do animal</p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Photo */}
        <div className="card p-5">
          <h2 className="section-title mb-4">Foto do Animal</h2>
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 rounded-xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
              {photoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl">🐄</span>
              )}
            </div>
            <div>
              <label className="btn-secondary cursor-pointer">
                📷 Selecionar foto
                <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
              </label>
              <p className="text-xs text-gray-500 mt-2">JPG, PNG ou WebP. Máximo 5MB.</p>
            </div>
          </div>
        </div>

        {/* Basic Info */}
        <div className="card p-5">
          <h2 className="section-title mb-4">Informações Básicas</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Número/Brinco *</label>
              <input required placeholder="Ex: 047" className="input-field"
                value={form.tag} onChange={(e) => update('tag', e.target.value)} />
            </div>
            <div>
              <label className="label">Nome</label>
              <input placeholder="Ex: Mimosa" className="input-field"
                value={form.name} onChange={(e) => update('name', e.target.value)} />
            </div>
            <div>
              <label className="label">Tipo *</label>
              <select required className="input-field" value={form.type} onChange={(e) => update('type', e.target.value)}>
                <option value="DAIRY">Leiteiro</option>
                <option value="BEEF">Corte</option>
              </select>
            </div>
            <div>
              <label className="label">Sexo *</label>
              <select required className="input-field" value={form.sex} onChange={(e) => update('sex', e.target.value)}>
                <option value="FEMALE">Fêmea</option>
                <option value="MALE">Macho</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">Raça *</label>
              <select required className="input-field" value={form.breed} onChange={(e) => update('breed', e.target.value)}>
                <option value="">Selecione a raça</option>
                {breeds.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Data de Nascimento</label>
              <input type="date" className="input-field"
                value={form.birthDate} onChange={(e) => update('birthDate', e.target.value)} />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input-field" value={form.status} onChange={(e) => update('status', e.target.value)}>
                <option value="ACTIVE">Ativo</option>
                <option value="SOLD">Vendido</option>
                <option value="DEAD">Morto</option>
                <option value="TRANSFERRED">Transferido</option>
              </select>
            </div>
          </div>
        </div>

        {/* Acquisition */}
        <div className="card p-5">
          <h2 className="section-title mb-4">Aquisição</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Data de Compra</label>
              <input type="date" className="input-field"
                value={form.purchaseDate} onChange={(e) => update('purchaseDate', e.target.value)} />
            </div>
            <div>
              <label className="label">Valor de Compra (R$)</label>
              <input type="number" step="0.01" placeholder="0,00" className="input-field"
                value={form.purchasePrice} onChange={(e) => update('purchasePrice', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Observations */}
        <div className="card p-5">
          <h2 className="section-title mb-4">Observações</h2>
          <textarea rows={3} placeholder="Notas adicionais sobre o animal..."
            className="input-field resize-none"
            value={form.observations} onChange={(e) => update('observations', e.target.value)} />
        </div>

        <div className="flex gap-3">
          <Link href="/rebanho" className="btn-secondary flex-1 justify-center py-3">Cancelar</Link>
          <button type="submit" disabled={loading} className="btn-primary flex-1 py-3">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Salvando...
              </span>
            ) : '✓ Cadastrar Animal'}
          </button>
        </div>
      </form>
    </div>
  )
}
