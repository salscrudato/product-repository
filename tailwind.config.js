module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'dark-bg': '#1A1A1A',
        'text-white': '#FFFFFF',
        'accent-orange': '#F28C38',
        'code-bg': '#2E2E2E',
      },
      fontFamily: {
        sans: ['Roboto', 'Open Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
}