import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}", "../server/src/views/**/*.ts"],
  theme: {
  	extend: {
  		// design.md §4. `brand` é SÓ a marca (wordmark); `display` é H1/H2;
  		// `body` é o padrão de tudo; `emphasis` é o itálico serifado de UMA
  		// palavra por título, nunca de frase inteira.
  		fontFamily: {
  			brand: ['MuseoModerno', 'system-ui', 'sans-serif'],
  			display: ['Outfit', 'system-ui', 'sans-serif'],
  			body: ['"Hanken Grotesk"', 'system-ui', 'sans-serif'],
  			mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
  			emphasis: ['"Playfair Display"', 'Georgia', 'serif']
  		},
  		colors: {
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))',
  				// Pílula do item ativo da barra lateral (design.md §13).
  				tint: 'hsl(var(--primary-tint))',
  				'tint-foreground': 'hsl(var(--primary-tint-foreground))'
  			},
  			// Fundo do shell da área logada (design.md §13).
  			'surface-alt': 'hsl(var(--surface-alt))',
  			// O tom da vitrine (#F5F5F7), para o rodapé do app ecoar o menu da home.
  			'surface-vitrine': 'hsl(var(--surface-vitrine))',
  			// Rail escuro — nível 1 da navegação (design.md §13).
  			rail: {
  				DEFAULT: 'hsl(var(--rail))',
  				foreground: 'hsl(var(--rail-foreground))',
  				ativo: 'hsl(var(--rail-item-ativo))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [],
};

export default config;
