'use client'

import { useEffect, useState, useCallback } from 'react'
import { RefreshCw, Check, Package, TrendingUp } from 'lucide-react'
import api from '@/lib/api'
import AdminLayout from '@/components/AdminLayout'

interface KPIs {
  mrr: number
  active_basic: number
  active_lite: number
  active_premium: number
  active_total: number
}

const PACKAGES = [
  {
    type: 'basic',
    name: 'Básico',
    price: 500,
    tagline: 'Ideal para começar no próprio ritmo',
    features: [
      'Acesso a todas as aulas gravadas',
      'Acesso 24/7 à plataforma',
      'Certificado de conclusão',
      'Suporte via chat',
    ],
    color:   'from-gray-400 to-gray-600',
    badge:   'bg-gray-100 text-gray-700',
    accent:  'bg-gray-500',
    ring:    'ring-gray-300',
    popular: false,
  },
  {
    type: 'lite',
    name: 'Lite',
    price: 1500,
    tagline: 'Mais estrutura com sessões ao vivo em grupo',
    features: [
      'Tudo do Básico',
      'Sessões ao vivo em grupo',
      'Horários fixos mensais',
      'Q&A ao vivo com o professor',
      'Gravações das sessões',
    ],
    color:   'from-primary to-orange-600',
    badge:   'bg-primary/10 text-primary',
    accent:  'bg-primary',
    ring:    'ring-primary',
    popular: true,
  },
  {
    type: 'premium',
    name: 'Premium',
    price: 3500,
    tagline: 'Experiência totalmente personalizada 1:1',
    features: [
      'Tudo do Lite',
      'Aulas 1:1 com o professor',
      'Horário totalmente flexível',
      'Plano de estudo individual',
      'Acesso prioritário ao suporte',
      'Mentoria contínua',
    ],
    color:   'from-secondary to-blue-700',
    badge:   'bg-secondary/10 text-secondary',
    accent:  'bg-secondary',
    ring:    'ring-secondary',
    popular: false,
  },
]

export default function PackagesPage() {
  const [kpis,    setKpis]    = useState<KPIs | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/kpis').catch(() => ({ data: null }))
      setKpis(res.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const getCount   = (type: string) => !kpis ? 0 : type === 'basic' ? kpis.active_basic : type === 'lite' ? kpis.active_lite : kpis.active_premium
  const getMRR     = (type: string, price: number) => (getCount(type) * price).toLocaleString('pt-PT')
  const getPct     = (type: string) => {
    const total = kpis?.active_total ?? 0
    return total > 0 ? Math.round((getCount(type) / total) * 100) : 0
  }

  return (
    <AdminLayout>
      <div className="px-6 py-8 max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <Package size={22} className="text-primary" /> Pacotes de Subscrição
            </h1>
            <p className="text-gray-400 text-sm mt-1">Os 3 planos disponíveis em todos os cursos da plataforma</p>
          </div>
          <button onClick={load} disabled={loading} className="btn-outline gap-2 text-sm py-2 px-4">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Actualizar
          </button>
        </div>

        {/* Summary card */}
        <div className="card mb-8 bg-gradient-to-br from-[#061924] to-secondary text-white overflow-hidden relative">
          <div className="absolute inset-0 opacity-5">
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white" />
            <div className="absolute -bottom-10 -left-10 w-60 h-60 rounded-full bg-white" />
          </div>
          <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-6">
            <div>
              <p className="text-white/50 text-xs font-semibold uppercase tracking-wide">MRR Total</p>
              <p className="text-3xl font-black mt-1 tabular-nums">
                {loading ? '…' : (kpis?.mrr ?? 0).toLocaleString('pt-PT')}
                <span className="text-sm font-normal text-white/50 ml-1">MZN</span>
              </p>
            </div>
            <div>
              <p className="text-white/50 text-xs font-semibold uppercase tracking-wide">Subscritores</p>
              <p className="text-3xl font-black mt-1">{loading ? '…' : (kpis?.active_total ?? 0)}</p>
            </div>
            <div>
              <p className="text-white/50 text-xs font-semibold uppercase tracking-wide">Receita média/sub</p>
              <p className="text-3xl font-black mt-1 tabular-nums">
                {loading || !kpis || !kpis.active_total ? '…' : Math.round((kpis.mrr ?? 0) / kpis.active_total).toLocaleString('pt-PT')}
                <span className="text-sm font-normal text-white/50 ml-1">MZN</span>
              </p>
            </div>
            <div>
              <p className="text-white/50 text-xs font-semibold uppercase tracking-wide">ARR estimado</p>
              <p className="text-3xl font-black mt-1 tabular-nums">
                {loading ? '…' : ((kpis?.mrr ?? 0) * 12).toLocaleString('pt-PT')}
                <span className="text-sm font-normal text-white/50 ml-1">MZN</span>
              </p>
            </div>
          </div>
        </div>

        {/* Package cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {PACKAGES.map(pkg => {
            const count = getCount(pkg.type)
            const pct   = getPct(pkg.type)
            return (
              <div key={pkg.type} className={`card relative overflow-hidden ${pkg.popular ? `ring-2 ${pkg.ring}` : ''}`}>
                {pkg.popular && (
                  <div className={`absolute top-0 left-0 right-0 h-1 ${pkg.accent}`} />
                )}
                {pkg.popular && (
                  <span className="absolute top-4 right-4 text-[10px] font-black px-2.5 py-1 rounded-full bg-primary text-white shadow">
                    Mais popular
                  </span>
                )}

                <span className={`inline-flex px-3 py-1 rounded-lg text-sm font-black ${pkg.badge} mb-4`}>
                  {pkg.name}
                </span>

                <div className="mb-1">
                  <span className="text-4xl font-black text-gray-900">{pkg.price.toLocaleString('pt-PT')}</span>
                  <span className="text-gray-400 text-sm ml-1">MZN/mês</span>
                </div>
                <p className="text-gray-500 text-xs mb-4">{pkg.tagline}</p>

                <ul className="space-y-2 mb-6">
                  {pkg.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                      <Check size={13} className="text-emerald-500 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* Stats */}
                <div className="pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500">Subscritores activos</span>
                    <span className="text-xl font-black text-gray-900">{loading ? '…' : count}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-1.5">
                    <div className={`h-full ${pkg.accent} rounded-full transition-all duration-700`}
                      style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-gray-400">{pct}% dos subscritores</span>
                    <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                      <TrendingUp size={10} /> {loading ? '…' : getMRR(pkg.type, pkg.price)} MZN/mês
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Info banner */}
        <div className="rounded-2xl bg-amber-50 border border-amber-200 px-5 py-4">
          <h3 className="font-black text-amber-800 mb-2 text-sm">Informação sobre os pacotes</h3>
          <ul className="space-y-1 text-sm text-amber-700">
            <li>• Os preços são fixos a nível de plataforma: <strong>Básico 500 MZN</strong>, <strong>Lite 1.500 MZN</strong>, <strong>Premium 3.500 MZN</strong> por mês</li>
            <li>• O aluno selecciona o pacote no momento da inscrição em cada curso</li>
            <li>• O pacote é por curso — o mesmo aluno pode ter planos diferentes em cursos diferentes</li>
            <li>• O pagamento é mensal e renovado automaticamente todos os 30 dias</li>
          </ul>
        </div>
      </div>
    </AdminLayout>
  )
}
