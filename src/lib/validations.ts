import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
})

export const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  phone: z.string().optional().transform(v => v?.trim() === '' ? undefined : v),
  cpf: z.string().optional().transform(v => v?.trim() === '' ? undefined : v),
  farmName: z.string().min(2, 'Nome da fazenda obrigatório'),
  farmCity: z.string().min(2, 'Cidade obrigatória'),
  farmState: z.string().length(2, 'Estado inválido'),
  farmType: z.enum(['DAIRY', 'BEEF', 'MIXED']),
})

export const animalSchema = z.object({
  tag: z.string().min(1, 'Número/brinco obrigatório'),
  name: z.string().optional(),
  breed: z.string().min(1, 'Raça obrigatória'),
  sex: z.enum(['MALE', 'FEMALE']),
  type: z.enum(['DAIRY', 'BEEF']),
  birthDate: z.string().optional(),
  status: z.enum(['ACTIVE', 'SOLD', 'DEAD', 'TRANSFERRED']).default('ACTIVE'),
  purchaseDate: z.string().optional(),
  purchasePrice: z.coerce.number().optional(),
  observations: z.string().optional(),
  photoUrl: z.string().optional(),
})

export const milkProductionSchema = z.object({
  animalId: z.string().min(1),
  date: z.string(),
  morningLiters: z.coerce.number().min(0).default(0),
  afternoonLiters: z.coerce.number().min(0).default(0),
  eveningLiters: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
})

export const reproductiveEventSchema = z.object({
  animalId: z.string().min(1),
  type: z.enum([
    'ESTRUS', 'NATURAL_MATING', 'INSEMINATION', 'PREGNANCY_CHECK_POSITIVE',
    'PREGNANCY_CHECK_NEGATIVE', 'CALVING', 'WEANING', 'DRY_OFF', 'ABORTION',
  ]),
  date: z.string(),
  bullName: z.string().optional(),
  expectedCalving: z.string().optional(),
  result: z.string().optional(),
  notes: z.string().optional(),
})

export const healthRecordSchema = z.object({
  animalId: z.string().min(1),
  type: z.enum(['VACCINATION', 'TREATMENT', 'EXAM', 'SURGERY', 'PARASITE_CONTROL', 'HOOF_TRIM', 'OTHER']),
  date: z.string(),
  description: z.string().min(1, 'Descrição obrigatória'),
  veterinarian: z.string().optional(),
  cost: z.coerce.number().optional(),
  nextDueDate: z.string().optional(),
  medications: z.string().optional(),
  notes: z.string().optional(),
})

export const financialRecordSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']),
  category: z.string().min(1, 'Categoria obrigatória'),
  description: z.string().min(1, 'Descrição obrigatória'),
  amount: z.coerce.number().positive('Valor deve ser positivo'),
  date: z.string(),
  paymentStatus: z.enum(['PENDING', 'PAID', 'OVERDUE', 'CANCELLED']).default('PENDING'),
  notes: z.string().optional(),
})

export const weightRecordSchema = z.object({
  animalId: z.string().min(1),
  weight: z.coerce.number().positive('Peso deve ser positivo'),
  date: z.string(),
  notes: z.string().optional(),
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type AnimalInput = z.infer<typeof animalSchema>
export type MilkProductionInput = z.infer<typeof milkProductionSchema>
export type ReproductiveEventInput = z.infer<typeof reproductiveEventSchema>
export type HealthRecordInput = z.infer<typeof healthRecordSchema>
export type FinancialRecordInput = z.infer<typeof financialRecordSchema>
export type WeightRecordInput = z.infer<typeof weightRecordSchema>
