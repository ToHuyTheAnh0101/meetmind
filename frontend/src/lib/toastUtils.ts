import toast from 'react-hot-toast';

export const PREMIUM_TOAST_STYLE = {
  background: 'rgba(15, 23, 42, 0.9)',
  color: '#fff',
  backdropFilter: 'blur(8px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '1.25rem',
  fontSize: '14px',
  fontWeight: '600',
  padding: '12px 20px',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)'
};

export const showSuccessToast = (message: string, icon?: string) => {
  toast.success(message, {
    style: PREMIUM_TOAST_STYLE,
    icon: icon || '✅',
    duration: 4000
  });
};

export const showErrorToast = (message: string) => {
  toast.error(message, {
    style: {
      ...PREMIUM_TOAST_STYLE,
      border: '1px solid rgba(244, 63, 94, 0.2)',
    },
    icon: '❌',
    duration: 4000
  });
};

export const showInfoToast = (message: string, icon?: string) => {
  toast(message, {
    style: PREMIUM_TOAST_STYLE,
    icon: icon || 'ℹ️',
    duration: 4000
  });
};
