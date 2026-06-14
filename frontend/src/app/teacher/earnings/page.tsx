'use client'

import { useEffect, useState } from 'react'
import { DollarSign, TrendingUp, Users, BookOpen, Info } from 'lucide-react'
import api from '@/lib/api'
import TeacherLayout from '@/components/TeacherLayout'

interface EarningsDetail {
  courses: CourseEarning[]
  total_mrr?: number
  total_teacher_share?: number
  total_students?: number
  commission_rate?: number
}

interface CourseEarning {
  id: string
  title: string
  level?: string
  active_enrollments?: number
  monthly_revenue?: number
  teacher_share?: number
}

interface PaymentsEarnings {
  total_earned?: number
  transaction_count?: number
  commission_rate?: number
}

const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Básico', intermediate: 'Intermédio', advanced: 'Avançado',
}

const LEVEL_COLORS: Record<string, string> = {
  beginner:     'bg-green-100 text-green-700',
  intermediate: 'bg-blue-100 text-blue-700',
  advanced:     'bg-purple-100 text-purple-700',
}

export default function TeacherEarningsPage() {
  const [detail,   setDetail]   = useState<EarningsDetail | null>(null)
  const [payments, setPayments] = useState<PaymentsEarnings | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')

  useEffect(() => {
    Promise.all([
      api.get('/teacher/earnings-detail').then(r => setDetail(r.data)).catch(() => {}),
      api.get('/payments/earnings').then(r => setPayments(r.data)).catch(() => {}),
    ])
      .catch(() => setError('Não foi possível carregar os dados de ganhos.'))
      .finally(() => setLoading(false))
  }, [])

  const totalEarned    = payments?.total_earned    ?? 0
  const txCount        = payments?.transaction_count ?? 0
  const totalMrr       = detail?.total_mrr         ?? 0
  const teacherShare   = detail?.total_teacher_share ?? 0
  const totalStudents  = detail?.total_students    ?? 0
  const commissionRate = detail?.commission_rate   ?? payments?.commission_rate ?? 70
  const platformRate   = 100 - commissionRate

  const courses  = detail?.courses ?? []
  const maxMrr   = courses.reduce((a, c) => Math.max(a, c.monthly_revenue ?? 0), 1)

  return (
    <TeacherLayout>
      <div className="px-4 md:px-8 py-8 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-gray-900">Ganhos</h1>
          <p className="text-gray-400 text-sm mt-1">Resumo das tuas receitas e comissões</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : error ? (
          <div className="card text-center py-12 text-red-500">{error}</div>
        ) : (
          <>
            {/* Summary gradient card */}
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white mb-6 shadow-xl shadow-emerald-200">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-emerald-100/70 text-xs font-semibold uppercase tracking-wide mb-1">Total Recebido</p>
                  <p className="text-3xl font-black">{totalEarned.toLocaleString('pt')}</p>
                  <p className="text-emerald-100/70 text-xs mt-0.5">MZN</p>
                </div>
                <div>
                  <p className="text-emerald-100/70 text-xs font-semibold uppercase tracking-wide mb-1">MRR Activo</p>
                  <p className="text-3xl font-black">{totalMrr.toLocaleString('pt')}</p>
                  <p className="text-emerald-100/70 text-xs mt-0.5">MZN / mês</p>
                </div>
                <div>
                  <p className="text-emerald-100/70 text-xs font-semibold uppercase tracking-wide mb-1">Comissão</p>
                  <p className="text-3xl font-black">{commissionRate}%</p>
                  <p className="text-emerald-100/70 text-xs mt-0.5">da tua parte</p>
                </div>
                <div>
                  <p className="text-emerald-100/70 text-xs font-semibold uppercase tracking-wide mb-1">Total Estudantes</p>
                  <p className="text-3xl font-black">{totalStudents}</p>
                  <p className="text-emerald-100/70 text-xs mt-0.5">inscritos activos</p>
                </div>
              </div>
            </div>

            {/* How earnings work */}
            <div className="card mb-6 bg-blue-50 border-blue-100">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Info size={15} className="text-blue-600" />
                </div>
                <div>
                  <p className="font-bold text-blue-900 mb-1">Como funcionam os ganhos</p>
                  <p className="text-sm text-blue-700 mb-2">
                    Para cada venda realizada na plataforma, a comissão é distribuída da seguinte forma:
                  </p>
                  <div className="flex gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-500" />
                      <span className="text-sm font-semibold text-blue-800">Professor: {commissionRate}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-400" />
                      <span className="text-sm font-semibold text-blue-800">Plataforma: {platformRate}%</span>
                    </div>
                  </div>
                  <div className="mt-3 h-3 bg-blue-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${commissionRate}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Per-course earnings table */}
            {courses.length > 0 && (
              <div className="mb-6">
                <h2 className="font-black text-gray-900 mb-4 flex items-center gap-2">
                  <BookOpen size={17} className="text-primary" /> Ganhos por Curso
                </h2>
                <div className="space-y-3">
                  {courses.map(c => {
                    const mrr         = c.monthly_revenue ?? 0
                    const share       = c.teacher_share ?? Math.round(mrr * (commissionRate / 100))
                    const enrolled    = c.active_enrollments ?? 0
                    const proportion  = maxMrr > 0 ? Math.round((mrr / maxMrr) * 100) : 0

                    return (
                      <div key={c.id} className="card">
                        <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <p className="font-bold text-gray-900 truncate">{c.title}</p>
                              {c.level && (
                                <span className={`badge ${LEVEL_COLORS[c.level] ?? 'bg-gray-100 text-gray-600'}`}>
                                  {LEVEL_LABELS[c.level] ?? c.level}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Users size={11} /> {enrolled} inscrições activas
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs text-gray-400">Receita mensal</p>
                            <p className="font-bold text-gray-900">{mrr.toLocaleString('pt')} MZN</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs text-gray-400">Tua parte ({commissionRate}%)</p>
                            <p className="font-bold text-emerald-600">{share.toLocaleString('pt')} MZN</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-100 rounded-full h-2">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all"
                              style={{ width: `${proportion}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-400 shrink-0">{proportion}% do MRR</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Estimated payout */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-5">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                    <DollarSign size={18} className="text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">Pagamento Mensal Estimado</p>
                    <p className="text-xs text-gray-500 mt-0.5">Os pagamentos são processados no início de cada mês</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black text-indigo-700">{teacherShare.toLocaleString('pt')}</p>
                  <p className="text-xs text-indigo-400 mt-0.5">MZN previsto</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-indigo-600 bg-indigo-100 rounded-lg px-3 py-2">
                <Info size={11} /> <span>Valor sujeito a confirmação final baseado nas transacções do mês</span>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="card text-center py-4">
                <TrendingUp size={20} className="mx-auto mb-2 text-emerald-500" />
                <p className="text-2xl font-black text-gray-900">{txCount}</p>
                <p className="text-xs text-gray-500">Transacções registadas</p>
              </div>
              <div className="card text-center py-4">
                <DollarSign size={20} className="mx-auto mb-2 text-indigo-500" />
                <p className="text-2xl font-black text-gray-900">{totalEarned.toLocaleString('pt')}</p>
                <p className="text-xs text-gray-500">Total histórico (MZN)</p>
              </div>
            </div>
          </>
        )}
      </div>
    </TeacherLayout>
  )
}
