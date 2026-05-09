import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-agro rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">JE</span>
              </div>
              <span className="text-xl font-bold text-gray-900">J.ELEUPEC</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#funcionalidades" className="text-sm text-gray-600 hover:text-primary-600 transition-colors">Funcionalidades</a>
              <a href="#planos" className="text-sm text-gray-600 hover:text-primary-600 transition-colors">Planos</a>
              <a href="#sobre" className="text-sm text-gray-600 hover:text-primary-600 transition-colors">Sobre</a>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/login" className="btn-secondary">Entrar</Link>
              <Link href="/cadastro" className="btn-primary">Começar Grátis</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-24 pb-16 bg-gradient-to-br from-primary-950 via-primary-900 to-primary-700 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-96 h-96 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-20 w-64 h-64 bg-primary-300 rounded-full blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-primary-800/50 text-primary-200 text-xs font-medium px-3 py-1 rounded-full mb-6 border border-primary-700">
                <span className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-pulse" />
                Sistema completo para pecuaristas brasileiros
              </div>
              <h1 className="text-4xl lg:text-5xl xl:text-6xl font-extrabold text-white leading-tight mb-6">
                Gestão inteligente da sua{' '}
                <span className="text-primary-300">pecuária</span>
              </h1>
              <p className="text-lg text-primary-100 mb-8 max-w-xl">
                Controle total do seu rebanho, produção leiteira, reprodução, saúde animal e financeiro rural — tudo em um único sistema moderno e fácil de usar.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/cadastro"
                  className="btn bg-white text-primary-700 hover:bg-primary-50 text-base px-8 py-3 font-semibold shadow-lg">
                  Começar Gratuitamente
                </Link>
                <a href="#funcionalidades"
                  className="btn border border-primary-400 text-white hover:bg-primary-800 text-base px-8 py-3">
                  Ver Funcionalidades
                </a>
              </div>
              <div className="mt-8 flex items-center gap-6 text-sm text-primary-200">
                <span className="flex items-center gap-1">✓ Sem cartão de crédito</span>
                <span className="flex items-center gap-1">✓ Setup em 5 minutos</span>
                <span className="flex items-center gap-1">✓ Suporte em PT-BR</span>
              </div>
            </div>
            <div className="hidden lg:block">
              <div className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/20">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Animais Ativos', value: '1.247', icon: '🐄', change: '+12%' },
                    { label: 'Prod. Hoje (L)', value: '3.840', icon: '🥛', change: '+8%' },
                    { label: 'Alertas', value: '3', icon: '🔔', change: 'pendentes' },
                    { label: 'Receita Mensal', value: 'R$ 48.200', icon: '💰', change: '+15%' },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-white/10 rounded-xl p-4 border border-white/10">
                      <div className="text-2xl mb-1">{stat.icon}</div>
                      <div className="text-xs text-primary-200 mb-1">{stat.label}</div>
                      <div className="text-xl font-bold text-white">{stat.value}</div>
                      <div className="text-xs text-primary-300">{stat.change}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 bg-white/10 rounded-xl p-4 border border-white/10">
                  <div className="text-xs text-primary-200 mb-3">Produção Leiteira — últimos 7 dias</div>
                  <div className="flex items-end gap-1 h-16">
                    {[65, 72, 68, 80, 75, 85, 90].map((h, i) => (
                      <div key={i} className="flex-1 bg-primary-400 rounded-t opacity-80" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-white border-b border-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: '2.500+', label: 'Fazendas ativas' },
              { value: '850 mil+', label: 'Animais cadastrados' },
              { value: '99.9%', label: 'Disponibilidade' },
              { value: '4.9★', label: 'Avaliação dos usuários' },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-2xl font-bold text-primary-700">{s.value}</div>
                <div className="text-sm text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="funcionalidades" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Tudo que sua fazenda precisa</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">Uma plataforma completa desenvolvida especialmente para pecuaristas brasileiros.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="card-hover p-6">
                <div className={`w-12 h-12 rounded-xl ${f.bg} flex items-center justify-center text-2xl mb-4`}>
                  {f.icon}
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="planos" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Planos para todo tamanho de fazenda</h2>
            <p className="text-gray-600">Sem surpresas, sem letras miúdas. Cancele quando quiser.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {PLANS.map((plan) => (
              <div key={plan.name}
                className={`relative rounded-2xl p-6 border-2 ${plan.featured ? 'border-primary-600 shadow-xl' : 'border-gray-100'}`}>
                {plan.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-600 text-white text-xs font-semibold px-4 py-1 rounded-full">
                    Mais Popular
                  </div>
                )}
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{plan.desc}</p>
                </div>
                <div className="mb-6">
                  <span className="text-3xl font-extrabold text-gray-900">R$ {plan.price}</span>
                  <span className="text-gray-500 text-sm">/mês</span>
                </div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="text-primary-600">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <Link href="/cadastro"
                  className={`w-full ${plan.featured ? 'btn-primary' : 'btn-secondary'} justify-center`}>
                  {plan.price === '0' ? 'Começar Grátis' : 'Assinar Plano'}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-agro">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Pronto para modernizar sua fazenda?</h2>
          <p className="text-primary-100 mb-8">Junte-se a milhares de pecuaristas que já usam o J.ELEUPEC.</p>
          <Link href="/cadastro" className="btn bg-white text-primary-700 hover:bg-primary-50 text-lg px-10 py-4 font-semibold">
            Criar conta gratuitamente
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary-950 text-primary-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">JE</span>
              </div>
              <span className="font-bold text-white">J.ELEUPEC</span>
            </div>
            <p className="text-sm">© {new Date().getFullYear()} J.ELEUPEC. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

const FEATURES = [
  { icon: '🐄', title: 'Gestão de Rebanho', desc: 'Cadastro completo com foto, histórico, peso, raça e muito mais para cada animal.', bg: 'bg-green-50' },
  { icon: '🥛', title: 'Controle Leiteiro', desc: 'Registro de produção por turno (manhã, tarde, noite) com gráficos e análises.', bg: 'bg-blue-50' },
  { icon: '🗓️', title: 'Calendário Reprodutivo', desc: 'Gestão de cio, inseminação, diagnóstico de prenhez, partos e desmame.', bg: 'bg-purple-50' },
  { icon: '💉', title: 'Controle Sanitário', desc: 'Vacinações, tratamentos, exames veterinários com alertas automáticos.', bg: 'bg-orange-50' },
  { icon: '💰', title: 'Financeiro Rural', desc: 'Controle de receitas, despesas e fluxo de caixa da fazenda com relatórios.', bg: 'bg-yellow-50' },
  { icon: '🔔', title: 'Alertas Inteligentes', desc: 'Notificações automáticas para vacinações, partos previstos e vencimentos.', bg: 'bg-red-50' },
  { icon: '📊', title: 'Relatórios Avançados', desc: 'Dashboards e relatórios detalhados para tomada de decisão baseada em dados.', bg: 'bg-teal-50' },
  { icon: '📱', title: 'PWA Mobile', desc: 'Use no celular mesmo sem internet. Interface responsiva para campo e escritório.', bg: 'bg-indigo-50' },
  { icon: '👥', title: 'Multi-usuário', desc: 'Adicione veterinários, funcionários e gestores com diferentes permissões.', bg: 'bg-pink-50' },
]

const PLANS = [
  {
    name: 'Gratuito',
    desc: 'Para iniciar e testar',
    price: '0',
    featured: false,
    features: ['Até 50 animais', '1 fazenda', 'Dashboard básico', 'Controle leiteiro', 'Suporte por e-mail'],
  },
  {
    name: 'Profissional',
    desc: 'Para fazendas em crescimento',
    price: '197',
    featured: true,
    features: ['Animais ilimitados', 'Até 3 fazendas', 'Todos os módulos', 'Relatórios avançados', 'Alertas automáticos', 'Suporte prioritário'],
  },
  {
    name: 'Empresarial',
    desc: 'Para grandes operações',
    price: '497',
    featured: false,
    features: ['Tudo do Profissional', 'Fazendas ilimitadas', 'Multi-usuários', 'API de integração', 'Customizações', 'Gerente de conta'],
  },
]
