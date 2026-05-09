import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { addDays, subDays, subMonths } from 'date-fns'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed...')

  const password = await bcrypt.hash('demo123', 12)

  const user = await prisma.user.upsert({
    where: { email: 'demo@jeleupec.com' },
    update: {},
    create: {
      email: 'demo@jeleupec.com',
      name: 'João Silva',
      password,
      role: 'PRODUCER',
      phone: '(62) 99999-9999',
      subscription: { create: { plan: 'PROFESSIONAL', status: 'ACTIVE' } },
    },
  })
  console.log('✅ Usuário demo:', user.email)

  await prisma.user.upsert({
    where: { email: 'admin@jeleupec.com' },
    update: {},
    create: {
      email: 'admin@jeleupec.com',
      name: 'Admin J.ELEUPEC',
      password: await bcrypt.hash('admin123', 12),
      role: 'SUPER_ADMIN',
      subscription: { create: { plan: 'ENTERPRISE', status: 'ACTIVE' } },
    },
  })
  console.log('✅ Admin criado')

  const farm = await prisma.farm.upsert({
    where: { id: 'demo-farm-1' },
    update: {},
    create: {
      id: 'demo-farm-1',
      name: 'Fazenda São João',
      city: 'Rio Verde',
      state: 'GO',
      hectares: 850,
      type: 'MIXED',
      userId: user.id,
    },
  })
  console.log('✅ Fazenda:', farm.name)

  const animalsData = [
    { tag: '047', name: 'Mimosa',       breed: 'Girolando', sex: 'FEMALE', type: 'DAIRY', birthDate: new Date('2020-03-15') },
    { tag: '112', name: 'Princesa',     breed: 'Holandesa', sex: 'FEMALE', type: 'DAIRY', birthDate: new Date('2019-07-20') },
    { tag: '055', name: 'Moça Bonita',  breed: 'Jersey',    sex: 'FEMALE', type: 'DAIRY', birthDate: new Date('2021-05-10') },
    { tag: '078', name: 'Estrela',      breed: 'Girolando', sex: 'FEMALE', type: 'DAIRY', birthDate: new Date('2020-09-25') },
    { tag: '093', name: 'Formosa',      breed: 'Holandesa', sex: 'FEMALE', type: 'DAIRY', birthDate: new Date('2019-12-01') },
    { tag: '023', name: 'Touro Bravo',  breed: 'Nelore',    sex: 'MALE',   type: 'BEEF',  birthDate: new Date('2018-11-05') },
    { tag: '088', name: 'Beleza',       breed: 'Angus',     sex: 'FEMALE', type: 'BEEF',  birthDate: new Date('2021-02-14') },
    { tag: '145', name: 'Guerreiro',    breed: 'Nelore',    sex: 'MALE',   type: 'BEEF',  birthDate: new Date('2021-08-20') },
  ]

  const animals = []
  for (const data of animalsData) {
    const a = await prisma.animal.upsert({
      where: { farmId_tag: { farmId: farm.id, tag: data.tag } },
      update: {},
      create: { ...data, farmId: farm.id, status: 'ACTIVE' },
    })
    animals.push(a)
  }
  console.log(`✅ ${animals.length} animais criados`)

  // Milk productions (últimos 30 dias para vacas leiteiras)
  const dairyAnimals = animals.filter((a) => a.type === 'DAIRY')
  for (const animal of dairyAnimals) {
    for (let i = 0; i < 30; i++) {
      const id = `milk-${animal.id}-${i}`
      const existing = await prisma.milkProduction.findUnique({ where: { id } })
      if (existing) continue
      const date = subDays(new Date(), i)
      const base = animal.name === 'Princesa' ? 22 : animal.name === 'Formosa' ? 20 : 16
      const m = +(base * 0.55 + (Math.random() - 0.5) * 2).toFixed(1)
      const a2 = +(base * 0.45 + (Math.random() - 0.5) * 2).toFixed(1)
      await prisma.milkProduction.create({
        data: {
          id,
          animalId: animal.id,
          date,
          morningLiters: Math.max(0, m),
          afternoonLiters: Math.max(0, a2),
          totalLiters: Math.max(0, +(m + a2).toFixed(1)),
        },
      })
    }
  }
  console.log('✅ Produções leiteiras criadas')

  // Health records
  const healthData = [
    { id: 'h1', animalId: animals[0].id, type: 'VACCINATION', date: subMonths(new Date(), 1), description: 'Febre Aftosa', cost: 12.5, nextDueDate: addDays(new Date(), 160) },
    { id: 'h2', animalId: animals[0].id, type: 'TREATMENT',   date: subDays(new Date(), 3),   description: 'Mastite subclínica', cost: 85, medications: 'Antibiótico' },
    { id: 'h3', animalId: animals[1].id, type: 'VACCINATION', date: subMonths(new Date(), 1), description: 'Clostridioses', cost: 18 },
  ]
  for (const h of healthData) {
    await prisma.healthRecord.upsert({ where: { id: h.id }, update: {}, create: h as any })
  }
  console.log('✅ Saúde criada')

  // Financial records
  const finData = [
    { id: 'fin-1', farmId: farm.id, type: 'INCOME',  category: 'Venda de Leite',    description: 'Entrega quinzenal', amount: 16800, date: subDays(new Date(), 5), paymentStatus: 'PAID' },
    { id: 'fin-2', farmId: farm.id, type: 'INCOME',  category: 'Venda de Animais',  description: 'Venda novilhos',    amount: 12500, date: subDays(new Date(), 3), paymentStatus: 'PAID' },
    { id: 'fin-3', farmId: farm.id, type: 'EXPENSE', category: 'Ração e Suplementos', description: 'Ração concentrada', amount: 8400, date: subDays(new Date(), 4), paymentStatus: 'PAID' },
    { id: 'fin-4', farmId: farm.id, type: 'EXPENSE', category: 'Mão de Obra',       description: 'Salários',          amount: 6800, date: new Date(),               paymentStatus: 'PENDING' },
  ]
  for (const f of finData) {
    await prisma.financialRecord.upsert({ where: { id: f.id }, update: {}, create: f })
  }
  console.log('✅ Financeiro criado')

  // Alerts
  const alertData = [
    { id: 'alert-1', farmId: farm.id, type: 'VACCINATION',  title: 'Vacinação Febre Aftosa — 2ª Dose', description: '23 animais devem ser vacinados', priority: 'CRITICAL', dueDate: addDays(new Date(), 3),  animalId: animals[0].id },
    { id: 'alert-2', farmId: farm.id, type: 'REPRODUCTIVE', title: 'Parto Previsto — Mimosa #047',      description: 'Parto previsto em 16 dias',        priority: 'HIGH',     dueDate: addDays(new Date(), 16), animalId: animals[0].id },
    { id: 'alert-3', farmId: farm.id, type: 'FINANCIAL',    title: 'Conta Vencendo',                    description: 'Pagamento ração R$ 3.200,00',      priority: 'HIGH',     dueDate: addDays(new Date(), 1) },
  ]
  for (const a of alertData) {
    await prisma.alert.upsert({ where: { id: a.id }, update: {}, create: a })
  }
  console.log('✅ Alertas criados')

  console.log('\n🎉 Seed concluído!')
  console.log('📧 demo@jeleupec.com  / demo123')
  console.log('📧 admin@jeleupec.com / admin123')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
