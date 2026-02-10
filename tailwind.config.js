/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/renderer/**/*.{js,ts,jsx,tsx,html}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar))',
          foreground: 'hsl(var(--sidebar-foreground))',
          border: 'hsl(var(--sidebar-border))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))'
        },
        topbar: {
          DEFAULT: 'hsl(var(--topbar))',
          foreground: 'hsl(var(--topbar-foreground))',
          border: 'hsl(var(--topbar-border))'
        },
        reading: {
          bg: 'hsl(var(--reading-bg))',
          fg: 'hsl(var(--reading-fg))',
          link: 'hsl(var(--reading-link))'
        }
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      fontSize: {
        /* UI typography scale */
        'ui-xs': ['0.6875rem', { lineHeight: '1rem' }],       /* 11px */
        'ui-sm': ['0.8125rem', { lineHeight: '1.25rem' }],    /* 13px */
        'ui-base': ['0.875rem', { lineHeight: '1.375rem' }],  /* 14px */
        'ui-lg': ['1rem', { lineHeight: '1.5rem' }],          /* 16px */
        'ui-xl': ['1.125rem', { lineHeight: '1.75rem' }],     /* 18px */
        /* Reading typography scale */
        'reading-sm': ['0.9375rem', { lineHeight: '1.7' }],   /* 15px */
        'reading-base': ['1.0625rem', { lineHeight: '1.75' }],/* 17px */
        'reading-lg': ['1.1875rem', { lineHeight: '1.75' }],  /* 19px */
        'reading-xl': ['1.375rem', { lineHeight: '1.7' }],    /* 22px */
        'reading-2xl': ['1.625rem', { lineHeight: '1.5' }]    /* 26px */
      },
      spacing: {
        /* Desktop-optimized spacing */
        'sidebar': 'var(--sidebar-width)',
        'topbar': 'var(--topbar-height)'
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' }
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' }
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out'
      }
    }
  },
  plugins: [require('tailwindcss-animate')]
}
