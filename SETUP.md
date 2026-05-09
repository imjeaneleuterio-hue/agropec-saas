# AgroPec SaaS — Guia de Instalação

## Pré-requisitos
- Node.js 18+
- PostgreSQL 14+
- npm ou yarn

## 1. Instalar Dependências

```bash
cd agropec-saas
npm install
```

## 2. Configurar Variáveis de Ambiente

```bash
cp .env.example .env
```

Edite `.env` com suas configurações:
```
DATABASE_URL="postgresql://usuario:senha@localhost:5432/agropec_db"
JWT_SECRET="sua-chave-secreta-com-minimo-32-caracteres"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

## 3. Criar o Banco de Dados

```bash
# Criar banco no PostgreSQL
createdb agropec_db

# Gerar o cliente Prisma
npm run db:generate

# Aplicar o schema
npm run db:push

# Popular com dados de demonstração
npm run db:seed
```

## 4. Iniciar em Desenvolvimento

```bash
npm run dev
```

Acesse: http://localhost:3000

## 5. Credenciais Demo

| Perfil   | E-mail                | Senha     |
|----------|-----------------------|-----------|
| Produtor | demo@agropec.com      | demo123   |
| Admin    | admin@agropec.com     | admin123  |

## 6. Build para Produção

```bash
npm run build
npm run start
```

## Estrutura do Projeto

```
agropec-saas/
├── prisma/
│   ├── schema.prisma      # Modelagem do banco de dados
│   └── seed.ts            # Dados iniciais para demo
├── public/
│   ├── manifest.json      # PWA manifest
│   └── uploads/           # Uploads de imagens (criado automaticamente)
├── src/
│   ├── app/
│   │   ├── (auth)/        # Páginas de autenticação
│   │   │   ├── login/
│   │   │   └── cadastro/
│   │   ├── (dashboard)/   # Módulos do sistema
│   │   │   ├── dashboard/     # Visão geral
│   │   │   ├── rebanho/       # Gestão de animais
│   │   │   ├── leite/         # Controle leiteiro
│   │   │   ├── reproducao/    # Calendário reprodutivo
│   │   │   ├── sanitario/     # Saúde animal
│   │   │   ├── financeiro/    # Financeiro rural
│   │   │   ├── alertas/       # Alertas e notificações
│   │   │   ├── relatorios/    # Relatórios e análises
│   │   │   ├── admin/         # Área administrativa
│   │   │   └── configuracoes/ # Configurações da conta
│   │   ├── api/           # Rotas da API REST
│   │   │   ├── auth/          # Autenticação (login, register, logout, me)
│   │   │   ├── animais/       # CRUD de animais
│   │   │   ├── leite/         # Produção leiteira
│   │   │   ├── reproducao/    # Eventos reprodutivos
│   │   │   ├── sanitario/     # Registros sanitários
│   │   │   ├── financeiro/    # Financeiro
│   │   │   ├── alertas/       # Alertas
│   │   │   ├── dashboard/     # Stats do dashboard
│   │   │   ├── relatorios/    # Dados para relatórios
│   │   │   └── upload/        # Upload de imagens
│   │   ├── layout.tsx     # Layout raiz
│   │   ├── page.tsx       # Landing page
│   │   └── globals.css    # Estilos globais
│   ├── components/
│   │   └── layout/        # Sidebar, Header
│   ├── hooks/             # React hooks (useAuth, useAnimais)
│   ├── lib/               # Utilitários (prisma, auth, utils, validations)
│   ├── middleware.ts       # Proteção de rotas com JWT
│   └── types/             # TypeScript types
├── next.config.js
├── tailwind.config.ts
└── package.json
```

## Tecnologias

| Camada      | Tecnologia                        |
|-------------|-----------------------------------|
| Framework   | Next.js 14 (App Router)           |
| UI          | React + Tailwind CSS              |
| Linguagem   | TypeScript                        |
| Banco       | PostgreSQL + Prisma ORM           |
| Autenticação| JWT (jose) + httpOnly cookies     |
| Gráficos    | Recharts                          |
| Formulários | React Hook Form + Zod             |
| PWA         | manifest.json + viewport          |
| Upload      | Next.js API + FileSystem          |

## Módulos do Sistema

### 🐄 Gestão de Rebanho
- Cadastro com foto, nome, brinco, raça, sexo, tipo
- Filtros avançados (tipo, status, sexo, raça)
- Visualização em tabela ou cards
- Perfil completo do animal com histórico

### 🥛 Controle Leiteiro
- Registro por turno (manhã, tarde, noite)
- Gráficos de produção diária e mensal
- Ranking das maiores produtoras
- Cálculo automático do total

### 🗓️ Calendário Reprodutivo
- Registro de cio, inseminação, diagnóstico
- Controle de partos, desmame, secagem
- Cálculo automático de parto (283 dias)
- Alertas automáticos de partos previstos

### 💉 Controle Sanitário
- Vacinações com controle de próximas doses
- Tratamentos veterinários com custo
- Controle parasitário e exames
- Alertas de procedimentos pendentes

### 💰 Financeiro Rural
- Lançamento de receitas e despesas
- Categorias específicas para agropecuária
- Fluxo de caixa com gráficos
- Status de pagamento (pago/pendente/vencido)

### 🔔 Alertas Inteligentes
- Alertas automáticos por prioridade
- Tipos: vacinação, reprodutivo, financeiro, saúde
- Marcar como lido individualmente ou em massa

### 📊 Relatórios
- Produção leiteira histórica
- Financeiro mensal (receita vs despesa)
- Evolução do rebanho
- KPIs da fazenda

### 👥 Área Administrativa
- Gestão de usuários e fazendas
- Controle de planos e assinaturas
- Estatísticas da plataforma
