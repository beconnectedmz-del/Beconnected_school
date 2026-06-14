'use client'

import { useEffect, useState } from 'react'
import {
  Calendar, Plus, X, Clock, AlertCircle,
} from 'lucide-react'
import api from '@/lib/api'
import TeacherLayout from '@/components/TeacherLayout'

interface Session {
  id: string
  student_name?: string
  course_title?: string
  discipline?: string
  scheduled_at: string
  duration_minutes?: number
  status: string
  room_id?: string
}

interface Course {
  id: string
  title: string
}

interface Student {
  student_id: string
  full_name: string
  email?: string
}

type FilterTab = 'todas' | 'agendadas' | 'concluidas' | 'canceladas'

const STATUS_LABELS: Record<string, string> = {
  scheduled:  'Agendada',
  completed:  'Concluída',
  cancelled:  'Cancelada',
}

const STATUS_COLORS: Record<string, string> = {
  scheduled:  'bg-blue-100 text-blue-700',
  completed:  'bg-green-100 text-green-700',
  cancelled:  'bg-red-100 text-red-700',
}

export default function TeacherSessionsPage() {
  const [sessions,  setSessions]  = useState<Session[]>([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')
  const [tab,       setTab]       = useState<FilterTab>('todas')

  // New session modal
  const [showNewModal,  setShowNewModal]  = useState(false)
  const [courses,       setCourses]       = useState<Course[]>([])
  const [students,      setStudents]      = useState<Student[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [newForm, setNewForm] = useState({
    course_id: '', student_id: '', scheduled_at: '', duration_minutes: '60',
  })
  const [newSubmitting, setNewSubmitting] = useState(false)

  // Cancel modal
  const [cancelId,     setCancelId]     = useState<string | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling,   setCancelling]   = useState(false)

  const fetchSessions = () => {
    setLoading(true)
    api.get('/sessions/my')
      .then(r => setSessions(r.data.data || r.data || []))
      .catch(() => setError('Não foi possível carregar as sessões.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchSessions()
    api.get('/teacher/my-courses')
      .then(r => setCourses(r.data || []))
      .catch(() => {})
  }, [])

  // Load students when course selected
  const handleCourseChange = async (courseId: string) => {
    setNewForm(f => ({ ...f, course_id: courseId, student_id: '' }))
    if (!courseId) { setStudents([]); return }
    setLoadingStudents(true)
    try {
      const r = await api.get(`/teacher/courses/${courseId}/students`)
      setStudents(r.data || [])
    } catch {
      setStudents([])
    } finally {
      setLoadingStudents(false)
    }
  }

  const handleNewSession = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newForm.course_id || !newForm.student_id || !newForm.scheduled_at) return
    setNewSubmitting(true)
    try {
      const scheduledAt = new Date(newForm.scheduled_at).toISOString()
      await api.post('/teacher/sessions', {
        course_id:        newForm.course_id,
        student_id:       newForm.student_id,
        scheduled_at:     scheduledAt,
        duration_minutes: parseInt(newForm.duration_minutes) || 60,
      })
      setShowNewModal(false)
      setNewForm({ course_id: '', student_id: '', scheduled_at: '', duration_minutes: '60' })
      setStudents([])
      fetchSessions()
    } catch {
      alert('Erro ao criar sessão. Verifique os dados e tente novamente.')
    } finally {
      setNewSubmitting(false)
    }
  }

  const handleCancel = async () => {
    if (!cancelId) return
    setCancelling(true)
    try {
      await api.post(`/sessions/${cancelId}/cancel`, { reason: cancelReason })
      setSessions(prev => prev.map(s => s.id === cancelId ? { ...s, status: 'cancelled' } : s))
      setCancelId(null)
      setCancelReason('')
    } catch {
      alert('Erro ao cancelar sessão.')
    } finally {
      setCancelling(false)
    }
  }

  const filtered = sessions.filter(s => {
    if (tab === 'agendadas')  return s.status === 'scheduled'
    if (tab === 'concluidas') return s.status === 'completed'
    if (tab === 'canceladas') return s.status === 'cancelled'
    return true
  })

  const TABS: { key: FilterTab; label: string }[] = [
    { key: 'todas',      label: 'Todas'      },
    { key: 'agendadas',  label: 'Agendadas'  },
    { key: 'concluidas', label: 'Concluídas' },
    { key: 'canceladas', label: 'Canceladas' },
  ]

  return (
    <TeacherLayout>
      <div className="px-4 md:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Sessões</h1>
            <p className="text-gray-400 text-sm mt-1">{sessions.length} sessão{sessions.length !== 1 ? 'ões' : ''} no total</p>
          </div>
          <button onClick={() => setShowNewModal(true)} className="btn-primary gap-2 text-sm py-2.5 px-5 self-start sm:self-auto shadow-lg shadow-primary/20">
            <Plus size={16} /> Nova Sessão
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : error ? (
          <div className="card text-center py-12 text-red-500">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="card text-center py-16">
            <Calendar size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="font-semibold text-gray-700 mb-1">Nenhuma sessão encontrada</p>
            <p className="text-gray-400 text-sm mb-4">
              {tab === 'todas' ? 'Cria a tua primeira sessão com um estudante.' : `Não tens sessões com estado "${tab}".`}
            </p>
            <button onClick={() => setShowNewModal(true)} className="btn-primary inline-flex gap-2">
              <Plus size={16} /> Nova Sessão
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered
              .slice()
              .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime())
              .map(s => {
                const dt = new Date(s.scheduled_at)
                const isToday = new Date().toDateString() === dt.toDateString()
                const isFuture = dt > new Date()
                return (
                  <div key={s.id} className="card flex items-center gap-4 py-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${s.status === 'scheduled' ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : s.status === 'completed' ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gray-200'}`}>
                      <Calendar size={18} className={s.status === 'cancelled' ? 'text-gray-400' : 'text-white'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <p className="font-bold text-gray-900">{s.student_name ?? 'Estudante'}</p>
                        {isToday && s.status === 'scheduled' && (
                          <span className="badge bg-orange-100 text-orange-700">Hoje</span>
                        )}
                      </div>
                      {s.course_title && <p className="text-xs text-gray-500 mb-1">{s.course_title}</p>}
                      <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock size={11} /> {dt.toLocaleDateString('pt-PT')} às {dt.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {s.duration_minutes && <span>{s.duration_minutes} min</span>}
                      </div>
                    </div>
                    <span className={`badge shrink-0 ${STATUS_COLORS[s.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABELS[s.status] ?? s.status}
                    </span>
                    {s.status === 'scheduled' && isFuture && (
                      <button
                        onClick={() => { setCancelId(s.id); setCancelReason('') }}
                        className="text-xs text-red-500 hover:text-red-700 font-semibold border border-red-200 rounded-lg px-3 py-1.5 transition-colors shrink-0"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                )
              })}
          </div>
        )}
      </div>

      {/* New Session Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-black text-gray-900">Nova Sessão</h2>
              <button onClick={() => setShowNewModal(false)} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleNewSession} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Curso *</label>
                <select
                  value={newForm.course_id}
                  onChange={e => handleCourseChange(e.target.value)}
                  className="input w-full"
                  required
                >
                  <option value="">Seleccionar curso</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Estudante *</label>
                <select
                  value={newForm.student_id}
                  onChange={e => setNewForm(f => ({ ...f, student_id: e.target.value }))}
                  className="input w-full"
                  required
                  disabled={!newForm.course_id || loadingStudents}
                >
                  <option value="">
                    {loadingStudents ? 'A carregar...' : newForm.course_id ? 'Seleccionar estudante' : 'Selecciona um curso primeiro'}
                  </option>
                  {students.map(s => <option key={s.student_id} value={s.student_id}>{s.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Data e Hora *</label>
                <input
                  type="datetime-local"
                  value={newForm.scheduled_at}
                  onChange={e => setNewForm(f => ({ ...f, scheduled_at: e.target.value }))}
                  className="input w-full"
                  required
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Duração</label>
                <select
                  value={newForm.duration_minutes}
                  onChange={e => setNewForm(f => ({ ...f, duration_minutes: e.target.value }))}
                  className="input w-full"
                >
                  <option value="30">30 minutos</option>
                  <option value="45">45 minutos</option>
                  <option value="60">60 minutos</option>
                  <option value="90">90 minutos</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowNewModal(false)} className="flex-1 btn-outline">Cancelar</button>
                <button type="submit" disabled={newSubmitting} className="flex-1 btn-primary">
                  {newSubmitting ? 'A criar...' : 'Criar Sessão'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Session Modal */}
      {cancelId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-black text-gray-900">Cancelar Sessão</h2>
              <button onClick={() => setCancelId(null)} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-500">Esta acção irá notificar o estudante. Indica o motivo do cancelamento:</p>
              <textarea
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                className="input w-full h-24 resize-none"
                placeholder="Motivo do cancelamento..."
              />
              <div className="flex gap-3">
                <button onClick={() => setCancelId(null)} className="flex-1 btn-outline">Voltar</button>
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
                >
                  <AlertCircle size={15} /> {cancelling ? 'A cancelar...' : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </TeacherLayout>
  )
}
