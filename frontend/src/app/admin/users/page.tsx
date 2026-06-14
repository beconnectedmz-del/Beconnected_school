'use client'

import { useEffect, useState, useCallback } from 'react'
import { Users, RefreshCw, Search, UserCheck, BookOpen, GraduationCap } from 'lucide-react'
import api from '@/lib/api'
import AdminLayout from '@/components/AdminLayout'

interface Teacher {
  id: string
  user_id: string
  full_name: string
  email?: string
  bio?: string
  subjects?: string[]
  price_per_hour?: number
  rating?: number
  is_verified?: boolean
  created_at?: string
}

export default function AdminUsersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [search,   setSearch]   = useState('')
  const [loading,  setLoading]  = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/teachers/list').catch(() => ({ data: [] }))
      setTeachers(Array.isArray(res.data) ? res.data : res.data?.data || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = teachers.filter(t =>
    !search || t.full_name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <AdminLayout>
      <div className="px-6 py-8 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <Users size={22} className="text-primary" /> Gestão de Utilizadores
            </h1>
            <p className="text-gray-400 text-sm mt-1">Professores registados na plataforma</p>
          </div>
          <button onClick={load} disabled={loading} className="btn-outline gap-2 text-sm py-2 px-4">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Actualizar
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Professores', value: teachers.length,                                Icon: GraduationCap, color: 'text-primary',      bg: 'bg-primary/10'   },
            { label: 'Verificados', value: teachers.filter(t => t.is_verified).length,    Icon: UserCheck,     color: 'text-emerald-600',   bg: 'bg-emerald-50'  },
            { label: 'Com cursos',  value: teachers.length,                                Icon: BookOpen,      color: 'text-secondary',     bg: 'bg-secondary/10' },
          ].map(({ label, value, Icon, color, bg }) => (
            <div key={label} className="card flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
                <Icon size={18} className={color} />
              </div>
              <div>
                <p className="text-2xl font-black text-gray-900">{value}</p>
                <p className="text-gray-500 text-xs">{label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="relative mb-4">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Pesquisar professores…" className="input pl-9" />
        </div>

        <div className="card p-0 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Users size={36} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhum utilizador encontrado</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-bold text-gray-400 uppercase">Professor</th>
                  <th className="text-center py-3 px-4 text-xs font-bold text-gray-400 uppercase hidden sm:table-cell">Avaliação</th>
                  <th className="text-center py-3 px-4 text-xs font-bold text-gray-400 uppercase hidden md:table-cell">Preço/h</th>
                  <th className="text-center py-3 px-4 text-xs font-bold text-gray-400 uppercase">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-secondary to-primary flex items-center justify-center text-white font-black text-sm shrink-0">
                          {t.full_name?.charAt(0) || 'P'}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{t.full_name}</p>
                          {t.subjects && t.subjects.length > 0 && (
                            <p className="text-xs text-gray-400">{t.subjects.slice(0, 2).join(', ')}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center hidden sm:table-cell">
                      <span className="font-bold text-amber-600">{t.rating ? Number(t.rating).toFixed(1) : '—'}</span>
                    </td>
                    <td className="py-3 px-4 text-center hidden md:table-cell">
                      <span className="text-gray-700 font-semibold">{t.price_per_hour ? `${t.price_per_hour} MZN` : '—'}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {t.is_verified
                        ? <span className="badge badge-green"><UserCheck size={9} /> Verificado</span>
                        : <span className="badge bg-gray-100 text-gray-500">Pendente</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
