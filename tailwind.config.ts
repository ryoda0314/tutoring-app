import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                paper: {
                    DEFAULT: '#F5F1E8',
                    light: '#FAF8F3',
                    dark: '#EBE5D8',
                },
                ink: {
                    DEFAULT: '#1E3A4F',
                    light: '#3A5A6F',
                    faint: '#6B8494',
                },
                accent: {
                    DEFAULT: '#B54834',
                    light: '#D4694D',
                    subtle: '#F0DDD8',
                },
                ochre: {
                    DEFAULT: '#C4964B',
                    light: '#E5C78D',
                    subtle: '#F5EFE0',
                },
                sage: {
                    DEFAULT: '#4A6B5A',
                    light: '#6B9B7A',
                    subtle: '#E5EDE8',
                },
            },
            fontFamily: {
                display: ['Shippori Mincho', 'Hiragino Mincho ProN', 'Yu Mincho', 'serif'],
                body: ['Zen Kaku Gothic New', 'Hiragino Kaku Gothic Pro', 'sans-serif'],
            },
            boxShadow: {
                'card': '0 2px 8px rgba(30, 58, 79, 0.06), 0 1px 2px rgba(30, 58, 79, 0.04)',
            },
            borderRadius: {
                'card': '6px 10px 8px 10px',
            },
            keyframes: {
                fadeSlideUp: {
                    '0%': { opacity: '0', transform: 'translateY(8px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                shimmer: {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                },
            },
            animation: {
                'fade-slide-up': 'fadeSlideUp 0.4s ease forwards',
                'fade-in': 'fadeIn 0.3s ease forwards',
                'shimmer': 'shimmer 1.5s infinite',
            },
        },
    },
    plugins: [],
};

export default config;
