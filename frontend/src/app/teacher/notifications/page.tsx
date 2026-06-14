'use client'

import { useEffect, useState } from 'react'
import { Bell, Send, Info, BookOpen, CheckCircle, Lightbulb } from 'lucide-react'
import api from '@/lib/api'
import TeacherLayout from '@/components/TeacherLayout'

interface Course {
  id: string
  title: string
  enrolled_count?: number
  total_enrollments?: number
}

interface NotifLog {
  id: string
  title: string
  message: string
  type: string
  sent_to: number
  created_at: string
  course_title: string
}

const TYPE_CONFIG = {
  info:     { label: 'Informação', color: 'bg-blue-100 text-blue-700',   icon: Info      },
  warning:  { label: 'Aviso',      color: 'bg-yellow-100 text-yellow-700', icon: Bell    },
  reminder: { label: 'Lembrete',   color: 'bg-purple-100 text-purple-700', icon: Bell    },
}

const TIPS = [
  'Mantém as notificações curtas e directas — menos é mais.',
  'Usa lembretes antes de datas importantes (exames, entrega de trabalhos).',
  'Notifica sobre novos conteúdos logo que forem publicados.',
  'Evita enviar mais de 2 notificações por semana por curso.',
  'Personaliza a mensagem referindo o tema do curso para maior relevância.',
]

