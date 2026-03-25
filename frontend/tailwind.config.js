/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      // Keep legacy color aliases used by ExpertiseChart + old code
      colors: {
        surface: '#09090b',   // zinc-950
        panel: '#18181b',     // zinc-900
        border: '#27272a',    // zinc-800
        accent: '#60a5fa',    // blue-400
        success: '#34d399',   // emerald-400
        warning: '#fbbf24',   // amber-400
        muted: '#71717a',     // zinc-500
      },
    },
  },
  plugins: [],
};
