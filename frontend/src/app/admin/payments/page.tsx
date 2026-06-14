'use client'

import { useEffect, useState, useCallback } from 'react'
import { DollarSign, RefreshCw, TrendingUp, Users, BookOpen, Package } from 'lucide-react'
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
}

interface FinancialSummary {
  total_earned: number
  transaction_count: number
  pending_payouts: number
}

export default function AdminPaymentsPage() {
  const [kpis,    setKpis]    = useState<KPIs | null>(null)
  const [summary, setSummary] = useState<FinancialSummary | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [kpisRes, summaryRes] = await Promise.all([
        api.get('/admin/kpis').catch(() => ({ data: null })),
        api.get('/admin/financial/summary').catch(() => ({ data: null })),
      ])
      setKpis(kpisRes.data)
      setSummary(summaryRes.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const mrr = kpis?.mrr ?? 0
  const arr = mrr * 12

  return (
    <AdminLayout>
      <div className="px-6 py-8 max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <DollarSign size={22} className="text-primary" /> Gestão Financeira
            </h1>
            <p className="text-gray-400 text-sm mt-1">Subscrições, MRR e pagamentos</p>
          </div>
          <button onClick={load} disabled={loading} className="btn-outline gap-2 text-sm py-2 px-4">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Actualizar
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* MRR summary */}
            <div className="card mb-6 bg-gradient-to-br from-[#061924] to-secondary text-white">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                <div>
                  <p className="text-white/50 text-xs uppercase font-semibold tracking-wide">MRR</p>
                  <p className="text-3xl font-black mt-1 tabular-nums">
                    {mrr.toLocaleString('pt-PT')} <span className="text-sm font-normal text-white/50">MZN</span>
                  </p>
                </div>
                <div>
                  <p className="text-white/50 text-xs uppercase font-semibold tracking-wide">ARR estimado</p>
                  <p className="text-3xl font-black mt-1 tabular-nums">
                    {arr.toLocaleString('pt-PT')} <span className="text-sm font-normal text-white/50">MZN</span>
                  </p>
                </div>
                <div>
                  <p className="text-white/50 text-xs uppercase font-semibold tracking-wide">Subscritores</p>
                  <p className="text-3xl font-black mt-1">{kpis?.active_total ?? 0}</p>
                </div>
                <div>
                  <p className="text-white/50 text-xs uppercase font-semibold tracking-wide">ARPU</p>
                  <p className="text-3xl font-black mt-1 tabular-nums">
                    {kpis?.active_total ? Math.round(mrr / kpis.active_total).toLocaleString('pt-PT') : '0'}
                    <span className="text-sm font-normal text-white/50 ml-1">MZN</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Subscriptions by package */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {[
                { label: 'Básico',   price: 500,  count: kpis?.active_basic   ?? 0, color: 'from-gray-400 to-gray-600',   Icon: Package  },
                { label: 'Lite',     price: 1500, count: kpis?.active_lite    ?? 0, color: 'from-primary to-orange-600',  Icon: TrendingUp },
                { label: 'Premium',  price: 3500, count: kpis?.active_premium ?? 0, color: 'from-secondary to-blue-700',  Icon: Users    },
              ].map(({ label, price, count, color, Icon }) => (
                <div key={label} className={`rounded-2xl bg-gradient-to-br ${color} p-5 text-white shadow-lg`}>
                  <Icon size={22} className="text-white/70 mb-3" />
                  <p className="text-3xl font-black">{count}</p>
                  <p className="text-white/70 text-sm mt-1">{label} · {price.toLocaleString()} MZN/mês</p>
                  <p className="text-white/50 text-xs mt-1">{(count * price).toLocaleString()} MZN MRR</p>
                </div>
              ))}
            </div>

            {/* Enrollment stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="card">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <TrendingUp size={18} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-black text-gray-900">{kpis?.new_enrollments_this_month ?? 0}</p>
                    <p className="text-gray-500 text-xs">Novas inscrições este mês</p>
                  </div>
                </div>
                <p className="text-xs text-gray-400">Mês anterior: {kpis?.new_enrollments_last_month ?? 0}</p>
              </div>
              <div className="card">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <BookOpen size={18} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-black text-gray-900">{summary?.transaction_count ?? '—'}</p>
                    <p className="text-gray-500 text-xs">Transacções totais</p>
                  </div>
                </div>
                <p className="text-xs text-gray-400">
                  Processado: {summary ? `${(summary.total_earned ?? 0).toLocaleString()} MZN` : '—'}
                </p>
              </div>
            </div>

            {/* Pending */}
            {summary?.pending_payouts != null && summary.pending_payouts > 0 && (
              <div className="card bg-amber-50 border-amber-200">
                <div className="flex items-center gap-3">
                  <DollarSign size={20} className="text-amber-600" />
                  <div>
                    <p className="font-black text-amber-900">Pagamentos pendentes</p>
                    <p className="text-amber-700 text-sm">{summary.pending_payouts.toLocaleString()} MZN por pagar</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  )
}
