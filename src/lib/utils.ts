import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, parseISO, differenceInDays, differenceInMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date, pattern = 'dd/MM/yyyy'): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, pattern, { locale: ptBR })
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
}

export function formatRelative(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return formatDistanceToNow(d, { addSuffix: true, locale: ptBR })
}

// Compares dates by calendar day only, ignoring time/timezone offsets.
// SQLite stores dates as UTC midnight; Brazil is UTC-3, which would shift
// the day if we compared raw timestamps.
export function daysFromToday(date: string | Date): number {
  const raw = typeof date === 'string' ? date : date.toISOString()
  const datePart = raw.split('T')[0] // 'YYYY-MM-DD'
  const todayPart = new Date().toLocaleDateString('en-CA') // 'YYYY-MM-DD' local
  const d = new Date(datePart + 'T12:00:00')
  const t = new Date(todayPart + 'T12:00:00')
  return Math.round((d.getTime() - t.getTime()) / 86400000)
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatNumber(value: number, decimals = 1): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function calcAge(birthDate: string | Date): string {
  const d = typeof birthDate === 'string' ? parseISO(birthDate) : birthDate
  const months = differenceInMonths(new Date(), d)
  if (months < 1) {
    const days = differenceInDays(new Date(), d)
    return `${days} dia${days !== 1 ? 's' : ''}`
  }
  if (months < 24) return `${months} mês${months !== 1 ? 'es' : ''}`
  const years = Math.floor(months / 12)
  return `${years} ano${years !== 1 ? 's' : ''}`
}

export function calcAgeInMonths(birthDate: string | Date): number {
  const d = typeof birthDate === 'string' ? parseISO(birthDate) : birthDate
  return differenceInMonths(new Date(), d)
}

export const BREEDS_DAIRY = [
  'Holandesa', 'Jersey', 'Gir Leiteiro', 'Girolando',
  'Pardo Suíço', 'Ayrshire', 'Guzerá', 'Sindi', 'Mestiça',
]

export const BREEDS_BEEF = [
  'Nelore', 'Angus', 'Brahman', 'Senepol', 'Hereford',
  'Limousin', 'Simmental', 'Brangus', 'Canchim', 'Tabapuã',
  'Caracu', 'Guzolando', 'Mestiço',
]

export const FINANCIAL_CATEGORIES_INCOME = [
  'Venda de Leite', 'Venda de Animais', 'Venda de Bezerros',
  'Serviços de Monta', 'Outros',
]

export const FINANCIAL_CATEGORIES_EXPENSE = [
  'Ração e Suplementos', 'Medicamentos e Vacinas', 'Mão de Obra',
  'Manutenção de Equipamentos', 'Combustível', 'Energia Elétrica',
  'Sementes e Fertilizantes', 'Impostos e Taxas', 'Veterinário',
  'Compra de Animais', 'Outros',
]

export const LABELS = {
  animalType: { DAIRY: 'Leiteiro', BEEF: 'Corte' },
  sex: { MALE: 'Macho', FEMALE: 'Fêmea' },
  status: { ACTIVE: 'Ativo', SOLD: 'Vendido', DEAD: 'Morto', TRANSFERRED: 'Transferido' },
  farmType: { DAIRY: 'Pecuária Leiteira', BEEF: 'Pecuária de Corte', MIXED: 'Mista' },
  priority: { LOW: 'Baixa', MEDIUM: 'Média', HIGH: 'Alta', CRITICAL: 'Crítica' },
  alertType: {
    VACCINATION: 'Vacinação',
    REPRODUCTIVE: 'Reprodutivo',
    FINANCIAL: 'Financeiro',
    HEALTH: 'Saúde',
    GENERAL: 'Geral',
    WEIGHT_CHECK: 'Pesagem',
  },
  healthType: {
    VACCINATION: 'Vacinação',
    TREATMENT: 'Tratamento',
    EXAM: 'Exame',
    SURGERY: 'Cirurgia',
    PARASITE_CONTROL: 'Controle Parasitário',
    HOOF_TRIM: 'Casqueamento',
    OTHER: 'Outro',
  },
  reproductiveType: {
    ESTRUS: 'Cio',
    NATURAL_MATING: 'Monta Natural',
    INSEMINATION: 'Inseminação',
    PREGNANCY_CHECK_POSITIVE: 'Diagnóstico Positivo',
    PREGNANCY_CHECK_NEGATIVE: 'Diagnóstico Negativo',
    CALVING: 'Parto',
    WEANING: 'Desmame',
    DRY_OFF: 'Secagem',
    ABORTION: 'Aborto',
  },
  paymentStatus: { PENDING: 'Pendente', PAID: 'Pago', OVERDUE: 'Vencido', CANCELLED: 'Cancelado' },
  plan: { FREE: 'Gratuito', BASIC: 'Básico', PROFESSIONAL: 'Profissional', ENTERPRISE: 'Empresarial' },
  role: { SUPER_ADMIN: 'Super Admin', ADMIN: 'Admin', PRODUCER: 'Produtor', VETERINARIAN: 'Veterinário', EMPLOYEE: 'Funcionário' },
} as const

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-800',
    SOLD: 'bg-blue-100 text-blue-800',
    DEAD: 'bg-red-100 text-red-800',
    TRANSFERRED: 'bg-yellow-100 text-yellow-800',
    LOW: 'bg-gray-100 text-gray-700',
    MEDIUM: 'bg-yellow-100 text-yellow-800',
    HIGH: 'bg-orange-100 text-orange-800',
    CRITICAL: 'bg-red-100 text-red-800',
    PAID: 'bg-green-100 text-green-800',
    PENDING: 'bg-yellow-100 text-yellow-800',
    OVERDUE: 'bg-red-100 text-red-800',
    CANCELLED: 'bg-gray-100 text-gray-700',
  }
  return map[status] ?? 'bg-gray-100 text-gray-700'
}

export const STATES_BR = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA',
  'MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN',
  'RS','RO','RR','SC','SP','SE','TO',
]
