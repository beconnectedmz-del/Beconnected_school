'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  BookOpen, Users, Calendar, DollarSign,
  ChevronRight, Plus, BarChart3, TrendingUp,
  Zap, ArrowUpRight, Clock, CheckCircle,
} from 'lucide-react'
import api from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import TeacherLayout from '@/components/TeacherLayout'

interface Course {
  id: string
  title: string
  discipline?: string
  level: string
  is_published: boolean
  enrolled_count?: number
  total_enrollments?: number
}

interface Earnings {
  total_earned: number
  transaction_count: number
  commission_rate?: number
}

interface Session {
  id: string
  student_name: string
  course_title?: string
  discipline?: string
  scheduled_at: string
  status: string
  duration_minutes?: number
}

const TIPS = [
  'Cursos com vídeo de apresentação têm 3× mais inscrições.',
  'Responde a comentários em 24h para aumentar a tua avaliação.',
  'Adiciona subtítulos para aumentar o alcance internacional.',
  'Professores com foto de perfil ganham 40% mais confiança.',
]

const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Básico',
  intermediate: 'Intermédio',
  advanced: 'Avançado',
}

const GRADIENTS = [
  'from-blue-500 to-indigo-600',
  'from-purple-500 to-pink-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-500',
  'from-rose-500 to-pink-600',
]

