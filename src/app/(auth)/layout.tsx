import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-950 via-primary-900 to-primary-700 flex flex-col">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary-300/10 rounded-full blur-3xl" />
      </div>
      <nav className="relative z-10 px-6 py-5">
        <Link href="/" className="inline-flex items-center gap-2">
          <div className="w-8 h-8 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">JE</span>
          </div>
          <span className="text-white font-bold text-xl">J.ELEUPEC</span>
        </Link>
      </nav>
      <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-12">
        {children}
      </div>
      <p className="relative z-10 text-center text-primary-300 text-xs pb-6">
        © {new Date().getFullYear()} J.ELEUPEC. Todos os direitos reservados.
      </p>
    </div>
  )
}
