'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  BookOpen, Calendar, LogOut, User, Star, Clock, ChevronRight,
  Flame, Trophy, Zap, TrendingUp, Award, Target, ArrowRight,
  Crown, BarChart3, Play, CheckCircle,
} from 'lucide-react'
import api from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Enrollment {
  id: string
  course_id: string
  title: string
  progress_pct: number
  enrolled_at: string
}

interface Session {
  id: string
  discipline: string
  teacher_name: string
  scheduled_at: string
  status: string
  room_id: string
}

interface Recommendation {
  teacher_id: string
  full_name: string
  rating: number
  price_per_hour: number
  match_score: number
  match_reasons: string[]
}

const ACHIEVEMENTS = [
  { id: 'first',    label: 'Primeiro curso',   Icon: BookOpen,  color: 'from-blue-400 to-indigo-500',    unlocked: (e: number) => e >= 1 },
  { id: 'streak3',  label: '3 dias seguidos',  Icon: Flame,     color: 'from-orange-400 to-red-500',     unlocked: () => true },
  { id: 'star',     label: 'Aluno estrela',    Icon: Star,      color: 'from-yellow-400 to-amber-500',   unlocked: (e: number) => e >= 2 },
  { id: 'advanced', label: 'Em progresso',     Icon: TrendingUp,color: 'from-emerald-400 to-teal-500',  unlocked: (e: number) => e >= 1 },
]

const MOTIVATIONAL = [
  'Cada aula te aproxima do teu objectivo!',
  'A consistência é a chave do sucesso.',
  'Hoje é um bom dia para aprender algo novo.',
  'Estás no caminho certo, continua assim!',
]

