import type { Config } from 'tailwindcss';

export default {
	content: ['./index.html', './src/**/*.{ts,tsx}'],
	theme: {
		extend: {
			fontFamily: {
				sans: [
					'-apple-system',
					'BlinkMacSystemFont',
					'SF Pro Display',
					'SF Pro Text',
					'system-ui',
					'sans-serif'
				]
			},
			colors: {
				// iOS semantic palette
				'ios-bg': '#000000',
				'ios-bg2': '#1c1c1e',
				'ios-bg3': '#2c2c2e',
				'ios-separator': '#38383a',
				'ios-label': '#ffffff',
				'ios-label2': '#ebebf599',
				'ios-label3': '#ebebf54d',
				'ios-blue': '#0a84ff',
				'ios-green': '#30d158',
				'ios-red': '#ff453a',
				'ios-orange': '#ff9f0a',
				'ios-gray': '#8e8e93',
				'ios-gray2': '#636366',
				'ios-gray3': '#48484a'
			},
			borderRadius: {
				'ios': '10px',
				'ios-lg': '16px',
				'ios-xl': '22px',
				'ios-2xl': '28px'
			},
			backdropBlur: {
				ios: '20px'
			}
		}
	},
	plugins: []
} satisfies Config;
