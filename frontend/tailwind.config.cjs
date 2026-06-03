module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'brand-primary': '#E23D4F',
        'brand-secondary': '#3B82F6',
        'brand-dark': '#101114',
        'brand-panel': '#17191F',
        'brand-card': '#1D2027',
        'brand-cardLight': '#252934',
        'brand-border': '#30343D',
        'brand-text': '#F1F3F5',
        'brand-textMuted': '#B8C0CC',
        'brand-textSubtle': '#87909F',
        'brand-warning': '#E8B44F',
        'brand-success': '#10b981',
        'brand-error': '#E23D4F',
      },
      borderRadius: {
        'brand': '8px',
        'brand-lg': '10px',
        'brand-md': '6px',
      },
      boxShadow: {
        panel: '0 18px 70px -55px rgba(0, 0, 0, 0.9)',
      },
    },
  },
  plugins: [],
};