export default function TeacherDashboard() {
  const { user } = useAuthStore()
  const [courses,  setCourses]  = useState<Course[]>([])
  const [earnings, setEarnings] = useState<Earnings | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading,  setLoading]  = useState(true)

  const tip = TIPS[new Date().getDay() % TIPS.length]

  useEffect(() => {
    Promise.all([
      api.get('/teacher/my-courses').then(r => setCourses(r.data || [])).catch(() => {}),
      api.get('/payments/earnings').then(r => setEarnings(r.data)).catch(() => {}),
      api.get('/sessions/my').then(r => setSessions(r.data.data || r.data || [])).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  const publishedCount    = courses.filter(c => c.is_published).length
  const totalStudents     = courses.reduce((a, c) => a + (c.enrolled_count ?? c.total_enrollments ?? 0), 0)
  const upcomingSessions  = sessions.filter(s => s.status === 'scheduled')
  const totalEarned       = earnings?.total_earned ?? 0

  return (
    <TeacherLayout>
      <div className="px-4 md:px-8 py-8 max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-black text-gray-900">
              Olá, {user?.full_name?.split(' ')[0] || 'Professor'} 👋
            </h1>
            <p className="text-gray-400 text-sm mt-1">Área do professor · Bem-vindo de volta</p>
          </div>
          <div className="flex gap-2">
            <Link href="/teacher/courses" className="btn-outline gap-2 text-sm py-2.5 px-4 self-start sm:self-auto">
              Ver todos os cursos
            </Link>
            <Link href="/teacher/courses" className="btn-primary gap-2 text-sm py-2.5 px-4 self-start sm:self-auto shadow-lg shadow-primary/20">
              <Plus size={16} /> Criar Curso
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {/* Earnings hero card */}
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white col-span-2 shadow-xl shadow-emerald-200">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-emerald-100/80 text-xs font-semibold uppercase tracking-wide">Total Ganhos</p>
                <p className="text-4xl font-black mt-1">
                  {totalEarned.toLocaleString('pt-MZ')} <span className="text-xl font-semibold text-emerald-100/70">MZN</span>
                </p>
              </div>
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <DollarSign size={20} className="text-white" />
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-100/80 text-xs">
              <TrendingUp size={12} />
              {earnings?.transaction_count ?? 0} transacções registadas
            </div>
          </div>

          <div className="card flex flex-col justify-between bg-blue-50 border-0">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
              <BookOpen size={18} className="text-primary" />
            </div>
            <div>
              <p className="text-3xl font-black text-gray-900 mt-3">{publishedCount}</p>
              <p className="text-gray-500 text-xs mt-0.5">Cursos Publicados</p>
            </div>
          </div>

          <div className="card flex flex-col justify-between bg-purple-50 border-0">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
              <Users size={18} className="text-secondary" />
            </div>
            <div>
              <p className="text-3xl font-black text-gray-900 mt-3">{totalStudents}</p>
              <p className="text-gray-500 text-xs mt-0.5">Total Estudantes</p>
            </div>
          </div>
        </div>

        {/* Upcoming sessions quick stat */}
        <div className="card mb-8 flex items-center gap-4 py-4 bg-indigo-50 border-0">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
            <Calendar size={22} className="text-indigo-600" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-gray-900">{upcomingSessions.length} Próximas Sessões</p>
            <p className="text-xs text-gray-500 mt-0.5">Sessões agendadas aguardam a tua confirmação</p>
          </div>
          <Link href="/teacher/sessions" className="text-indigo-600 text-sm font-semibold flex items-center gap-1 hover:gap-2 transition-all shrink-0">
            Ver todas <ChevronRight size={14} />
          </Link>
        </div>

        {/* Tip of the day */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-start gap-3 mb-8">
          <div className="w-8 h-8 rounded-lg bg-amber-400 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
            <Zap size={15} className="text-white" />
          </div>
          <div>
            <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-0.5">Dica do dia</p>
            <p className="text-sm text-amber-900 font-medium">{tip}</p>
          </div>
        </div>

        {/* My courses preview */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-black text-gray-900 flex items-center gap-2">
              <BookOpen size={17} className="text-primary" /> Meus Cursos
            </h2>
            <Link href="/teacher/courses" className="text-primary text-sm font-semibold flex items-center gap-1 hover:gap-2 transition-all">
              Ver todos <ChevronRight size={14} />
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
            </div>
          ) : courses.length === 0 ? (
            <div className="card text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <BookOpen size={28} className="text-primary/50" />
              </div>
              <p className="font-semibold text-gray-700 mb-1">Ainda não criaste nenhum curso</p>
              <p className="text-gray-400 text-sm mb-6">Professores com cursos publicados ganham 3× mais.</p>
              <Link href="/teacher/courses" className="btn-primary inline-flex gap-2">
                <Plus size={16} /> Criar primeiro curso
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {courses.slice(0, 5).map((c, i) => {
                const enrolled = c.enrolled_count ?? c.total_enrollments ?? 0
                return (
                  <Link key={c.id} href={`/teacher/courses/${c.id}`}>
                    <div className="card flex items-center gap-4 py-4 hover:shadow-card-lift hover:-translate-y-0.5 transition-all cursor-pointer">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${GRADIENTS[i % GRADIENTS.length]} flex items-center justify-center shrink-0 shadow-md`}>
                        <BookOpen size={18} className="text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="font-bold text-gray-900 truncate">{c.title}</p>
                          {c.discipline && (
                            <span className="badge bg-blue-100 text-blue-700 shrink-0">{c.discipline}</span>
                          )}
                          <span className="badge bg-gray-100 text-gray-600 shrink-0">{LEVEL_LABELS[c.level] ?? c.level}</span>
                          <span className={`badge shrink-0 ${c.is_published ? 'badge-green' : 'bg-yellow-100 text-yellow-700'}`}>
                            {c.is_published ? <><CheckCircle size={9} /> Publicado</> : 'Rascunho'}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Users size={11} /> {enrolled} inscritos
                        </span>
                      </div>
                      <ArrowUpRight size={16} className="text-gray-300 shrink-0" />
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </section>

        {/* Upcoming sessions preview */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-black text-gray-900 flex items-center gap-2">
              <Calendar size={17} className="text-secondary" /> Próximas Sessões
            </h2>
            <Link href="/teacher/sessions" className="text-secondary text-sm font-semibold flex items-center gap-1 hover:gap-2 transition-all">
              Ver todas <ChevronRight size={14} />
            </Link>
          </div>

          {upcomingSessions.length === 0 ? (
            <div className="card text-center py-10">
              <Calendar size={32} className="mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 text-sm font-medium mb-1">Sem sessões agendadas</p>
              <p className="text-gray-400 text-xs">Agenda novas sessões com os teus estudantes.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingSessions.slice(0, 3).map(s => {
                const dt = new Date(s.scheduled_at)
                const isToday = new Date().toDateString() === dt.toDateString()
                return (
                  <div key={s.id} className="card flex items-center gap-4 py-4 hover:shadow-md transition-shadow">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-md ${isToday ? 'bg-gradient-to-br from-secondary to-purple-600' : 'bg-gradient-to-br from-secondary/20 to-purple-100'}`}>
                      <Calendar size={18} className={isToday ? 'text-white' : 'text-secondary'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-gray-900">{s.student_name}</p>
                        {s.course_title && <span className="text-xs text-gray-500">{s.course_title}</span>}
                        {isToday && <span className="badge bg-orange-100 text-orange-700">Hoje</span>}
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1.5">
                        <Clock size={11} /> {dt.toLocaleDateString('pt-PT')} às {dt.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                        {s.duration_minutes && <><span className="text-gray-200 mx-0.5">·</span>{s.duration_minutes} min</>}
                      </p>
                    </div>
                    <span className="badge badge-green">Confirmado</span>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Quick actions */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="card flex items-center gap-4 py-4 hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
              <BarChart3 size={18} className="text-indigo-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">Ver Ganhos</p>
              <p className="text-xs text-gray-500">Receitas e comissões detalhadas</p>
            </div>
            <Link href="/teacher/earnings" className="text-primary text-sm font-semibold flex items-center gap-1 hover:gap-2 transition-all">
              <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="card flex items-center gap-4 py-4 hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
              <Users size={18} className="text-purple-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">Os Meus Estudantes</p>
              <p className="text-xs text-gray-500">Progresso e desempenho</p>
            </div>
            <Link href="/teacher/students" className="text-secondary text-sm font-semibold flex items-center gap-1 hover:gap-2 transition-all">
              <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>

      </div>
    </TeacherLayout>
  )
}
