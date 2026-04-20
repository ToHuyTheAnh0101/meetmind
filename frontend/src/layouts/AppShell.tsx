import React from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CalendarDays, LayoutDashboard, LogOut, UserCircle2, FileText, LayoutGrid } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'

type NavItem = {
  to: string
  label: string
  icon: React.ElementType
}

const navItems: NavItem[] = [
  { to: '/', label: 'Overview', icon: LayoutDashboard },
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#c7f9ff,_transparent_40%),radial-gradient(circle_at_bottom_right,_#ffeab6,_transparent_45%),#f8fafc] text-slate-900 pb-20 lg:pb-0">
      {/* Premium Sticky Header with Top Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-white/40 bg-white/60 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-screen-2xl items-center justify-between gap-8">
          {/* Logo Section */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 shadow-lg shadow-slate-200">
              <LayoutGrid className="h-5 w-5 text-cyan-400" />
            </div>
            <div className="hidden lg:block">
              <p className="text-[11px] font-bold uppercase tracking-widest text-cyan-600">Workspace</p>
              <p className="text-base font-black tracking-tight text-slate-900">MeetMind</p>
            </div>
          </div>

          {/* Desktop Navigation Menu */}
          <nav className="hidden items-center gap-1 rounded-2xl bg-slate-100/50 p-1 lg:flex">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    [
                      'relative flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-bold transition-all duration-300',
                      isActive
                        ? 'bg-white text-cyan-700 shadow-sm'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-white/50',
                    ].join(' ')
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={`h-4 w-4 ${isActive ? 'text-cyan-600' : ''}`} />
                      <span>{item.label}</span>
                      {isActive && (
                        <motion.div
                          layoutId="nav-pill"
                          className="absolute inset-0 z-[-1] rounded-xl bg-white shadow-sm"
                          transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                    </>
                  )}
                </NavLink>
              )
            })}
          </nav>

          {/* User Profile & Actions */}
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-3 rounded-2xl border border-slate-200 bg-white/50 px-4 py-1.5 backdrop-blur-sm sm:flex">
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
              <div className="leading-tight">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Account</p>
                <p className="text-sm font-black text-slate-800">{displayName}</p>
              </div>
            </div>

            <button
              onClick={logout}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 active:scale-95 lg:h-auto lg:w-auto lg:px-4 lg:py-2.5 lg:text-sm lg:font-bold"
            >
              <LogOut className="h-5 w-5 lg:h-4 lg:w-4" />
              <span className="ml-2 hidden lg:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="mx-auto max-w-screen-2xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <Outlet />
      </main>

      {/* Mobile Navigation Bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/50 bg-white/90 p-2 shadow-2xl backdrop-blur-xl lg:hidden">
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
                    'flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-bold transition-all',
                    isActive
                      ? 'bg-cyan-100 text-cyan-700'
                      : 'text-slate-500 hover:bg-slate-50',
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
