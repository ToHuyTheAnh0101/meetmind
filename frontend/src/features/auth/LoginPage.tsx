import React from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import Logo from '@/components/Logo'

const LoginPage: React.FC = () => {
  const handleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL}/auth/google`
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-6 sm:p-12 overflow-hidden">
      {/* Light Mesh Gradient Background */}
      <div className="mesh-gradient-light" />
      
      {/* Animated Blobs for added airiness */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-100 rounded-full blur-[120px] opacity-70 animate-pulse" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-purple-100 rounded-full blur-[100px] opacity-60 delay-[2s] animate-pulse" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1.15, y: 0 }}
        transition={{ duration: 1.5, ease: 'easeOut' }}
        className="z-10 w-full max-w-7xl premium-panel origin-center"
      >
        {/* Left Part: Dark Branding */}
        <div className="hidden lg:flex lg:w-2/5 left-gradient-panel items-center justify-center p-12">
          <div className="relative z-10 flex flex-col items-center gap-6">
            <motion.div
              animate={{ 
                y: [0, -15, 0],
                rotate: [0, 2, -2, 0]
              }}
              transition={{ 
                duration: 8, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
            >
              <Logo size={120} />
            </motion.div>
            <div className="text-center mt-4">
              <h3 className="text-white text-2xl font-bold tracking-tight">MeetMind Sync</h3>
              <p className="text-white/40 text-sm mt-2 font-medium tracking-widest uppercase">Intelligent Collaboration</p>
            </div>
          </div>
          
          {/* Subtle Abstract Ornament */}
          <div className="absolute bottom-[-50px] left-[-30px] w-64 h-64 border-[40px] border-white/5 rounded-full" />
        </div>

        {/* Right Part: Form Login */}
        <div className="w-full lg:w-3/5 bg-white p-10 sm:p-20 flex flex-col justify-center">
          <div className="space-y-10 max-w-md mx-auto w-full">
            <header className="space-y-3">
              <span className="text-slate-400 font-medium tracking-wide uppercase text-xs">Phần mềm quản lý cuộc họp</span>
              <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 tracking-tight">Chào buổi sáng!</h1>
              <p className="text-lg text-slate-500 font-light">Chào mừng bạn quay trở lại. Hãy đăng nhập để bắt đầu phiên làm việc.</p>
            </header>

            <div className="space-y-6">
              <div className="flex flex-col gap-4">
                <label className="text-sm font-semibold text-slate-700 ml-1">Bắt đầu phiên đăng nhập</label>
                <Button
                  onClick={handleLogin}
                  className="google-login-btn group"
                >
                  <svg className="w-6 h-6 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
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
                  Đăng nhập bằng Google
                </Button>
              </div>

              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-100" />
                </div>
                <div className="relative flex justify-center text-xs uppercase tracking-widest text-slate-400">
                  <span className="bg-white px-4">Bảo mật đa lớp</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Gặp sự cố đăng nhập?</span>
                <span className="text-indigo-600 hover:text-indigo-700 font-semibold cursor-pointer">Sửa lỗi ngay</span>
              </div>
            </div>

            <footer className="pt-12 flex items-center justify-between border-t border-slate-50 text-slate-300 text-xs">
              <p>© 2024 MeetMind Team.</p>
              <div className="flex gap-4">
                <span className="hover:text-slate-500 cursor-pointer">Quyền riêng tư</span>
                <span className="hover:text-slate-500 cursor-pointer">Điều khoản</span>
              </div>
            </footer>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default LoginPage
