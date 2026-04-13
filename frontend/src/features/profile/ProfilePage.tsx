import React from 'react'
import { useAuth } from '@/features/auth/AuthContext'

const ProfilePage: React.FC = () => {
  const { user } = useAuth()
  const displayName = user ? `${user.firstName} ${user.lastName}`.trim() : 'Unknown user'

  return (
    <section className="rounded-2xl border border-white/50 bg-white/85 p-4 shadow-xl backdrop-blur sm:rounded-3xl sm:p-6">
      <h1 className="text-2xl font-bold text-slate-900">Profile</h1>
      <p className="mt-2 text-slate-600">Basic profile surface for Phase 2.1 shell routing.</p>

      <div className="mt-6 space-y-2 text-sm text-slate-700">
        <p>
          <span className="font-semibold">Name:</span> {displayName}
        </p>
        <p>
          <span className="font-semibold">Email:</span> {user?.email || 'N/A'}
        </p>
      </div>
    </section>
  )
}

export default ProfilePage
