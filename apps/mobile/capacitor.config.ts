import type { CapacitorConfig } from '@capacitor/cli';

const isProd = process.env.NODE_ENV === 'production';

const config: CapacitorConfig = {
	appId: 'com.wudapp.mobile',
	appName: 'Wudapp',
	webDir: 'dist',
	server: {
		androidScheme: 'https',
		// In dev: comment this out and run the server locally
		// In prod: built by GitHub Actions with VITE_API_URL injected
		...(isProd
			? {}
			: {
					// url: 'http://192.168.x.x:3001', // uncomment for local LAN dev
				})
	},
	plugins: {
		Camera: { permissions: ['camera'] },
		Microphone: { permissions: ['microphone'] },
		CapacitorHttp: { enabled: true }
	},
	android: {
		allowMixedContent: true // needed for http on older Android versions
	}
};

export default config;
