/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        wharton: {
          blue: "#011F5B",
          red: "#990000",
          lightBlue: "#EBF3FF",
          dark: "#0a1128",
        },
      },
    },
  },
  plugins: [],
}
