/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        'caveat': ['var(--font-caveat)', 'cursive'],
        'kalam': ['var(--font-kalam)', 'cursive'],
      },
      colors: {
        'therapy': {
          'danielle': '#10B981',  // emerald green (for investing/growth)
          'aja': '#A855F7',      // purple  
          'ramit': '#3B82F6',    // blue
          'nora': '#EC4899',     // pink
          'anita': '#FF6B35'     // warm saffron orange (culturally appropriate)
        }
      },
      animation: {
        'typing': 'typing 1.5s infinite',
        'pulse-soft': 'pulse 2s infinite',
      },
      rotate: {
        '0.5': '0.5deg',
        '1.5': '1.5deg',
        '2.5': '2.5deg',
      }
    },
  },
  plugins: [],
}