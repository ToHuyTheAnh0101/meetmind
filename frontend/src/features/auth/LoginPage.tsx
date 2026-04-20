import React, { useEffect } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { Button } from '@/components/ui/button'
import Logo from '@/components/Logo'

const LoginPage: React.FC = () => {
  const handleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL}/auth/google`
  }

  // Parallax Effect
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  
  const springX = useSpring(mouseX, { stiffness: 50, damping: 20 })
  const springY = useSpring(mouseY, { stiffness: 50, damping: 20 })

  const moveX = useTransform(springX, [-500, 500], [20, -20])
  const moveY = useTransform(springY, [-500, 500], [20, -20])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX - window.innerWidth / 2)
      mouseY.set(e.clientY - window.innerHeight / 2)
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [mouseX, mouseY])

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 overflow-hidden bg-[#f8fafc]">
      {/* 1. IMMERSIVE BACKGROUND LAYER */}
      <div className="absolute inset-0 z-0">
        {/* Animated Mesh Gradients */}
        <div className="mesh-gradient-light opacity-60" />
        
        {/* Floating Blobs */}
        <motion.div 
          style={{ x: moveX, y: moveY }}
          className="absolute top-1/4 left-1/4 h-[400px] w-[400px] rounded-full bg-cyan-200/30 blur-[100px]" 
        />
        <motion.div 
          style={{ x: useTransform(moveX, (v) => -v), y: useTransform(moveY, (v) => -v) }}
          className="absolute bottom-1/4 right-1/4 h-[500px] w-[500px] rounded-full bg-indigo-200/30 blur-[120px]" 
        />

        {/* MOCK DASHBOARD PREVIEW (Blurred) */}
        <motion.div 
          style={{ x: useTransform(moveX, (v) => v * 0.5), y: useTransform(moveY, (v) => v * 0.5) }}
          className="absolute inset-4 sm:inset-10 rounded-[3rem] border border-white/40 bg-white/10 opacity-40 blur-[40px] pointer-events-none"
        >
          {/* Mock Header */}
          <div className="h-16 w-full border-b border-white/20 flex items-center px-10 gap-6">
            <div className="h-8 w-8 rounded-lg bg-white/20" />
            <div className="h-4 w-32 rounded-full bg-white/20" />
            <div className="ml-auto flex gap-4">
               <div className="h-8 w-24 rounded-full bg-white/20" />
               <div className="h-8 w-8 rounded-full bg-white/20" />
            </div>
          </div>
          {/* Mock Content */}
          <div className="p-10 grid grid-cols-12 gap-6">
            <div className="col-span-8 space-y-6">
              <div className="h-48 w-full rounded-[2rem] bg-white/20" />
              <div className="h-96 w-full rounded-[2rem] bg-white/20" />
            </div>
            <div className="col-span-4 space-y-6">
              <div className="h-40 w-full rounded-[2rem] bg-white/20" />
              <div className="h-96 w-full rounded-[2rem] bg-white/20" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* 2. THE FLOATING GATEWAY CARD */}
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ 
          type: "spring",
          stiffness: 100,
          damping: 20,
          delay: 0.2
        }}
        className="relative z-10 w-full max-w-2xl overflow-hidden rounded-[4rem] border border-white/70 bg-white/60 p-8 shadow-[0_48px_100px_-20px_rgba(79,70,229,0.15)] backdrop-blur-[50px] sm:p-16 lg:max-w-4xl"
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:gap-16">
          {/* Left Side: Branding */}
          <div className="hidden lg:flex flex-col items-center gap-8 lg:w-1/3">
            <motion.div
              animate={{ 
                rotate: [0, 5, -5, 0],
                y: [0, -10, 0]
              }}
              transition={{ 
                duration: 6, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
            >
              <Logo size={140} showText={false} />
            </motion.div>
            <div className="text-center">
              <h3 className="text-xl font-black tracking-tighter text-slate-900">MeetMind Sync</h3>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-cyan-600">
                Premium Collaboration
              </p>
            </div>
          </div>

          {/* Right Side: Form */}
          <div className="flex-1 space-y-8 sm:space-y-10">
            <header className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-cyan-50 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-cyan-700 sm:text-xs">
                <span className="flex h-1.5 w-1.5 rounded-full bg-cyan-600 animate-pulse" />
                V2.0 Intelligent Hub
              </div>
              <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                Chào <br /> 
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-indigo-600">buổi sáng!</span>
              </h1>
              <p className="max-w-sm text-sm font-medium text-slate-500 sm:text-lg">
                Hệ thống đã sẵn sàng. Hãy đăng nhập để bắt đầu phiên làm việc của bạn.
              </p>
            </header>

            <div className="space-y-8">
              <div className="space-y-4">
                <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  Authentication Required
                </label>
                <Button
                  onClick={handleLogin}
                  className="group relative h-14 w-full overflow-hidden rounded-2xl bg-slate-900 px-8 text-base font-bold text-white shadow-xl transition-all hover:bg-slate-800 hover:scale-[1.02] active:scale-95 sm:h-16"
                >
                  <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
                  <div className="relative flex items-center justify-center gap-3">
                    <svg className="h-6 w-6" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    <span>Tiếp tục với Google</span>
                  </div>
                </Button>
              </div>

              <div className="flex flex-col gap-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 sm:flex-row sm:items-center sm:justify-between">
                <span className="flex items-center gap-2">
                  <div className="h-1 w-8 rounded-full bg-slate-200" />
                  Secured by MeetMind
                </span>
                <div className="flex gap-4">
                  <span className="cursor-pointer transition hover:text-indigo-600">Privacy</span>
                  <span className="cursor-pointer transition hover:text-indigo-600">Terms</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default LoginPage
