export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'PRODUCER' | 'VETERINARIAN' | 'EMPLOYEE'
export type FarmType = 'DAIRY' | 'BEEF' | 'MIXED'
export type AnimalType = 'DAIRY' | 'BEEF'
export type Sex = 'MALE' | 'FEMALE'
export type AnimalStatus = 'ACTIVE' | 'SOLD' | 'DEAD' | 'TRANSFERRED'
export type ReproductiveEventType =
  | 'ESTRUS'
  | 'NATURAL_MATING'
  | 'INSEMINATION'
  | 'PREGNANCY_CHECK_POSITIVE'
  | 'PREGNANCY_CHECK_NEGATIVE'
  | 'CALVING'
  | 'WEANING'
  | 'DRY_OFF'
  | 'ABORTION'
export type HealthRecordType =
  | 'VACCINATION'
  | 'TREATMENT'
  | 'EXAM'
  | 'SURGERY'
  | 'PARASITE_CONTROL'
  | 'HOOF_TRIM'
  | 'OTHER'
export type FinancialType = 'INCOME' | 'EXPENSE'
export type PaymentStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED'
export type AlertType = 'VACCINATION' | 'REPRODUCTIVE' | 'FINANCIAL' | 'HEALTH' | 'GENERAL' | 'WEIGHT_CHECK'
export type AlertPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type SubscriptionPlan = 'FREE' | 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE'

export interface User {
  id: string
  email: string
  name: string
  role: Role
  phone?: string
  cpf?: string
  avatar?: string
  isActive: boolean
  createdAt: string
  farms?: Farm[]
  subscription?: Subscription
}

export interface Farm {
  id: string
  name: string
  cnpj?: string
  address?: string
  city: string
  state: string
  cep?: string
  hectares?: number
  type: FarmType
  userId: string
  _count?: { animals: number }
  createdAt: string
}

export interface Animal {
  id: string
  name?: string
  tag: string
  breed: string
  sex: Sex
  birthDate?: string
  type: AnimalType
  status: AnimalStatus
  farmId: string
  motherId?: string
  fatherId?: string
  photoUrl?: string
  purchaseDate?: string
  purchasePrice?: number
  observations?: string
  weightRecords?: WeightRecord[]
  milkProductions?: MilkProduction[]
  reproductiveEvents?: ReproductiveEvent[]
  healthRecords?: HealthRecord[]
  createdAt: string
  updatedAt: string
}

export interface WeightRecord {
  id: string
  animalId: string
  weight: number
  date: string
  notes?: string
  createdAt: string
}

export interface MilkProduction {
  id: string
  animalId: string
  date: string
  morningLiters: number
  afternoonLiters: number
  eveningLiters: number
  totalLiters: number
  notes?: string
  createdAt: string
}

export interface ReproductiveEvent {
  id: string
  animalId: string
  type: ReproductiveEventType
  date: string
  bullName?: string
  expectedCalving?: string
  result?: string
  notes?: string
  createdAt: string
  animal?: Pick<Animal, 'id' | 'name' | 'tag'>
}

export interface HealthRecord {
  id: string
  animalId: string
  type: HealthRecordType
  date: string
  description: string
  veterinarian?: string
  cost?: number
  nextDueDate?: string
  medications?: string
  notes?: string
  createdAt: string
  animal?: Pick<Animal, 'id' | 'name' | 'tag'>
}

export interface FinancialRecord {
  id: string
  farmId: string
  type: FinancialType
  category: string
  description: string
  amount: number
  date: string
  paymentStatus: PaymentStatus
  notes?: string
  createdAt: string
}

export interface Alert {
  id: string
  farmId: string
  type: AlertType
  title: string
  description: string
  dueDate?: string
  isRead: boolean
  priority: AlertPriority
  animalId?: string
  createdAt: string
}

export interface Subscription {
  id: string
  userId: string
  plan: SubscriptionPlan
  status: string
  startDate: string
  endDate?: string
}

export interface UpcomingEstrus {
  id: string
  title: string
  dueDate: string
  description: string
}

export interface DashboardStats {
  totalAnimals: number
  activeAnimals: number
  dairyAnimals: number
  todayMilkTotal: number
  monthMilkTotal: number
  pendingAlerts: number
  criticalAlerts: number
  monthIncome: number
  monthExpense: number
  pregnantAnimals: number
  upcomingVaccinations: number
  upcomingEstrus: UpcomingEstrus[]
}

export interface AuthTokenPayload {
  userId: string
  email: string
  role: Role
  farmId?: string
}

export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}
