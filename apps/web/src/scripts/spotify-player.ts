document.addEventListener('astro:page-load', () => {
  document.querySelectorAll<HTMLElement>('.spotify-player-toggle').forEach(btn => {
    const player = btn.closest<HTMLElement>('.spotify-player');
    if (!player) return;

    function toggle() {
      const minimized = player!.classList.toggle('spotify-player--minimized');
      btn.setAttribute('aria-expanded', String(!minimized));
      btn.setAttribute('aria-label', minimized ? 'Expand player' : 'Minimize player');
    }

    btn.addEventListener('click', toggle);

    player.querySelector<HTMLElement>('.spotify-logo-link')?.addEventListener('click', (e) => {
      if (player.classList.contains('spotify-player--minimized')) {
        e.preventDefault();
        toggle();
      }
    });
  });

  const _window = window as typeof window & { onSpotifyIframeApiReady: unknown };
  _window.onSpotifyIframeApiReady = (IFrameAPI: any) => {
    const target = document.querySelector<HTMLElement>('.spotify-embed-target');
    if (!target) return;
    const URI = 'spotify:playlist:2vrJxU2xiqzsPNWvc0Q4PL';
    IFrameAPI.createController(
      target,
      { uri: URI, width: '100%', height: 352 },
      (EmbedController: any) => {
        const iframe   = EmbedController?.iframeElement as HTMLIFrameElement;
        const player   = iframe?.closest<HTMLElement>('.spotify-player');
        const skeleton = player?.querySelector<HTMLElement>('.spotify-skeleton');
        const dot      = player?.querySelector<HTMLElement>('.spotify-player-hint-dot');

        if (player?.classList.contains('spotify-player--minimized')) {
          player.classList.remove('spotify-player--minimized');
          const toggle = player.querySelector<HTMLButtonElement>('.spotify-player-toggle');
          if (toggle) {
            toggle.setAttribute('aria-expanded', 'true');
            toggle.setAttribute('aria-label', 'Minimize player');
          }
        }

        iframe.src += '&theme=0';

        EmbedController.addListener('ready', () => {
          target.classList.add('loaded');
          skeleton?.classList.add('hidden');
        });

        EmbedController.addListener('playback_update', (e: any) => {
          dot?.classList.toggle('playing', !e.data.isPaused);
        });
      }
    );
  };
});
