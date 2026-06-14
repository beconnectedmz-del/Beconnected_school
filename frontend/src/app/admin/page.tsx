'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Users, BookOpen, DollarSign, TrendingUp, CheckCircle, AlertCircle,
  Clock, Zap, ArrowUpRight, RefreshCw, Globe, Star, Target, ArrowUp,
} from 'lucide-react'
import api from '@/lib/api'
import AdminLayout from '@/components/AdminLayout'

interface KPIs {
  mrr: number
  active_basic: number
  active_lite: number
  active_premium: number
  active_total: number
  new_enrollments_this_month: number
  new_enrollments_last_month: number
  total_courses: number
  published_courses: number
  top_courses: Array<{ id: string; title: string; enrolled: number; avg_rating: number; monthly_revenue: number }>
  revenue_by_discipline: Array<{ discipline: string; enrollments: number; revenue: number }>
}

interface FunnelKPIs {
  total_leads: number
  new_leads: number
  conversion_rate: number
  by_status: Record<string, number>
}

interface ServiceHealth {
  gateway: string
  services: Record<string, string>
}

interface CoursePending {
  id: string
  title: string
  teacher_name: string
  discipline_name: string
}

function StatusDot({ status }: { status: string }) {
  const up = status === 'up'
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
      up ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${up ? 'bg-emerald-500' : 'bg-red-500'}`} />
      {up ? 'online' : 'offline'}
    </span>
  )
}

export default function AdminDashboard() {
  const [kpis,    setKpis]    = useState<KPIs | null>(null)
  const [funnel,  setFunnel]  = useState<FunnelKPIs | null>(null)
  const [health,  setHealth]  = useState<ServiceHealth | null>(null)
  const [pending, setPending] = useState<CoursePending[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [kpisRes, funnelRes, healthRes, coursesRes] = await Promise.all([
        api.get('/admin/kpis').catch(() => ({ data: null })),
        api.get('/admin/funnel/kpis').catch(() => ({ data: null })),
        api.get('/health').catch(() => ({ data: null })),
        api.get('/admin/courses?page_size=100').catch(() => ({ data: { data: [] } })),
      ])
      setKpis(kpisRes.data)
      setFunnel(funnelRes.data)
      setHealth(healthRes.data)
      const courses = coursesRes.data?.data ?? []
      setPending(courses.filter((c: CoursePending & { is_published: boolean; is_validated: boolean }) => c.is_published && !c.is_validated))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const mrr = kpis?.mrr ?? 0
  const enrollmentGrowth = kpis && kpis.new_enrollments_last_month > 0
    ? Math.round(((kpis.new_enrollments_this_month - kpis.new_enrollments_last_month) / kpis.new_enrollments_last_month) * 100)
    : 0

  const servicesUp    = health ? Object.values(health.services).filter(s => s === 'up').length : 0
  const servicesTotal = health ? Object.values(health.services).length : 0

  const validateCourse = async (id: string) => {
    try {
      await api.post(`/admin/courses/${id}/validate`, { validated: true })
      await load()
    } catch { /* ignore */ }
  }

  return (
    <AdminLayout>
      <div className="px-6 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Painel de Administração</h1>
            <p className="text-gray-400 text-sm mt-1">KPIs e métricas em tempo real · Beconnect School</p>
          </div>
          <button onClick={load} disabled={loading} className="btn-outline gap-2 text-sm py-2 px-4">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Actualizar
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* ── KPI Cards ─────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {[
                {
                  label: 'MRR',
                  value: `${mrr.toLocaleString('pt-PT')} MZN`,
                  sub: 'Receita mensal recorrente',
                  Icon: DollarSign,
                  color: 'from-emerald-500 to-teal-600',
                  trend: null,
                },
                {
                  label: 'Subscritores activos',
                  value: kpis?.active_total ?? 0,
                  sub: `${kpis?.active_basic ?? 0} básico · ${kpis?.active_lite ?? 0} lite · ${kpis?.active_premium ?? 0} premium`,
                  Icon: Users,
                  color: 'from-primary to-orange-600',
                  trend: null,
                },
                {
                  label: 'Novas inscrições',
                  value: kpis?.new_enrollments_this_month ?? 0,
                  sub: 'Este mês',
                  Icon: TrendingUp,
                  color: 'from-secondary to-blue-700',
                  trend: enrollmentGrowth,
                },
                {
                  label: 'Cursos publicados',
                  value: kpis?.published_courses ?? 0,
                  sub: `${kpis?.total_courses ?? 0} no total · ${pending.length} a validar`,
                  Icon: BookOpen,
                  color: 'from-purple-500 to-violet-700',
                  trend: null,
                },
              ].map(({ label, value, sub, Icon, color, trend }) => (
                <div key={label} className={`rounded-2xl bg-gradient-to-br ${color} p-5 text-white shadow-lg`}>
                  <div className="flex items-start justify-between mb-3">
                    <Icon size={20} className="text-white/70" />
                    {trend !== null && (
                      <span className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${trend >= 0 ? 'bg-white/20' : 'bg-red-500/30'}`}>
                        <ArrowUp size={10} className={trend < 0 ? 'rotate-180' : ''} />
                        {Math.abs(trend)}%
                      </span>
                    )}
                  </div>
                  <p className="text-2xl font-black">{value}</p>
                  <p className="text-white/60 text-xs mt-1 leading-snug">{sub}</p>
                </div>
              ))}
            </div>

            {/* ── Package breakdown ──────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
              {[
                { type: 'basic',   label: 'Básico',   price: 500,  count: kpis?.active_basic   ?? 0, accent: 'bg-gray-500',   badge: 'bg-gray-100 text-gray-700'    },
                { type: 'lite',    label: 'Lite',     price: 1500, count: kpis?.active_lite    ?? 0, accent: 'bg-primary',    badge: 'bg-primary/10 text-primary'   },
                { type: 'premium', label: 'Premium',  price: 3500, count: kpis?.active_premium ?? 0, accent: 'bg-secondary',  badge: 'bg-secondary/10 text-secondary' },
              ].map(({ label, price, count, accent, badge }) => {
                const revenue = count * price
                const total   = Math.max(kpis?.active_total ?? 1, 1)
                const pct     = Math.round((count / total) * 100)
                return (
                  <div key={label} className="card">
                    <div className="flex items-center justify-between mb-3">
                      <span className={`badge ${badge} font-bold`}>{label}</span>
                      <span className="text-gray-400 text-xs">{price.toLocaleString()} MZN/mês</span>
                    </div>
                    <p className="text-3xl font-black text-gray-900">{count}</p>
                    <p className="text-gray-500 text-xs mt-0.5">subscritores activos</p>
                    <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${accent} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-400">{pct}% do total</span>
                      <span className="text-xs font-bold text-emerald-600">{revenue.toLocaleString()} MZN/mês</span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* ── Two columns: top courses + funnel ─────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Top courses */}
              <div className="card">
                <h2 className="font-black text-gray-900 mb-4 flex items-center gap-2">
                  <Star size={16} className="text-amber-500" /> Top Cursos
                </h2>
                {(kpis?.top_courses ?? []).length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-6">Sem dados ainda</p>
                ) : (
                  <div className="space-y-3">
                    {(kpis?.top_courses ?? []).map((c, i) => (
                      <div key={c.id} className="flex items-center gap-3">
                        <span className="text-gray-300 font-black text-lg w-6 shrink-0">#{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate">{c.title}</p>
                          <p className="text-xs text-gray-400">{c.enrolled} inscritos · ⭐ {Number(c.avg_rating).toFixed(1)}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-bold text-emerald-600">{c.monthly_revenue.toLocaleString()} MZN</span>
                          <Link href={`/courses/${c.id}`} target="_blank" className="text-gray-300 hover:text-primary">
                            <ArrowUpRight size={14} />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Funnel stats */}
              <div className="card">
                <h2 className="font-black text-gray-900 mb-4 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Target size={16} className="text-primary" /> Funil de Vendas
                  </span>
                  <Link href="/admin/funnel" className="text-xs text-primary hover:underline font-normal">Ver tudo →</Link>
                </h2>
                {funnel ? (
                  <div className="space-y-3">
                    {[
                      { label: 'Leads totais',      value: funnel.total_leads,                       accent: 'text-gray-900' },
                      { label: 'Novos (7 dias)',     value: funnel.new_leads,                         accent: 'text-blue-600' },
                      { label: 'Taxa de conversão',  value: `${(funnel.conversion_rate ?? 0).toFixed(1)}%`, accent: 'text-emerald-600' },
                      { label: 'Convertidos',        value: funnel.by_status?.converted ?? 0,         accent: 'text-primary'  },
                    ].map(({ label, value, accent }) => (
                      <div key={label} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                        <span className="text-gray-600 text-sm">{label}</span>
                        <span className={`font-black ${accent}`}>{value}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <p className="text-sm">Dados do funil não disponíveis</p>
                    <Link href="/admin/funnel" className="text-xs text-primary hover:underline mt-1 block">Verificar funil →</Link>
                  </div>
                )}
              </div>
            </div>

            {/* ── Revenue by discipline ─────────────────────────────── */}
            {(kpis?.revenue_by_discipline ?? []).length > 0 && (
              <div className="card mb-6">
                <h2 className="font-black text-gray-900 mb-4 flex items-center gap-2">
                  <DollarSign size={16} className="text-emerald-500" /> Receita por Disciplina
                </h2>
                <div className="space-y-3">
                  {(kpis?.revenue_by_discipline ?? []).map(({ discipline, enrollments, revenue }) => {
                    const maxRev = Math.max(...(kpis?.revenue_by_discipline ?? []).map(d => d.revenue), 1)
                    const pct    = Math.round((revenue / maxRev) * 100)
                    return (
                      <div key={discipline} className="flex items-center gap-4">
                        <span className="text-sm text-gray-700 w-28 shrink-0 truncate">{discipline}</span>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-primary to-orange-400 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xs text-gray-400">{enrollments} inscritos</span>
                          <span className="text-xs font-bold text-gray-900 w-24 text-right">{revenue.toLocaleString()} MZN</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── Services health ───────────────────────────────────── */}
            {health && (
              <div className="card mb-6">
                <h2 className="font-black text-gray-900 flex items-center gap-2 mb-4">
                  <Zap size={17} className="text-primary" /> Estado dos Serviços
                  <span className={`ml-auto text-xs font-bold ${servicesUp === servicesTotal ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {servicesUp}/{servicesTotal} operacionais
                  </span>
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {Object.entries(health.services).map(([name, status]) => (
                    <div key={name} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5">
                      <span className="text-sm font-semibold text-gray-700 capitalize">{name}</span>
                      <StatusDot status={status} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Pending validation ────────────────────────────────── */}
            {pending.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <AlertCircle size={18} className="text-amber-600" />
                  <h2 className="font-black text-amber-900">
                    {pending.length} curso{pending.length > 1 ? 's' : ''} a aguardar validação
                  </h2>
                  <Link href="/admin/courses" className="ml-auto text-xs text-amber-700 hover:underline font-semibold">
                    Ver todos →
                  </Link>
                </div>
                <div className="space-y-2">
                  {pending.slice(0, 5).map((c: CoursePending) => (
                    <div key={c.id} className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-amber-100">
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{c.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{c.teacher_name} · {c.discipline_name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="badge badge-orange flex items-center gap-1"><Clock size={9} /> Pendente</span>
                        <button
                          onClick={() => validateCourse(c.id)}
                          className="btn-primary text-xs py-1.5 px-3 gap-1"
                        >
                          <CheckCircle size={12} /> Validar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Quick links ───────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { label: 'Cursos',       desc: 'Gerir e validar cursos',            color: 'from-purple-500 to-violet-600', Icon: BookOpen,   href: '/admin/courses'   },
                { label: 'Campanhas',    desc: 'Criar e lançar campanhas',           color: 'from-primary to-orange-600',    Icon: TrendingUp, href: '/admin/campaigns' },
                { label: 'Utilizadores', desc: 'Gerir professores e alunos',         color: 'from-blue-500 to-indigo-600',   Icon: Users,      href: '/admin/users'     },
                { label: 'Funil',        desc: 'Pipeline de leads',                  color: 'from-emerald-500 to-teal-600',  Icon: Target,     href: '/admin/funnel'    },
                { label: 'Pacotes',      desc: 'Básico, Lite e Premium',             color: 'from-amber-500 to-orange-600',  Icon: Star,       href: '/admin/packages'  },
                { label: 'Segurança',    desc: 'IPs bloqueados e ameaças',           color: 'from-red-500 to-rose-600',      Icon: Globe,      href: '/admin/security'  },
              ].map(({ label, desc, color, Icon, href }) => (
                <Link key={href} href={href}
                  className="card flex items-center gap-4 hover:shadow-card-lift hover:-translate-y-0.5 transition-all">
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shrink-0 shadow-md`}>
                    <Icon size={20} className="text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900">{label}</p>
                    <p className="text-xs text-gray-500 truncate">{desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  )
}
