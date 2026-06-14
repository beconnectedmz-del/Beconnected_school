'use client'

import { useEffect, useState, useCallback } from 'react'
import { RefreshCw, Plus, X, Send, Play, Pause, CheckCircle } from 'lucide-react'
import api from '@/lib/api'
import AdminLayout from '@/components/AdminLayout'

interface Campaign {
  id: string
  name: string
  type: string
  status: string
  target_segment: string
  subject?: string
  content?: string
  discount_percent: number
  promo_code?: string
  sent_count: number
  opened_count: number
  clicked_count: number
  converted_count: number
  launched_at?: string
  created_at: string
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho', active: 'Activa', paused: 'Pausada',
  completed: 'Concluída', cancelled: 'Cancelada',
}
const TYPE_LABELS: Record<string, string> = {
  email: 'Email', push: 'Push', in_app: 'In-App', sms: 'SMS',
}
const SEGMENTS = [
  { value: 'all',      label: 'Todos os utilizadores' },
  { value: 'basic',    label: 'Subscritores Básico'    },
  { value: 'lite',     label: 'Subscritores Lite'      },
  { value: 'premium',  label: 'Subscritores Premium'   },
  { value: 'inactive', label: 'Utilizadores inativos'  },
  { value: 'new_leads',label: 'Novos leads'            },
]