export default function TeacherNotificationsPage() {
  const [courses,   setCourses]   = useState<Course[]>([])
  const [logs,      setLogs]      = useState<NotifLog[]>([])
  const [loading,   setLoading]   = useState(true)
  const [form, setForm] = useState({
    courseId: '',
    title:    '',
    message:  '',
    type:     'info' as 'info' | 'warning' | 'reminder',
  })
  const [sending,  setSending]  = useState(false)
  const [result,   setResult]   = useState<{ ok: boolean; msg: string } | null>(null)

  const fetchLogs = () => {
    api.get('/teacher/notification-logs')
      .then(r => setLogs(r.data || []))
      .catch(() => {})
  }

  useEffect(() => {
    Promise.all([
      api.get('/teacher/my-courses').then(r => setCourses(r.data || [])),
      api.get('/teacher/notification-logs').then(r => setLogs(r.data || [])),
    ])
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const selectedCourse = courses.find(c => c.id === form.courseId)
  const studentCount   = selectedCourse
    ? (selectedCourse.enrolled_count ?? selectedCourse.total_enrollments ?? 0)
    : courses.reduce((a, c) => a + (c.enrolled_count ?? c.total_enrollments ?? 0), 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.courseId || !form.title.trim() || !form.message.trim()) return
    setSending(true)
    setResult(null)
    try {
      const r = await api.post(`/teacher/courses/${form.courseId}/notify`, {
        title:   form.title,
        message: form.message,
        type:    form.type,
      })
      const sent = r.data?.sent ?? studentCount
      setResult({ ok: true, msg: `Notificação enviada com sucesso a ${sent} estudante${sent !== 1 ? 's' : ''}!` })
      setForm(f => ({ ...f, title: '', message: '', type: 'info' }))
      fetchLogs()
    } catch {
      setResult({ ok: false, msg: 'Erro ao enviar notificação. Tenta novamente.' })
    } finally {
      setSending(false)
    }
  }

  return (
    <TeacherLayout>
      <div className="px-4 md:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-gray-900">Notificações</h1>
          <p className="text-gray-400 text-sm mt-1">Envia notificações directas aos estudantes dos teus cursos</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form — takes 2/3 */}
          <div className="lg:col-span-2 space-y-4">
            {/* Nova Notificação card */}
            <div className="card">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <Send size={15} className="text-indigo-600" />
                </div>
                <h2 className="font-black text-gray-900">Nova Notificação</h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Course selector */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Curso destinatário *
                  </label>
                  {loading ? (
                    <div className="input w-full flex items-center text-gray-400 text-sm">A carregar cursos...</div>
                  ) : (
                    <select
                      value={form.courseId}
                      onChange={e => setForm(f => ({ ...f, courseId: e.target.value }))}
                      className="input w-full"
                      required
                    >
                      <option value="">Seleccionar curso</option>
                      {courses.map(c => {
                        const count = c.enrolled_count ?? c.total_enrollments ?? 0
                        return (
                          <option key={c.id} value={c.id}>
                            {c.title} ({count} estudante{count !== 1 ? 's' : ''})
                          </option>
                        )
                      })}
                    </select>
                  )}
                  {form.courseId && (
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                      <BookOpen size={11} /> Será enviada a <strong>{studentCount}</strong> estudante{studentCount !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Título *</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    className="input w-full"
                    placeholder="Ex: Nova aula disponível!"
                    maxLength={100}
                    required
                  />
                  <p className="text-xs text-gray-400 mt-0.5 text-right">{form.title.length}/100</p>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Mensagem *</label>
                  <textarea
                    value={form.message}
                    onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                    className="input w-full h-28 resize-none"
                    placeholder="Escreve aqui a tua mensagem para os estudantes..."
                    maxLength={500}
                    required
                  />
                  <p className="text-xs text-gray-400 mt-0.5 text-right">{form.message.length}/500</p>
                </div>

                {/* Type */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo de Notificação</label>
                  <div className="flex gap-2 flex-wrap">
                    {(Object.keys(TYPE_CONFIG) as Array<keyof typeof TYPE_CONFIG>).map(t => {
                      const cfg = TYPE_CONFIG[t]
                      const isSelected = form.type === t
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setForm(f => ({ ...f, type: t }))}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all ${isSelected ? cfg.color + ' border-current' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                        >
                          <cfg.icon size={13} /> {cfg.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={sending || !form.courseId}
                  className="btn-primary w-full gap-2 py-3 disabled:opacity-50"
                >
                  <Send size={15} /> {sending ? 'A enviar...' : 'Enviar Notificação'}
                </button>

                {/* Result */}
                {result && (
                  <div className={`flex items-center gap-2 p-3 rounded-xl text-sm font-semibold ${result.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {result.ok ? <CheckCircle size={15} /> : <Bell size={15} />}
                    {result.msg}
                  </div>
                )}
              </form>
            </div>

            {/* History section */}
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Bell size={15} className="text-gray-500" />
                </div>
                <h2 className="font-black text-gray-900">Histórico de Notificações</h2>
                <span className="ml-auto text-xs text-gray-400">{logs.length} enviada{logs.length !== 1 ? 's' : ''}</span>
              </div>
              {logs.length === 0 ? (
                <div className="text-center py-10">
                  <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Bell size={24} className="text-gray-300" />
                  </div>
                  <p className="font-semibold text-gray-500">Nenhuma notificação enviada ainda</p>
                  <p className="text-sm text-gray-400 mt-1">O histórico aparecerá aqui após enviares a primeira notificação.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {logs.map(log => {
                    const cfg = TYPE_CONFIG[log.type as keyof typeof TYPE_CONFIG] ?? TYPE_CONFIG.info
                    const Icon = cfg.icon
                    return (
                      <div key={log.id} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cfg.color}`}>
                          <Icon size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-gray-900 text-sm">{log.title}</p>
                            <span className={`badge text-[10px] ${cfg.color}`}>{cfg.label}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{log.message}</p>
                          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            {log.course_title && (
                              <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                <BookOpen size={9} /> {log.course_title}
                              </span>
                            )}
                            <span className="text-[10px] text-gray-400 flex items-center gap-1">
                              <CheckCircle size={9} /> {log.sent_to} estudante{log.sent_to !== 1 ? 's' : ''}
                            </span>
                            <span className="text-[10px] text-gray-400">
                              {new Date(log.created_at).toLocaleString('pt-PT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar — tips */}
          <div className="space-y-4">
            <div className="card bg-amber-50 border-amber-100">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Lightbulb size={15} className="text-amber-600" />
                </div>
                <h3 className="font-black text-amber-900 text-sm">Dicas para notificações eficazes</h3>
              </div>
              <ul className="space-y-3">
                {TIPS.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-800 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                    <span className="text-xs text-amber-800 leading-relaxed">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Types info */}
            <div className="card">
              <h3 className="font-bold text-gray-900 mb-3 text-sm">Tipos de Notificação</h3>
              <div className="space-y-2">
                {(Object.entries(TYPE_CONFIG) as [string, typeof TYPE_CONFIG.info][]).map(([key, cfg]) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className={`badge text-xs ${cfg.color}`}>{cfg.label}</span>
                    <span className="text-xs text-gray-500">
                      {key === 'info'     && 'Actualizações e novidades'}
                      {key === 'warning'  && 'Avisos importantes'}
                      {key === 'reminder' && 'Lembretes de tarefas'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Courses summary */}
            {courses.length > 0 && (
              <div className="card">
                <h3 className="font-bold text-gray-900 mb-3 text-sm">Os Teus Cursos</h3>
                <div className="space-y-2">
                  {courses.slice(0, 5).map(c => {
                    const count = c.enrolled_count ?? c.total_enrollments ?? 0
                    return (
                      <div key={c.id} className="flex items-center justify-between gap-2">
                        <p className="text-xs text-gray-700 truncate flex-1">{c.title}</p>
                        <span className="text-xs font-semibold text-gray-500 shrink-0">{count} alunos</span>
                      </div>
                    )
                  })}
                  {courses.length > 5 && (
                    <p className="text-xs text-gray-400 text-center">+{courses.length - 5} cursos</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </TeacherLayout>
  )
}
