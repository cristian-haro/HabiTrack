// HabiTrack Client Orchestrator
// Modular architecture loader replacing legacy monolithic 209KB file

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

  scripts.forEach(src => {
    const s = document.createElement('script');
    s.src = src;
    s.defer = true;
    document.head.appendChild(s);
  });
})();
