'use client'

import { useEffect, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Crown, BarChart3, BookOpen, Calendar, Users,
  DollarSign, Bell, GraduationCap, LogOut,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'

const NAV = [
  { href: '/teacher',               label: 'Dashboard',    Icon: BarChart3   },
  { href: '/teacher/courses',       label: 'Meus Cursos',  Icon: BookOpen    },
  { href: '/teacher/sessions',      label: 'Sessões',      Icon: Calendar    },
  { href: '/teacher/students',      label: 'Estudantes',   Icon: Users       },
  { href: '/teacher/earnings',      label: 'Ganhos',       Icon: DollarSign  },
  { href: '/teacher/notifications', label: 'Notificações', Icon: Bell        },
]

export default function TeacherLayout({ children }: { children: ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const { user, logout } = useAuthStore()

  useEffect(() => {
    if (!user) { router.push('/login'); return }
    if (user.role !== 'teacher') {
      router.push(user.role === 'admin' ? '/admin' : '/dashboard')
    }
  }, [user, router])

  if (!user || user.role !== 'teacher') return null

  const isActive = (href: string) =>
    href === '/teacher'
      ? pathname === '/teacher'
      : pathname === href || pathname.startsWith(href + '/')

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-64 bg-white border-r border-gray-100 px-4 py-6 hidden md:flex flex-col shadow-sm sticky top-0 h-screen overflow-y-auto shrink-0">
        <Link href="/" className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-md shadow-primary/30">
            <Crown size={15} className="text-white" />
          </div>
          <span className="text-lg font-black">
            <span className="text-primary">Be</span><span className="text-secondary">connect</span>
            <span className="text-secondary/50 font-semibold text-xs"> School</span>
          </span>
        </Link>

        <div className="bg-gradient-to-br from-secondary/10 to-primary/10 border border-secondary/20 rounded-xl p-3 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-secondary to-primary flex items-center justify-center text-white font-black text-sm shadow-md shrink-0">
              {user.full_name?.charAt(0) || 'P'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate leading-none">{user.full_name || 'Professor'}</p>
              <div className="flex items-center gap-1 mt-1">
                <GraduationCap size={9} className="text-secondary" />
                <span className="text-[10px] text-secondary font-bold uppercase tracking-wide">Professor</span>
              </div>
            </div>
          </div>
        </div>

        <nav className="space-y-0.5 flex-1">
          {NAV.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className={isActive(href) ? 'nav-item-active' : 'nav-item'}
            >
              <Icon size={15} /> {label}
            </Link>
          ))}
        </nav>

        <button
          onClick={logout}
          className="flex items-center gap-2 text-gray-400 hover:text-danger text-sm px-3 py-2 transition-colors mt-4"
        >
          <LogOut size={14} /> Sair
        </button>
      </aside>

      <main className="flex-1 overflow-auto min-h-screen">
        {children}
      </main>
    </div>
  )
}
