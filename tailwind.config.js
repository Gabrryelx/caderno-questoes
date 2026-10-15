module.exports = {
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: { bg: '#eef1f5', ink: '#14213d', line: '#d8dde6', hl: '#ffd23f', ok: '#1b8a5a', bad: '#c8372d' },
      fontFamily: {
        head: ['var(--font-head)', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
