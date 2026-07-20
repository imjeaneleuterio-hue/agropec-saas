import { DashboardShell } from './DashboardShell'

// Área autenticada: nunca deve ser servida do cache de borda da Vercel —
// o conteúdo é por usuário e precisa refletir sempre o último deploy e os
// dados mais recentes. (Um HTML antigo em cache foi o que causou o erro de
// hidratação que travava a navegação depois de um deploy.)
export const dynamic = 'force-dynamic'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>
}