const EMPTY_FORM = {
  name: '', type: 'email', target_segment: 'all',
  subject: '', content: '', discount_percent: 0, promo_code: '', scheduled_at: '',
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading,   setLoading]   = useState(true)
  const [showForm,  setShowForm]  = useState(false)
  const [actionId,  setActionId]  = useState<string | null>(null)
  const [toast,     setToast]     = useState('')
  const [form,      setForm]      = useState(EMPTY_FORM)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/campaigns').catch(() => ({ data: [] }))
      setCampaigns(Array.isArray(res.data) ? res.data : res.data?.data ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const createCampaign = async () => {
    if (!form.name) { showToast('Preencha o nome da campanha.'); return }
    try {
      await api.post('/admin/campaigns', { ...form, discount_percent: Number(form.discount_percent) })
      showToast('Campanha criada!')
      setShowForm(false)
      setForm(EMPTY_FORM)
      await load()
    } catch { showToast('Erro ao criar campanha.') }
  }

  const campaignAction = async (id: string, action: 'launch' | 'pause') => {
    setActionId(id)
    try {
      await api.post(`/admin/campaigns/${id}/${action}`)
      showToast(action === 'launch' ? 'Campanha lançada!' : 'Campanha pausada.')
      await load()
    } catch { showToast('Erro na acção.') }
    finally { setActionId(null) }
  }

  return (
    <AdminLayout>
      <div className="px-6 py-8 max-w-7xl">
        {toast && (
          <div className="fixed top-4 right-4 bg-secondary text-white px-5 py-3 rounded-xl shadow-xl text-sm font-semibold z-50">
            {toast}
          </div>
        )}

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <Send size={22} className="text-primary" /> Campanhas de Marketing
            </h1>
            <p className="text-gray-400 text-sm mt-1">Criar e lançar campanhas de venda de cursos</p>
          </div>
          <div className="flex gap-2">
            <button onClick={load} disabled={loading} className="btn-outline p-2.5">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={() => setShowForm(true)} className="btn-primary gap-2 text-sm py-2 px-4">
              <Plus size={15} /> Nova Campanha
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total',      value: campaigns.length,                                       color: 'text-gray-900',    bg: 'bg-gray-100'   },
            { label: 'Activas',    value: campaigns.filter(c => c.status === 'active').length,    color: 'text-emerald-700', bg: 'bg-emerald-50' },
            { label: 'Rascunhos',  value: campaigns.filter(c => c.status === 'draft').length,     color: 'text-amber-700',   bg: 'bg-amber-50'   },
            { label: 'Concluídas', value: campaigns.filter(c => c.status === 'completed').length, color: 'text-blue-700',    bg: 'bg-blue-50'    },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className="card">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>
                <Send size={16} className={color} />
              </div>
              <p className={`text-2xl font-black ${color}`}>{value}</p>
              <p className="text-gray-500 text-xs mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="card text-center py-16">
            <Send size={48} className="mx-auto mb-4 text-gray-200" />
            <h2 className="text-lg font-bold text-gray-500 mb-2">Sem campanhas</h2>
            <p className="text-gray-400 text-sm mb-5">Crie a sua primeira campanha para começar a vender.</p>
            <button onClick={() => setShowForm(true)} className="btn-primary gap-2 inline-flex">
              <Plus size={15} /> Criar Campanha
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {campaigns.map(c => (
              <div key={c.id} className="card">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`badge ${
                        c.status === 'active'    ? 'badge-green'  :
                        c.status === 'paused'    ? 'badge-orange' :
                        c.status === 'completed' ? 'badge-blue'   :
                        'bg-gray-100 text-gray-500'
                      }`}>{STATUS_LABELS[c.status] ?? c.status}</span>
                      <span className="badge bg-gray-100 text-gray-600">{TYPE_LABELS[c.type] ?? c.type}</span>
                      <span className="badge bg-secondary/10 text-secondary">
                        {SEGMENTS.find(s => s.value === c.target_segment)?.label ?? c.target_segment}
                      </span>
                    </div>
                    <h3 className="font-black text-gray-900 text-lg leading-tight">{c.name}</h3>
                    {c.subject && <p className="text-sm text-gray-500 mt-0.5 truncate">{c.subject}</p>}
                    {c.discount_percent > 0 && (
                      <p className="text-xs text-primary font-semibold mt-1">
                        {c.discount_percent}% de desconto
                        {c.promo_code ? ` · Código: ${c.promo_code}` : ''}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {c.status === 'draft' && (
                      <button onClick={() => campaignAction(c.id, 'launch')} disabled={actionId === c.id}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-sm font-bold disabled:opacity-50">
                        {actionId === c.id ? <RefreshCw size={13} className="animate-spin" /> : <Play size={13} />} Lançar
                      </button>
                    )}
                    {c.status === 'active' && (
                      <button onClick={() => campaignAction(c.id, 'pause')} disabled={actionId === c.id}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 text-sm font-bold disabled:opacity-50">
                        {actionId === c.id ? <RefreshCw size={13} className="animate-spin" /> : <Pause size={13} />} Pausar
                      </button>
                    )}
                  </div>
                </div>

                {/* Metrics */}
                <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-4 gap-3">
                  {[
                    { label: 'Enviados',    value: c.sent_count,      pct: null },
                    { label: 'Abertos',     value: c.opened_count,    pct: c.sent_count > 0    ? `${((c.opened_count   /c.sent_count)*100).toFixed(0)}%`  : '—' },
                    { label: 'Cliques',     value: c.clicked_count,   pct: c.opened_count > 0  ? `${((c.clicked_count  /c.opened_count)*100).toFixed(0)}%` : '—' },
                    { label: 'Convertidos', value: c.converted_count, pct: c.sent_count > 0    ? `${((c.converted_count/c.sent_count)*100).toFixed(0)}%`  : '—' },
                  ].map(({ label, value, pct }) => (
                    <div key={label} className="text-center">
                      <p className="text-lg font-black text-gray-900">{value}</p>
                      {pct && <p className="text-xs text-primary font-semibold">{pct}</p>}
                      <p className="text-[11px] text-gray-400 mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create campaign modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-black text-gray-900">Nova Campanha</h2>
                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>
              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Nome *</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="Ex: Promoção de Setembro 2026" className="input" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Tipo *</label>
                    <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="input">
                      <option value="email">Email</option>
                      <option value="push">Push</option>
                      <option value="in_app">In-App</option>
                      <option value="sms">SMS</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Segmento</label>
                    <select value={form.target_segment} onChange={e => setForm({ ...form, target_segment: e.target.value })} className="input">
                      {SEGMENTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                </div>
                {(form.type === 'email' || form.type === 'sms') && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Assunto</label>
                    <input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}
                      placeholder="Ex: Oferta exclusiva só para si!" className="input" />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Mensagem</label>
                  <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })}
                    placeholder="Escreva o conteúdo da campanha..." rows={4}
                    className="input resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Desconto (%)</label>
                    <input type="number" min="0" max="100"
                      value={form.discount_percent}
                      onChange={e => setForm({ ...form, discount_percent: Number(e.target.value) })}
                      className="input" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Código promo</label>
                    <input value={form.promo_code} onChange={e => setForm({ ...form, promo_code: e.target.value })}
                      placeholder="Ex: ESCOLA25" className="input" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Agendar envio</label>
                  <input type="datetime-local" value={form.scheduled_at}
                    onChange={e => setForm({ ...form, scheduled_at: e.target.value })} className="input" />
                </div>
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
                <button onClick={() => setShowForm(false)} className="btn-outline">Cancelar</button>
                <button onClick={createCampaign} className="btn-primary gap-2">
                  <CheckCircle size={15} /> Criar Campanha
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
