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
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-gray-900 text-white px-4 py-3 rounded-2xl shadow-2xl text-sm font-medium">
      <span>🆕 Nova versão disponível</span>
      <button
        onClick={() => window.location.reload()}
        className="bg-primary-500 hover:bg-primary-400 text-white px-3 py-1 rounded-lg text-xs font-bold transition-colors"
      >
        Atualizar
      </button>
      <button onClick={() => setShow(false)} className="text-gray-400 hover:text-white text-lg leading-none">×</button>
    </div>
  )
}
