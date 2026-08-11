import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import '@fontsource/space-grotesk/400.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/600.css';
import '@fontsource/space-grotesk/700.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/600.css';

// Some embedded webviews never advance CSS animations/transitions (they freeze
// at the start state), which would leave every animated overlay invisible and
// make buttons appear dead. Probe once with an existing app keyframe: if the
// element is still stuck at the `from` scale after the animation window, snap
// the whole UI to its final state via a data attribute.
function detectAnimations(): void {
  try {
    const el = document.createElement('div');
    el.className = 'win-enter'; // keyframes: from scale(0.97) → to scale(1)
    el.style.cssText = 'position:fixed;left:-9999px;top:0;width:10px;height:10px;pointer-events:none';
    document.body.appendChild(el);
    window.setTimeout(() => {
      const t = getComputedStyle(el).transform;
      // Frozen at `from` (scale ~0.97); completed animations leave no transform.
      const frozen = t !== 'none' && !/matrix\(1, 0, 0, 1, 0, 0\)/.test(t);
      document.documentElement.dataset.anim = frozen ? 'off' : 'on';
      el.remove();
      if (frozen) console.warn('[VOX] Webview does not advance CSS animations — UI snapped to final states (functional, static).');
    }, 260);
  } catch {
    document.documentElement.dataset.anim = 'off';
  }
}
detectAnimations();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
