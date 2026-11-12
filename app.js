// HabiTrack Client Orchestrator
// Modular architecture loader replacing legacy monolithic 209KB file.
//
// Dynamically injected scripts ignore `defer` and execute asynchronously,
// usually AFTER DOMContentLoaded has already fired. We therefore force ordered
// execution (`async = false`) and bootstrap the app explicitly once the last
// module has loaded, instead of relying on DOMContentLoaded listeners.

(function loadModules() {
  const scripts = [
    'modules/01-state.js',
    'modules/02-init.js',
    'modules/03-auth.js',
    'modules/04-api.js',
    'modules/05-workspaces.js',
    'modules/06-calculator.js',
    'modules/07-scraper.js',
    'modules/08-ui-render.js',
    'modules/09-photos.js',
    'modules/10-detail-sheet.js',
    'modules/11-collaboration.js',
    'modules/12-events.js',
    'modules/13-utils.js',
    'modules/14-export.js',
    'modules/15-map.js'
  ];

  let pending = scripts.length;

  const onAllLoaded = () => {
    const start = () => {
      if (typeof window.bootstrapApp === 'function') window.bootstrapApp();
      else console.error('[HabiTrack] bootstrapApp no está definido.');
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
      start();
    }
  };

  scripts.forEach(src => {
    const s = document.createElement('script');
    s.src = src;
    s.async = false;
    s.onload = () => {
      pending -= 1;
      if (pending === 0) onAllLoaded();
    };
    s.onerror = () => console.error(`[HabiTrack] No se pudo cargar ${src}`);
    document.head.appendChild(s);
  });
})();
