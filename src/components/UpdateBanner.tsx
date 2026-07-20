'use client'

import { useEffect, useState } from 'react'

export function UpdateBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'SW_UPDATED') setShow(true)
    }
    navigator.serviceWorker.addEventListener('message', handler)
    return () => navigator.serviceWorker.removeEventListener('message', handler)
  }, [])

  if (!show) return null

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-gradient-sidebar text-white px-4 py-3 rounded-2xl shadow-card-lg text-sm font-semibold">
      <span>🆕 Nova versão disponível</span>
      <button
        onClick={() => window.location.reload()}
        className="bg-gradient-card hover:opacity-90 text-white px-3 py-1 rounded-full text-xs font-bold transition-opacity"
      >
        Atualizar
      </button>
      <button onClick={() => setShow(false)} className="text-primary-200/70 hover:text-white text-lg leading-none">×</button>
    </div>
  )
}
