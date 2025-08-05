/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'therapy': {
          'mel': '#F97316',      // orange
          'aja': '#A855F7',      // purple  
          'ramit': '#3B82F6',    // blue
          'nora': '#EC4899',     // pink
          'michelle': '#6366F1'  // indigo
        }
      },
      animation: {
        'typing': 'typing 1.5s infinite',
        'pulse-soft': 'pulse 2s infinite',
      }
    },
  },
  plugins: [],
}