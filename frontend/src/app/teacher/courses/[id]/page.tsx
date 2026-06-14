'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  BookOpen, Users, Edit3, Bell, Plus, Save,
  CheckCircle, Eye, EyeOff, X, ChevronLeft,
  Play, FileText, Video, Clock, Trash2, Pencil,
} from 'lucide-react'
import api from '@/lib/api'
import TeacherLayout from '@/components/TeacherLayout'

interface Course {
  id: string
  title: string
  description?: string
  discipline?: string
  level: string
  is_published: boolean
  is_validated?: boolean
  total_hours?: number
  thumbnail_url?: string
  enrolled_count?: number
  monthly_price?: number
}

interface Lesson {
  id: string
  title: string
  description?: string
  lesson_order: number
  duration_minutes?: number
  lesson_type?: string
  type?: string
  video_url?: string
  status?: string
}

interface Student {
  student_id: string
  full_name: string
  email?: string
  package_type?: string
  progress_pct?: number
  enrolled_at?: string
  lessons_completed?: number
  total_lessons?: number
}

const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Básico', intermediate: 'Intermédio', advanced: 'Avançado',
}

const LEVEL_COLORS: Record<string, string> = {
  beginner: 'bg-green-100 text-green-700',
  intermediate: 'bg-blue-100 text-blue-700',
  advanced: 'bg-purple-100 text-purple-700',
}

const LESSON_TYPE_ICONS: Record<string, React.ReactNode> = {
  video:    <Video size={14} />,
  pdf:      <FileText size={14} />,
  text:     <FileText size={14} />,
  live:     <Play size={14} />,
  recorded: <Video size={14} />,
}

