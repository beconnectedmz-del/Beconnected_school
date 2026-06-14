'use client'

import { useEffect, useState } from 'react'
import { Users, Search, X, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react'
import api from '@/lib/api'
import TeacherLayout from '@/components/TeacherLayout'

interface Student {
  student_id: string
  full_name: string
  email?: string
  course_title?: string
  course_id?: string
  level?: string
  package_type?: string
  progress_pct?: number
  enrolled_at?: string
  lessons_completed?: number
  total_lessons?: number
  status?: string
}

interface Course {
  id: string
  title: string
}

const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Básico', intermediate: 'Intermédio', advanced: 'Avançado',
}

const PACKAGE_LABELS: Record<string, string> = {
  basic: 'Básico', lite: 'Lite', premium: 'Premium',
}

const PACKAGE_COLORS: Record<string, string> = {
  basic:   'bg-blue-100 text-blue-700',
  lite:    'bg-purple-100 text-purple-700',
  premium: 'bg-amber-100 text-amber-700',
}

const PAGE_SIZE = 20

export default function TeacherStudentsPage() {
  const [students,  setStudents]  = useState<Student[]>([])
  const [courses,   setCourses]   = useState<Course[]>([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')
  const [search,    setSearch]    = useState('')
  const [courseFilter, setCourseFilter] = useState('')
  const [page,      setPage]      = useState(1)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Feedback modal
  const [feedbackStudent, setFeedbackStudent] = useState<Student | null>(null)
  const [feedbackMsg,     setFeedbackMsg]     = useState('')
  const [feedbackSending, setFeedbackSending] = useState(false)
  const [feedbackSent,    setFeedbackSent]    = useState(false)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.get('/teacher/students').then(r => setStudents(r.data || [])).catch(() => setError('Não foi possível carregar os estudantes.')),
      api.get('/teacher/my-courses').then(r => setCourses(r.data || [])).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  const filtered = students.filter(s => {
    const matchSearch = !search ||
      s.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (s.email ?? '').toLowerCase().includes(search.toLowerCase())
    const matchCourse = !courseFilter || s.course_id === courseFilter
    return matchSearch && matchCourse
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const activeCount  = students.filter(s => s.status === 'active' || !s.status).length
  const avgProgress  = students.length > 0
    ? Math.round(students.reduce((a, s) => a + (s.progress_pct ?? 0), 0) / students.length)
    : 0

  const handleFeedback = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!feedbackStudent || !feedbackMsg.trim()) return
    setFeedbackSending(true)
    try {
      await api.post(`/teacher/students/${feedbackStudent.student_id}/message`, {
        message: feedbackMsg,
        subject: `Mensagem do seu professor — ${feedbackStudent.course_title ?? 'Curso'}`,
      })
      setFeedbackSent(true)
      setTimeout(() => { setFeedbackSent(false); setFeedbackStudent(null); setFeedbackMsg('') }, 2500)
    } catch {
      alert('Erro ao enviar mensagem. Tenta novamente.')
    } finally {
      setFeedbackSending(false)
    }
  }

  return (
    <TeacherLayout>
      <div className="px-4 md:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-black text-gray-900">Os Meus Estudantes</h1>
          <p className="text-gray-400 text-sm mt-1">{students.length} estudante{students.length !== 1 ? 's' : ''} no total</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="card flex items-center gap-4 py-4 bg-indigo-50 border-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
              <Users size={18} className="text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-black text-gray-900">{students.length}</p>
              <p className="text-xs text-gray-500">Total Estudantes</p>
            </div>
          </div>
          <div className="card flex items-center gap-4 py-4 bg-green-50 border-0">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
              <Users size={18} className="text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-black text-gray-900">{activeCount}</p>
              <p className="text-xs text-gray-500">Activos</p>
            </div>
          </div>
          <div className="card flex items-center gap-4 py-4 bg-purple-50 border-0">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
              <Users size={18} className="text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-black text-gray-900">{avgProgress}%</p>
              <p className="text-xs text-gray-500">Progresso Médio</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              className="input w-full pl-9"
              placeholder="Pesquisar por nome ou email..."
            />
          </div>
          <select
            value={courseFilter}
            onChange={e => { setCourseFilter(e.target.value); setPage(1) }}
            className="input sm:w-56"
          >
            <option value="">Todos os cursos</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : error ? (
          <div className="card text-center py-12 text-red-500">{error}</div>
        ) : paginated.length === 0 ? (
          <div className="card text-center py-16">
            <Users size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="font-semibold text-gray-700">Nenhum estudante encontrado</p>
            <p className="text-gray-400 text-sm mt-1">
              {search || courseFilter ? 'Tenta alterar os filtros.' : 'Os estudantes aparecerão aqui quando se inscreverem nos teus cursos.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {paginated.map(s => {
              const progress  = s.progress_pct ?? 0
              const isExpanded = expandedId === s.student_id
              const initials  = s.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
              const colors    = ['from-blue-500 to-indigo-600', 'from-purple-500 to-pink-600', 'from-emerald-500 to-teal-600', 'from-amber-500 to-orange-500']
              const colorIdx  = s.full_name.charCodeAt(0) % colors.length

              return (
                <div key={`${s.student_id}-${s.course_id}`} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3">
                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${colors[colorIdx]} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                      {initials}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900 text-sm">{s.full_name}</p>
                        {s.package_type && (
                          <span className={`badge text-[10px] ${PACKAGE_COLORS[s.package_type] ?? 'bg-gray-100 text-gray-600'}`}>
                            {PACKAGE_LABELS[s.package_type] ?? s.package_type}
                          </span>
                        )}
                      </div>
                      {s.email && <p className="text-xs text-gray-400 truncate">{s.email}</p>}
                      {s.course_title && (
                        <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1 flex-wrap">
                          {s.course_title}
                          {s.level && <span className="text-gray-300">·</span>}
                          {s.level && <span>{LEVEL_LABELS[s.level] ?? s.level}</span>}
                        </p>
                      )}
                    </div>

                    {/* Progress */}
                    <div className="hidden sm:flex flex-col items-end gap-1 w-28 shrink-0">
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className="h-full bg-gradient-to-r from-secondary to-primary rounded-full"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{progress}%</span>
                    </div>

                    {/* Enrolled date */}
                    {s.enrolled_at && (
                      <span className="text-xs text-gray-400 shrink-0 hidden lg:block">
                        {new Date(s.enrolled_at).toLocaleDateString('pt-PT')}
                      </span>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => { setFeedbackStudent(s); setFeedbackMsg(''); setFeedbackSent(false) }}
                        className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-indigo-100 flex items-center justify-center text-gray-500 hover:text-indigo-600 transition-colors"
                        title="Enviar Feedback"
                      >
                        <MessageSquare size={14} />
                      </button>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : s.student_id)}
                        className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
                      >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded progress detail */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
                      <div className="flex items-center gap-6 text-sm text-gray-600">
                        <div>
                          <span className="text-xs text-gray-400 block">Aulas concluídas</span>
                          <span className="font-bold text-gray-900">{s.lessons_completed ?? '—'}</span>
                          {s.total_lessons && <span className="text-gray-400"> / {s.total_lessons}</span>}
                        </div>
                        <div>
                          <span className="text-xs text-gray-400 block">Progresso geral</span>
                          <span className="font-bold text-gray-900">{progress}%</span>
                        </div>
                        {s.enrolled_at && (
                          <div>
                            <span className="text-xs text-gray-400 block">Inscrito em</span>
                            <span className="font-bold text-gray-900">{new Date(s.enrolled_at).toLocaleDateString('pt-PT')}</span>
                          </div>
                        )}
                        {/* Mobile progress bar */}
                        <div className="flex-1 sm:hidden">
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div className="h-full bg-gradient-to-r from-secondary to-primary rounded-full" style={{ width: `${progress}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-outline text-sm py-2 px-4 disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="text-sm text-gray-500">Página {page} de {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn-outline text-sm py-2 px-4 disabled:opacity-40"
            >
              Seguinte
            </button>
          </div>
        )}
      </div>

      {/* Feedback Modal */}
      {feedbackStudent && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-black text-gray-900">Feedback para {feedbackStudent.full_name.split(' ')[0]}</h2>
              <button onClick={() => setFeedbackStudent(null)} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleFeedback} className="p-6 space-y-4">
              {feedbackSent ? (
                <div className="text-center py-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <MessageSquare size={22} className="text-green-600" />
                  </div>
                  <p className="font-semibold text-green-700">Mensagem enviada!</p>
                </div>
              ) : (
                <>
                  <textarea
                    value={feedbackMsg}
                    onChange={e => setFeedbackMsg(e.target.value)}
                    className="input w-full h-28 resize-none"
                    placeholder="Escreve o teu feedback ou mensagem de encorajamento..."
                    required
                  />
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setFeedbackStudent(null)} className="flex-1 btn-outline">Cancelar</button>
                    <button type="submit" disabled={feedbackSending} className="flex-1 btn-primary">
                      {feedbackSending ? 'A enviar...' : 'Enviar'}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </TeacherLayout>
  )
}
