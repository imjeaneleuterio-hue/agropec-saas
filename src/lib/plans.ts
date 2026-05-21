import { prisma } from './prisma'

export type PlanKey = 'FREE' | 'PRO' | 'PREMIUM'

export const PLANS = {
  FREE: {
    key: 'FREE' as PlanKey,
    name: 'Gratuito',
    price: 0,
    animalLimit: 5,
    lockedModules: ['reproducao', 'sanitario', 'financeiro', 'relatorios', 'ia', 'ia_voz'],
  },
  PRO: {
    key: 'PRO' as PlanKey,
    name: 'Pro',
    price: 39,
    animalLimit: 200,
    lockedModules: ['ia_voz'],
  },
  PREMIUM: {
    key: 'PREMIUM' as PlanKey,
    name: 'Premium',
    price: 79,
    animalLimit: null,
    lockedModules: [],
  },
} as const

export async function getUserPlan(userId: string): Promise<PlanKey> {
  const sub = await prisma.subscription.findUnique({ where: { userId } })
  if (!sub || sub.status !== 'ACTIVE') return 'FREE'
  if (sub.endDate && sub.endDate < new Date()) return 'FREE'
  const plan = sub.plan as PlanKey
  if (plan !== 'PRO' && plan !== 'PREMIUM') return 'FREE'
  return plan
}

export function canAccessModule(plan: PlanKey, module: string): boolean {
  return !PLANS[plan].lockedModules.includes(module as never)
}

export function getAnimalLimit(plan: PlanKey): number | null {
  return PLANS[plan].animalLimit
}
