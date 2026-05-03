import { useState, useEffect } from 'react';

export type TimePeriod = 'morning' | 'afternoon' | 'evening';

interface TimeTheme {
  period: TimePeriod;
  greetingPrefixKey: string;
  greetingSuffixKey: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    bgGradient: string;
    textGradient: string;
    blob1: string;
    blob2: string;
  };
}

export const useTimeTheme = (): TimeTheme => {
  const [period, setPeriod] = useState<TimePeriod>('morning');

  useEffect(() => {
    const updatePeriod = () => {
      const hour = new Date().getHours();
      if (hour >= 5 && hour < 12) {
        setPeriod('morning');
      } else if (hour >= 12 && hour < 18) {
        setPeriod('afternoon');
      } else {
        setPeriod('evening');
      }
    };

    updatePeriod();
    const interval = setInterval(updatePeriod, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const themes: Record<TimePeriod, TimeTheme> = {
    morning: {
      period: 'morning',
      greetingPrefixKey: 'auth.welcome_morning_prefix',
      greetingSuffixKey: 'auth.welcome_morning_suffix',
      colors: {
        primary: 'text-cyan-600',
        secondary: 'text-indigo-600',
        accent: 'bg-cyan-50 text-cyan-700',
        bgGradient: 'from-cyan-600 to-indigo-600',
        textGradient: 'from-cyan-600 to-indigo-600',
        blob1: 'bg-cyan-200/30',
        blob2: 'bg-indigo-200/30',
      },
    },
    afternoon: {
      period: 'afternoon',
      greetingPrefixKey: 'auth.welcome_afternoon_prefix',
      greetingSuffixKey: 'auth.welcome_afternoon_suffix',
      colors: {
        primary: 'text-orange-600',
        secondary: 'text-rose-600',
        accent: 'bg-orange-50 text-orange-700',
        bgGradient: 'from-orange-600 to-rose-600',
        textGradient: 'from-orange-500 to-rose-500',
        blob1: 'bg-orange-200/30',
        blob2: 'bg-rose-200/30',
      },
    },
    evening: {
      period: 'evening',
      greetingPrefixKey: 'auth.welcome_evening_prefix',
      greetingSuffixKey: 'auth.welcome_evening_suffix',
      colors: {
        primary: 'text-indigo-600',
        secondary: 'text-violet-600',
        accent: 'bg-indigo-50 text-indigo-700',
        bgGradient: 'from-indigo-600 to-violet-600',
        textGradient: 'from-indigo-500 to-violet-500',
        blob1: 'bg-indigo-300/20',
        blob2: 'bg-slate-400/20',
      },
    },
  };

  return themes[period];
};
