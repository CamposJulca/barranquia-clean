/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],

  theme: {
    extend: {

      colors: {

        avantika: {
          bg: "var(--avantika-bg)",
          text: "var(--avantika-text)",

          primary: "var(--avantika-primary)",
          secondary: "var(--avantika-secondary)",

          card: "var(--avantika-card)",
          border: "var(--avantika-border)",

          success: "var(--avantika-success)",
          warning: "var(--avantika-warning)",
          danger: "var(--avantika-danger)"
        }

      }

    }
  },

  plugins: []
}