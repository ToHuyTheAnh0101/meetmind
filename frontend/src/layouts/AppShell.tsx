import React from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { CalendarDays, LayoutDashboard, LogOut, UserCircle2, FileText } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'

type NavItem = {
  to: string
  label: string
  icon: React.ElementType
}

const navItems: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/meetings', label: 'Meetings', icon: CalendarDays },
  { to: '/templates', label: 'Templates', icon: FileText },
  { to: '/profile', label: 'Profile', icon: UserCircle2 },
]

const AppShell: React.FC = () => {
  const { user, logout } = useAuth()
  const displayName = user ? `${user.firstName} ${user.lastName}`.trim() : 'Guest User'
  const userAvatar = user?.picture || user?.profilePictureUrl || ''
  const userInitials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('')

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#c7f9ff,_transparent_40%),radial-gradient(circle_at_bottom_right,_#ffeab6,_transparent_45%),#f8fafc] text-slate-900">
      <div className="mx-auto flex w-full max-w-screen-2xl gap-4 px-3 pb-24 pt-3 sm:px-6 sm:pt-6 lg:gap-6 lg:px-8 lg:pb-8">
        <aside className="hidden w-64 shrink-0 rounded-3xl border border-white/40 bg-slate-900/95 p-4 shadow-2xl lg:block">
          <div className="mb-8 rounded-2xl bg-white/10 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">MeetMind</p>
            <p className="mt-1 text-lg font-semibold text-white">Workspace</p>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    [
                      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition',
                      isActive
                        ? 'bg-cyan-300 text-slate-900'
                        : 'text-slate-200 hover:bg-white/10 hover:text-white',
                    ].join(' ')
                  }
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              )
            })}
          </nav>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="mb-4 rounded-2xl border border-white/50 bg-white/80 p-4 shadow-xl backdrop-blur sm:mb-6 sm:rounded-3xl sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
                  Phase 2.1
                </p>
                <p className="text-sm text-slate-600 sm:text-base">Navigation shell for core features</p>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/90 px-2.5 py-1.5 sm:px-3 sm:py-2">
                  {userAvatar ? (
                    <img
                      src={userAvatar}
                      alt={displayName}
                      className="h-8 w-8 rounded-full object-cover ring-2 ring-cyan-100"
                    />
                  ) : (
                    <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-cyan-100 text-xs font-bold text-cyan-700 ring-2 ring-cyan-50">
                      {userInitials || 'U'}
                    </div>
                  )}
                  <div className="hidden leading-tight sm:block">
                    <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Signed in as</p>
                    <p className="text-sm font-semibold text-slate-800">{displayName}</p>
                  </div>
                </div>

                <button
                  onClick={logout}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            </div>
          </header>

          <main>
            <Outlet />
          </main>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/70 bg-white/95 p-2 shadow-2xl backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  [
                    'flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-semibold transition',
                    isActive
                      ? 'bg-cyan-100 text-cyan-800'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700',
                  ].join(' ')
                }
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

export default AppShell
