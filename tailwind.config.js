/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        github: {
          dark: '#0d1117',
          header: '#161b22',
          border: '#30363d',
          text: '#c9d1d9',
          green: {
            DEFAULT: '#238636',
            hover: '#2ea043',
            muted: '#56d364'
          },
          highlight: '#30363d',
          secondary: '#8b949e',
          accent: '#1f6feb'
        }
      },
      boxShadow: {
        'github': '0 1px 0 rgba(27,31,36,0.04)',
        'github-medium': '0 3px 6px rgba(140,149,159,0.15)',
        'github-heavy': '0 8px 24px rgba(140,149,159,0.2)'
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ]
}