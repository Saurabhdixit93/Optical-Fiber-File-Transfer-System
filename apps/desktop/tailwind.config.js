/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        darkBg: '#0b0f19',
        panelBg: '#131b2e',
        cardBg: '#1a243b',
        borderLine: '#243252',
        accentCyan: '#00f2fe',
        accentBlue: '#4facfe',
        accentGreen: '#10b981'
      }
    },
  },
  plugins: [],
}
