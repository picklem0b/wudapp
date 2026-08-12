import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';

// ── Global styles ─────────────────────────────────────────────────────────────
const style = document.createElement('style');
style.textContent = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { height: 100%; }
  body { background: #000; color: #fff; -webkit-font-smoothing: antialiased; }
  button { font-family: inherit; }
  textarea, input { font-family: inherit; }
  @keyframes spin { to { transform: rotate(360deg); } }
  ::-webkit-scrollbar { width: 0; }
`;
document.head.appendChild(style);

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
	<StrictMode>
		<App />
	</StrictMode>
);