export default function StudentDashboard() {
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const [enrollments,     setEnrollments]     = useState<Enrollment[]>([])
  const [sessions,        setSessions]        = useState<Session[]>([])
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [streak]     = useState(7)
  const [xp]         = useState(340)
  const [nextXp]     = useState(500)
  const [activeNav, setActiveNav] = useState('/dashboard')
  const motivational = MOTIVATIONAL[new Date().getDay() % MOTIVATIONAL.length]

  useEffect(() => {
    if (!user) { router.push('/login'); return }
    if (user.role === 'admin') { router.push('/admin'); return }
    if (user.role !== 'student') { router.push('/teacher'); return }
    Promise.all([
      api.get('/enrollments/my').then(r => setEnrollments(r.data.data || r.data)).catch(() => {}),
      api.get('/sessions/my').then(r => setSessions(r.data.data || r.data)).catch(() => {}),
      api.get(`/ai/recommendations/${user.id}`).then(r => setRecommendations(r.data.slice(0, 3))).catch(() => {}),
    ])
  }, [user, router])

  if (!user) return null

  const scheduledSessions = sessions.filter(s => s.status === 'scheduled')
  const xpPct = Math.round((xp / nextXp) * 100)
  const enrollCount = enrollments.length

  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <aside className="w-64 min-h-screen bg-white border-r border-gray-100 px-4 py-6 flex flex-col hidden md:flex shadow-sm">
        <Link href="/" className="flex items-center gap-2 mb-8 group">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-md shadow-primary/30 group-hover:scale-105 transition-transform">
            <Crown size={15} className="text-white" />
          </div>
          <span className="text-lg font-black leading-none">
            <span className="text-primary">Be</span><span className="text-secondary">connect</span>
            <span className="text-secondary/50 font-semibold text-xs"> School</span>
          </span>
        </Link>

        {/* XP bar */}
        <div className="bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/10 rounded-2xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xs font-black shadow-sm">
              {user.full_name?.charAt(0) || 'U'}
            </div>
            <div>
              <p className="text-xs font-bold text-gray-900 leading-none">{user.full_name?.split(' ')[0]}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Nível 3 · Aprendiz</p>
            </div>
            <div className="ml-auto flex items-center gap-1 bg-orange-100 text-orange-600 text-xs font-bold px-2 py-0.5 rounded-full">
              <Flame size={11} /> {streak}d
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span className="font-semibold text-primary">{xp} XP</span>
            <span>{nextXp} XP</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all"
              style={{ width: `${xpPct}%` }}
            />
          </div>
          <p className="text-[10px] text-gray-400 mt-1.5 text-center">{nextXp - xp} XP para o próximo nível</p>
        </div>

        <nav className="space-y-1 flex-1">
          {[
            { href: '/dashboard',         Icon: BarChart3,  label: 'Dashboard'        },
            { href: '/courses',           Icon: BookOpen,   label: 'Explorar cursos'  },
            { href: '/dashboard/sessions',Icon: Calendar,   label: 'Minhas sessões'   },
            { href: '/profile',           Icon: User,       label: 'Perfil'           },
          ].map(({ href, Icon, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setActiveNav(href)}
              className={activeNav === href ? 'nav-item-active' : 'nav-item'}
            >
              <Icon size={17} />
              {label}
            </Link>
          ))}
        </nav>

        <button
          onClick={logout}
          className="flex items-center gap-2 text-gray-400 hover:text-danger text-sm px-3 py-2 transition-colors mt-2"
        >
          <LogOut size={15} /> Sair
        </button>
      </aside>

      {/* ── Main ─────────────────────────────────────────────────────── */}
      <main className="flex-1 px-4 md:px-8 py-8 max-w-5xl overflow-auto">

        {/* Welcome */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-black text-gray-900">
              Olá, {user.full_name?.split(' ')[0] || 'Estudante'} 👋
            </h1>
            <p className="text-gray-400 text-sm mt-1">{motivational}</p>
          </div>
          <Link href="/courses" className="btn-primary text-sm py-2 px-5 gap-2 self-start sm:self-auto">
            <BookOpen size={15} /> Explorar cursos
          </Link>
        </div>

        {/* ── Streak + stats strip ─────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {/* Streak */}
          <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl p-4 text-white col-span-2 md:col-span-1 shadow-lg shadow-orange-200">
            <div className="flex items-center justify-between mb-2">
              <Flame size={20} />
              <span className="text-orange-100 text-xs font-semibold">Streak</span>
            </div>
            <p className="text-4xl font-black">{streak}</p>
            <p className="text-orange-100 text-xs mt-0.5">dias consecutivos</p>
          </div>

          {[
            { label: 'Cursos activos',    value: enrollCount,              Icon: BookOpen,  colorClass: 'text-primary'   },
            { label: 'Sessões agendadas', value: scheduledSessions.length, Icon: Calendar,  colorClass: 'text-secondary' },
            { label: 'XP acumulado',      value: xp,                       Icon: Zap,       colorClass: 'text-amber-500' },
          ].map(({ label, value, Icon, colorClass }) => (
            <div key={label} className="card flex flex-col justify-between">
              <Icon size={18} className={`${colorClass} mb-2`} />
              <p className="text-3xl font-black text-gray-900">{value}</p>
              <p className="text-gray-400 text-xs mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* ── Achievements ─────────────────────────────────────────── */}
        <div className="card mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-black text-gray-900 flex items-center gap-2">
              <Trophy size={17} className="text-amber-500" /> Conquistas
            </h2>
            <span className="badge-orange">{ACHIEVEMENTS.filter(a => a.unlocked(enrollCount)).length}/{ACHIEVEMENTS.length}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {ACHIEVEMENTS.map((ach) => {
              const unlocked = ach.unlocked(enrollCount)
              return (
                <div
                  key={ach.id}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                    unlocked ? 'border-transparent bg-gradient-to-br ' + ach.color + '/10' : 'border-gray-100 bg-gray-50 opacity-50 grayscale'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${ach.color} flex items-center justify-center shadow-md`}>
                    <ach.Icon size={18} className="text-white" />
                  </div>
                  <p className="text-xs font-semibold text-center text-gray-700 leading-tight">{ach.label}</p>
                  {unlocked && <CheckCircle size={12} className="text-emerald-500" fill="currentColor" />}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Courses in progress ───────────────────────────────────── */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-black text-gray-900 flex items-center gap-2">
              <Target size={17} className="text-primary" /> Cursos em progresso
            </h2>
            <Link href="/courses" className="text-primary text-sm font-semibold flex items-center gap-1 hover:gap-2 transition-all">
              Ver todos <ChevronRight size={14} />
            </Link>
          </div>

          {enrollments.length === 0 ? (
            <div className="card text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <BookOpen size={28} className="text-primary/50" />
              </div>
              <p className="font-semibold text-gray-700 mb-1">Ainda não estás inscrito em nenhum curso</p>
              <p className="text-gray-400 text-sm mb-6">Explora o catálogo e começa a aprender hoje.</p>
              <Link href="/courses" className="btn-primary inline-flex gap-2">
                <BookOpen size={16} /> Explorar cursos
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {enrollments.slice(0, 3).map((e, i) => {
                const pct = Math.round(e.progress_pct)
                const levelColors = ['from-blue-500 to-indigo-600', 'from-purple-500 to-pink-600', 'from-emerald-500 to-teal-600']
                return (
                  <Link key={e.id} href={`/courses/${e.course_id}`}>
                    <div className="card flex items-center gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer py-4">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${levelColors[i % 3]} flex items-center justify-center shrink-0 shadow-md`}>
                        <Play size={18} className="text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 truncate">{e.title}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div
                              className={`bg-gradient-to-r ${levelColors[i % 3]} h-2 rounded-full transition-all`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-gray-500 shrink-0 w-10 text-right">{pct}%</span>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-gray-300" />
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </section>

        {/* ── Upcoming sessions ────────────────────────────────────── */}
        {scheduledSessions.length > 0 && (
          <section className="mb-8">
            <h2 className="font-black text-gray-900 mb-4 flex items-center gap-2">
              <Calendar size={17} className="text-secondary" /> Próximas sessões
            </h2>
            <div className="space-y-3">
              {scheduledSessions.slice(0, 3).map((s) => (
                <div key={s.id} className="card flex items-center gap-4 py-4 hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-secondary/20 to-purple-100 flex items-center justify-center shrink-0">
                    <Calendar size={20} className="text-secondary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900">{s.discipline}</p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Prof. {s.teacher_name} ·{' '}
                      {format(new Date(s.scheduled_at), "d MMM, HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <Link href={`/session/${s.room_id}`} className="btn-primary text-xs py-1.5 px-4">
                    Entrar
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── AI Recommendations ───────────────────────────────────── */}
        {recommendations.length > 0 && (
          <section>
            <h2 className="font-black text-gray-900 mb-4 flex items-center gap-2">
              <Zap size={17} className="text-amber-500" /> Professores recomendados para ti
              <span className="badge-orange text-[10px] ml-1">IA</span>
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              {recommendations.map((r, i) => {
                const colors = ['from-blue-500 to-indigo-600', 'from-purple-500 to-pink-600', 'from-emerald-500 to-teal-600']
                return (
                  <div key={r.teacher_id} className="card hover:shadow-card-lift hover:-translate-y-1 transition-all">
                    <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${colors[i % 3]} flex items-center justify-center mb-3 shadow-md`}>
                      <span className="text-white font-black text-sm">{r.full_name.charAt(0)}</span>
                    </div>
                    <p className="font-bold text-gray-900">{r.full_name}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Star size={12} fill="currentColor" className="text-amber-400" />
                      <span className="text-sm font-bold text-gray-700">{r.rating.toFixed(1)}</span>
                      <span className="badge-purple ml-2 text-[10px]">
                        {Math.round(r.match_score * 100)}% match
                      </span>
                    </div>
                    <p className="text-primary font-black text-sm mt-2">{r.price_per_hour.toLocaleString()} MZN/h</p>
                    {r.match_reasons[0] && (
                      <p className="text-xs text-gray-400 mt-1 line-clamp-1">{r.match_reasons[0]}</p>
                    )}
                    <Link href={`/teachers/${r.teacher_id}`} className="btn-outline w-full mt-4 text-sm py-2 rounded-xl">
                      Ver perfil <ArrowRight size={14} />
                    </Link>
                  </div>
                )
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