type Tab = 'conteudo' | 'estudantes' | 'detalhes' | 'notificacoes'

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [activeTab, setActiveTab] = useState<Tab>('conteudo')
  const [course,   setCourse]   = useState<Course | null>(null)
  const [lessons,  setLessons]  = useState<Lesson[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')

  // Lesson modal (create)
  const [showLessonModal, setShowLessonModal] = useState(false)
  const [lessonForm, setLessonForm] = useState({ title: '', description: '', type: 'video', video_url: '', duration_minutes: '', order: '' })
  const [lessonSubmitting, setLessonSubmitting] = useState(false)

  // Lesson edit modal
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null)
  const [editLessonForm, setEditLessonForm] = useState({ title: '', description: '', type: 'video', video_url: '', duration_minutes: '', order: '' })
  const [editLessonSubmitting, setEditLessonSubmitting] = useState(false)
  const [deletingLessonId, setDeletingLessonId] = useState<string | null>(null)

  // Edit course form
  const [editForm, setEditForm] = useState({ title: '', description: '', level: '', total_hours: '', thumbnail_url: '', monthly_price: '' })
  const [editSaving, setEditSaving] = useState(false)
  const [editSuccess, setEditSuccess] = useState(false)

  // Notifications form
  const [notifForm, setNotifForm] = useState({ title: '', message: '', type: 'info' })
  const [notifSending, setNotifSending] = useState(false)
  const [notifResult, setNotifResult]  = useState('')

  // Student expand
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([
      api.get(`/courses/${id}`).then(r => {
        const c: Course = r.data
        setCourse(c)
        setEditForm({
          title:         c.title ?? '',
          description:   c.description ?? '',
          level:         c.level ?? 'beginner',
          total_hours:   String(c.total_hours ?? ''),
          thumbnail_url: c.thumbnail_url ?? '',
          monthly_price: String(c.monthly_price ?? ''),
        })
      }),
      api.get(`/courses/${id}/lessons`).then(r => setLessons(r.data || [])),
      api.get(`/teacher/courses/${id}/students`).then(r => setStudents(r.data || [])),
    ])
      .catch(() => setError('Não foi possível carregar os dados do curso.'))
      .finally(() => setLoading(false))
  }, [id])

  const handlePublish = async () => {
    if (!course) return
    try {
      await api.post(`/courses/${id}/publish`, { published: !course.is_published })
      setCourse(c => c ? { ...c, is_published: !c.is_published } : c)
    } catch {
      alert('Erro ao alterar estado de publicação.')
    }
  }

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!lessonForm.title.trim()) return
    setLessonSubmitting(true)
    try {
      const r = await api.post(`/courses/${id}/lessons`, {
        title:            lessonForm.title,
        description:      lessonForm.description,
        lesson_type:      lessonForm.type,
        video_url:        lessonForm.video_url || undefined,
        duration_minutes: parseInt(lessonForm.duration_minutes) || 0,
        lesson_order:     parseInt(lessonForm.order) || lessons.length + 1,
      })
      setLessons(prev => [...prev, r.data])
      setShowLessonModal(false)
      setLessonForm({ title: '', description: '', type: 'video', video_url: '', duration_minutes: '', order: '' })
    } catch {
      alert('Erro ao criar aula.')
    } finally {
      setLessonSubmitting(false)
    }
  }

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setEditSaving(true)
    try {
      const r = await api.put(`/courses/${id}`, {
        title:         editForm.title,
        description:   editForm.description,
        level:         editForm.level,
        total_hours:   parseFloat(editForm.total_hours) || undefined,
        thumbnail_url: editForm.thumbnail_url || undefined,
        monthly_price: parseFloat(editForm.monthly_price) || undefined,
      })
      setCourse(r.data)
      setEditSuccess(true)
      setTimeout(() => setEditSuccess(false), 3000)
    } catch {
      alert('Erro ao guardar alterações.')
    } finally {
      setEditSaving(false)
    }
  }

  const openEditLesson = (lesson: Lesson) => {
    setEditingLesson(lesson)
    setEditLessonForm({
      title:            lesson.title ?? '',
      description:      lesson.description ?? '',
      type:             lesson.lesson_type ?? lesson.type ?? 'video',
      video_url:        lesson.video_url ?? '',
      duration_minutes: String(lesson.duration_minutes ?? ''),
      order:            String(lesson.lesson_order ?? ''),
    })
  }

  const handleEditLessonSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingLesson) return
    setEditLessonSubmitting(true)
    try {
      const r = await api.put(`/courses/${id}/lessons/${editingLesson.id}`, {
        title:            editLessonForm.title,
        description:      editLessonForm.description,
        lesson_type:      editLessonForm.type,
        video_url:        editLessonForm.video_url || undefined,
        duration_minutes: parseInt(editLessonForm.duration_minutes) || 0,
        lesson_order:     parseInt(editLessonForm.order) || editingLesson.lesson_order,
      })
      setLessons(prev => prev.map(l => l.id === editingLesson.id ? { ...l, ...r.data } : l))
      setEditingLesson(null)
    } catch {
      alert('Erro ao actualizar aula.')
    } finally {
      setEditLessonSubmitting(false)
    }
  }

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm('Tens a certeza que queres eliminar esta aula?')) return
    setDeletingLessonId(lessonId)
    try {
      await api.delete(`/courses/${id}/lessons/${lessonId}`)
      setLessons(prev => prev.filter(l => l.id !== lessonId))
    } catch {
      alert('Erro ao eliminar aula.')
    } finally {
      setDeletingLessonId(null)
    }
  }

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!notifForm.title.trim() || !notifForm.message.trim()) return
    setNotifSending(true)
    try {
      const r = await api.post(`/teacher/courses/${id}/notify`, notifForm)
      setNotifResult(`Notificação enviada a ${r.data.sent ?? students.length} estudantes`)
      setNotifForm({ title: '', message: '', type: 'info' })
    } catch {
      setNotifResult('Erro ao enviar notificação.')
    } finally {
      setNotifSending(false)
    }
  }

  const TABS: { key: Tab; label: string; Icon: React.ElementType }[] = [
    { key: 'conteudo',     label: 'Conteúdo',     Icon: BookOpen  },
    { key: 'estudantes',   label: 'Estudantes',   Icon: Users     },
    { key: 'detalhes',     label: 'Detalhes',     Icon: Edit3     },
    { key: 'notificacoes', label: 'Notificações', Icon: Bell      },
  ]

  if (loading) return (
    <TeacherLayout>
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    </TeacherLayout>
  )

  if (error || !course) return (
    <TeacherLayout>
      <div className="px-8 py-8 text-center text-red-500">{error || 'Curso não encontrado.'}</div>
    </TeacherLayout>
  )

  return (
    <TeacherLayout>
      <div className="px-4 md:px-8 py-8">
        {/* Back + Header */}
        <Link href="/teacher/courses" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-4 w-fit">
          <ChevronLeft size={15} /> Meus Cursos
        </Link>

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900 leading-tight">{course.title}</h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {course.discipline && <span className="badge bg-indigo-100 text-indigo-700">{course.discipline}</span>}
              <span className={`badge ${LEVEL_COLORS[course.level] ?? 'bg-gray-100 text-gray-600'}`}>
                {LEVEL_LABELS[course.level] ?? course.level}
              </span>
              {course.is_published
                ? <span className="badge badge-green"><CheckCircle size={9} /> Publicado</span>
                : <span className="badge bg-gray-100 text-gray-600">Rascunho</span>}
              <span className="text-xs text-gray-400">{course.enrolled_count ?? 0} inscritos</span>
            </div>
          </div>
          <button
            onClick={handlePublish}
            className={`flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl border transition-colors shrink-0 ${course.is_published ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-green-200 text-green-700 hover:bg-green-50'}`}
          >
            {course.is_published ? <><EyeOff size={14} /> Despublicar</> : <><Eye size={14} /> Publicar</>}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-gray-100 overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${activeTab === t.key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
            >
              <t.Icon size={14} /> {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab: Conteúdo ───────────────────────────────────────── */}
        {activeTab === 'conteudo' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900">{lessons.length} Aula{lessons.length !== 1 ? 's' : ''}</h2>
              <button onClick={() => setShowLessonModal(true)} className="btn-primary gap-2 text-sm py-2 px-4">
                <Plus size={14} /> Adicionar Aula
              </button>
            </div>

            {lessons.length === 0 ? (
              <div className="card text-center py-12">
                <BookOpen size={36} className="mx-auto mb-3 text-gray-300" />
                <p className="font-semibold text-gray-700 mb-1">Ainda não adicionaste aulas</p>
                <p className="text-gray-400 text-sm mb-4">Adiciona conteúdo para que os estudantes possam aprender.</p>
                <button onClick={() => setShowLessonModal(true)} className="btn-primary inline-flex gap-2">
                  <Plus size={16} /> Adicionar Aula
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {lessons
                  .slice()
                  .sort((a, b) => (a.lesson_order ?? 0) - (b.lesson_order ?? 0))
                  .map(lesson => {
                    const lessonType = lesson.lesson_type ?? lesson.type ?? 'video'
                    return (
                      <div key={lesson.id} className="card flex items-center gap-4 py-4">
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0 text-indigo-600 font-bold text-sm">
                          {lesson.lesson_order}
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 text-gray-500">
                          {LESSON_TYPE_ICONS[lessonType] ?? <BookOpen size={14} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate">{lesson.title}</p>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-xs text-gray-400 capitalize">{lessonType}</span>
                            {lesson.duration_minutes && (
                              <span className="text-xs text-gray-400 flex items-center gap-1">
                                <Clock size={10} /> {lesson.duration_minutes} min
                              </span>
                            )}
                          </div>
                        </div>
                        {lesson.status && (
                          <span className={`badge shrink-0 ${lesson.status === 'approved' ? 'badge-green' : 'bg-yellow-100 text-yellow-700'}`}>
                            {lesson.status === 'approved' ? 'Aprovada' : lesson.status}
                          </span>
                        )}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => openEditLesson(lesson)}
                            className="w-8 h-8 rounded-lg hover:bg-indigo-50 flex items-center justify-center text-gray-400 hover:text-indigo-600 transition-colors"
                            title="Editar aula"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteLesson(lesson.id)}
                            disabled={deletingLessonId === lesson.id}
                            className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
                            title="Eliminar aula"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Estudantes ─────────────────────────────────────── */}
        {activeTab === 'estudantes' && (
          <div>
            <p className="text-sm text-gray-500 mb-4">{students.length} estudante{students.length !== 1 ? 's' : ''} inscritos</p>
            {students.length === 0 ? (
              <div className="card text-center py-12">
                <Users size={36} className="mx-auto mb-3 text-gray-300" />
                <p className="font-semibold text-gray-700">Ainda não há estudantes inscritos</p>
                <p className="text-gray-400 text-sm mt-1">Publica o curso para receber inscrições.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {students.map(s => {
                  const progress = s.progress_pct ?? 0
                  const isExpanded = expandedStudent === s.student_id
                  return (
                    <div key={s.student_id} className="card overflow-hidden">
                      <button
                        className="w-full flex items-center gap-4 py-3 text-left"
                        onClick={() => setExpandedStudent(isExpanded ? null : s.student_id)}
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-secondary to-primary flex items-center justify-center text-white font-bold text-sm shrink-0">
                          {s.full_name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm">{s.full_name}</p>
                          {s.email && <p className="text-xs text-gray-400 truncate">{s.email}</p>}
                          <div className="flex items-center gap-2 mt-1.5">
                            <div className="flex-1 bg-gray-100 rounded-full h-1.5 max-w-32">
                              <div
                                className="h-full bg-gradient-to-r from-secondary to-primary rounded-full"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-gray-600">{progress}%</span>
                          </div>
                        </div>
                        {s.package_type && (
                          <span className={`badge shrink-0 ${s.package_type === 'premium' ? 'bg-amber-100 text-amber-700' : s.package_type === 'lite' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                            {s.package_type === 'premium' ? 'Premium' : s.package_type === 'lite' ? 'Lite' : 'Básico'}
                          </span>
                        )}
                        {s.enrolled_at && (
                          <span className="text-xs text-gray-400 shrink-0 hidden sm:block">
                            {new Date(s.enrolled_at).toLocaleDateString('pt-PT')}
                          </span>
                        )}
                      </button>
                      {isExpanded && (
                        <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 text-sm text-gray-600 flex items-center gap-6">
                          <span><span className="font-semibold">{s.lessons_completed ?? '—'}</span> aulas concluídas</span>
                          <span>de <span className="font-semibold">{s.total_lessons ?? '—'}</span> no total</span>
                          <span>Progresso: <span className="font-semibold">{progress}%</span></span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Detalhes ───────────────────────────────────────── */}
        {activeTab === 'detalhes' && (
          <form onSubmit={handleEditSave} className="max-w-lg space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Título</label>
              <input
                type="text"
                value={editForm.title}
                onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                className="input w-full"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Descrição</label>
              <textarea
                value={editForm.description}
                onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                className="input w-full h-28 resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nível</label>
                <select
                  value={editForm.level}
                  onChange={e => setEditForm(f => ({ ...f, level: e.target.value }))}
                  className="input w-full"
                >
                  <option value="beginner">Básico</option>
                  <option value="intermediate">Intermédio</option>
                  <option value="advanced">Avançado</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Total de Horas</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={editForm.total_hours}
                  onChange={e => setEditForm(f => ({ ...f, total_hours: e.target.value }))}
                  className="input w-full"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">URL da Thumbnail</label>
              <input
                type="url"
                value={editForm.thumbnail_url}
                onChange={e => setEditForm(f => ({ ...f, thumbnail_url: e.target.value }))}
                className="input w-full"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Preço Mensal (MZN)</label>
              <input
                type="number"
                min="0"
                step="50"
                value={editForm.monthly_price}
                onChange={e => setEditForm(f => ({ ...f, monthly_price: e.target.value }))}
                className="input w-full"
                placeholder="Ex: 1500"
              />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button type="submit" disabled={editSaving} className="btn-primary gap-2">
                <Save size={15} /> {editSaving ? 'A guardar...' : 'Guardar Alterações'}
              </button>
              {editSuccess && <span className="text-green-600 text-sm font-semibold flex items-center gap-1"><CheckCircle size={14} /> Guardado!</span>}
            </div>
          </form>
        )}

        {/* ── Tab: Notificações ───────────────────────────────────── */}
        {activeTab === 'notificacoes' && (
          <div className="max-w-lg">
            <p className="text-sm text-gray-500 mb-4">
              Envia uma notificação a todos os estudantes inscritos neste curso ({students.length} estudante{students.length !== 1 ? 's' : ''}).
            </p>
            <form onSubmit={handleSendNotification} className="card space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Título</label>
                <input
                  type="text"
                  value={notifForm.title}
                  onChange={e => setNotifForm(f => ({ ...f, title: e.target.value }))}
                  className="input w-full"
                  placeholder="Ex: Nova aula disponível!"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Mensagem</label>
                <textarea
                  value={notifForm.message}
                  onChange={e => setNotifForm(f => ({ ...f, message: e.target.value }))}
                  className="input w-full h-24 resize-none"
                  placeholder="Escreve a mensagem para os teus estudantes..."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Tipo</label>
                <select
                  value={notifForm.type}
                  onChange={e => setNotifForm(f => ({ ...f, type: e.target.value }))}
                  className="input w-full"
                >
                  <option value="info">Informação</option>
                  <option value="warning">Aviso</option>
                  <option value="reminder">Lembrete</option>
                </select>
              </div>
              <button type="submit" disabled={notifSending} className="btn-primary gap-2 w-full">
                <Bell size={15} /> {notifSending ? 'A enviar...' : 'Enviar Notificação'}
              </button>
              {notifResult && (
                <p className={`text-sm font-semibold ${notifResult.includes('Erro') ? 'text-red-600' : 'text-green-600'}`}>
                  {notifResult}
                </p>
              )}
            </form>
          </div>
        )}
      </div>

      {/* Add Lesson Modal */}
      {showLessonModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-black text-gray-900">Nova Aula</h2>
              <button onClick={() => setShowLessonModal(false)} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateLesson} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Título *</label>
                <input
                  type="text"
                  value={lessonForm.title}
                  onChange={e => setLessonForm(f => ({ ...f, title: e.target.value }))}
                  className="input w-full"
                  placeholder="Ex: Aula 1 — Introdução"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Descrição</label>
                <textarea
                  value={lessonForm.description}
                  onChange={e => setLessonForm(f => ({ ...f, description: e.target.value }))}
                  className="input w-full h-20 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Tipo</label>
                  <select
                    value={lessonForm.type}
                    onChange={e => setLessonForm(f => ({ ...f, type: e.target.value }))}
                    className="input w-full"
                  >
                    <option value="video">Vídeo</option>
                    <option value="pdf">PDF</option>
                    <option value="text">Texto</option>
                    <option value="live">Ao vivo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Duração (min)</label>
                  <input
                    type="number"
                    min="0"
                    value={lessonForm.duration_minutes}
                    onChange={e => setLessonForm(f => ({ ...f, duration_minutes: e.target.value }))}
                    className="input w-full"
                    placeholder="60"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Ordem</label>
                  <input
                    type="number"
                    min="1"
                    value={lessonForm.order}
                    onChange={e => setLessonForm(f => ({ ...f, order: e.target.value }))}
                    className="input w-full"
                    placeholder={String(lessons.length + 1)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">URL do Vídeo</label>
                  <input
                    type="url"
                    value={lessonForm.video_url}
                    onChange={e => setLessonForm(f => ({ ...f, video_url: e.target.value }))}
                    className="input w-full"
                    placeholder="https://..."
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowLessonModal(false)} className="flex-1 btn-outline">Cancelar</button>
                <button type="submit" disabled={lessonSubmitting} className="flex-1 btn-primary">
                  {lessonSubmitting ? 'A criar...' : 'Criar Aula'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Edit Lesson Modal */}
      {editingLesson && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-black text-gray-900">Editar Aula</h2>
              <button onClick={() => setEditingLesson(null)} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleEditLessonSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Título *</label>
                <input
                  type="text"
                  value={editLessonForm.title}
                  onChange={e => setEditLessonForm(f => ({ ...f, title: e.target.value }))}
                  className="input w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Descrição</label>
                <textarea
                  value={editLessonForm.description}
                  onChange={e => setEditLessonForm(f => ({ ...f, description: e.target.value }))}
                  className="input w-full h-20 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Tipo</label>
                  <select
                    value={editLessonForm.type}
                    onChange={e => setEditLessonForm(f => ({ ...f, type: e.target.value }))}
                    className="input w-full"
                  >
                    <option value="video">Vídeo</option>
                    <option value="pdf">PDF</option>
                    <option value="text">Texto</option>
                    <option value="live">Ao vivo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Duração (min)</label>
                  <input
                    type="number"
                    min="0"
                    value={editLessonForm.duration_minutes}
                    onChange={e => setEditLessonForm(f => ({ ...f, duration_minutes: e.target.value }))}
                    className="input w-full"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Ordem</label>
                  <input
                    type="number"
                    min="1"
                    value={editLessonForm.order}
                    onChange={e => setEditLessonForm(f => ({ ...f, order: e.target.value }))}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">URL do Vídeo</label>
                  <input
                    type="url"
                    value={editLessonForm.video_url}
                    onChange={e => setEditLessonForm(f => ({ ...f, video_url: e.target.value }))}
                    className="input w-full"
                    placeholder="https://..."
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditingLesson(null)} className="flex-1 btn-outline">Cancelar</button>
                <button type="submit" disabled={editLessonSubmitting} className="flex-1 btn-primary gap-2">
                  <Save size={14} /> {editLessonSubmitting ? 'A guardar...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </TeacherLayout>
  )
}
