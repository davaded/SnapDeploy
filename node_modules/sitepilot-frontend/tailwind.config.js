/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
            colors: {
                background: 'hsl(var(--background))',
                surface: 'hsl(var(--surface))',
                border: 'hsl(var(--border))',
                text: {
                    primary: 'hsl(var(--text-primary))',
                    secondary: 'hsl(var(--text-secondary))',
                },
                accent: {
                    DEFAULT: 'hsl(var(--accent))',
                    hover: 'hsl(var(--accent) / 0.9)',
                }
            },
            boxShadow: {
                'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
                'glow': '0 0 20px -5px var(--accent)',
            }
        },
    },
    plugins: [],
}
