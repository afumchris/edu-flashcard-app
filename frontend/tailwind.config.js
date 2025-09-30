module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#1E40AF',
        secondary: '#DBEAFE',
        batman: {
          dark: '#1a1a1a',
          yellow: '#FFD700',
          blue: '#003366',
          gray: '#2d2d2d',
          lightGray: '#4a4a4a',
        },
      },
      fontFamily: {
        'batman': ['Impact', 'Arial Black', 'sans-serif'],
      },
      backgroundImage: {
        'batman-gradient': 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #1a1a1a 100%)',
        'batman-card': 'linear-gradient(145deg, #2d2d2d 0%, #1a1a1a 50%, #2d2d2d 100%)',
      },
      boxShadow: {
        'batman': '0 8px 32px rgba(255, 215, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        'batman-hover': '0 12px 40px rgba(255, 215, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
      },
      animation: {
        'bat-signal': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'flip-card': 'flipCard 0.6s ease-in-out',
      },
      keyframes: {
        flipCard: {
          '0%': { transform: 'rotateY(0deg)' },
          '100%': { transform: 'rotateY(180deg)' },
        },
      },
    },
  },
  plugins: [],
};