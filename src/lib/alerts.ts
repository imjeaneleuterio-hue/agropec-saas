import { prisma } from './prisma'

// Alertas vencidos (com prazo já passado) somem sozinhos depois de uma
// semana de vencidos, pra não ficar acumulando alerta antigo pra sempre —
// o produtor só precisa ver que passou do prazo por um tempo, não
// indefinidamente. "Uma semana" é contada pelo calendário do Brasil, não
// pelo fuso do servidor, pra bater com o resto do app.
export async function limparAlertasVencidos(farmId: string) {
  const hojeBR = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
  const [ano, mes, dia] = hojeBR.split('-').map(Number)
  const umaSemanaAtras = new Date(Date.UTC(ano, mes - 1, dia - 7, 0, 0, 0, 0))
  await prisma.alert.deleteMany({
    where: { farmId, dueDate: { lt: umaSemanaAtras } },
  })
}
