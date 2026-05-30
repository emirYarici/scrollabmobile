import { Platform } from 'react-native';

export const theme = {
  colors: {
    bg: '#F8FAFC', // Sleek cool gray background
    surface: '#ffffff', // Pure white surfaces
    surfaceWarm: '#F1F5F9', // Soft light slate gray support card highlights
    fg: '#0F172A', // Slate 900 high contrast typography
    fg2: '#475569', // Slate 600 secondary support text
    muted: '#64748B', // Slate 500 violet-gray muted text
    accent: '#3B82F6', // Vibrant Blue primary accent
    accentSecondary: '#8B5CF6', // Vibrant Violet secondary accent
    accentOn: '#ffffff', // Contrast text on vibrant blue
    success: '#10B981', // Sleek emerald green success indicators
    warn: '#F59E0B', // Amber rating stars and warnings
    danger: '#EF4444', // Premium vibrant red indicators
    border: '#E2E8F0', // Clean Slate 200 borders
    borderSoft: '#F1F5F9', // Subtle Slate 100 boundaries
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    huge: 48,
  },
  typography: {
    fonts: {
      display: Platform.OS === 'ios' ? 'System' : 'sans-serif', // Inter display
      body: Platform.OS === 'ios' ? 'System' : 'sans-serif', // Inter body
      mono: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    },
    sizes: {
      xs: 12,
      sm: 14,
      base: 16,
      lg: 18,
      xl: 24,
      xxl: 36,
      xxxl: 54,
      huge: 76,
    },
    weights: {
      light: '300' as const,
      regular: '400' as const,
      medium: '500' as const,
      semibold: '600' as const,
      bold: '700' as const,
      heavy: '900' as const,
    },
  },
  radius: {
    sm: 10,
    md: 16,
    lg: 24,
    pill: 9999,
  },
  shadows: {
    flat: {
      shadowColor: 'transparent',
      elevation: 0,
    },
    ring: {
      shadowColor: '#E2E8F0',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 1,
      elevation: 1,
    },
    raised: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.08,
      shadowRadius: 22,
      elevation: 6,
    },
  },
};
