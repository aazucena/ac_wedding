document.addEventListener('astro:page-load', () => {
  const filterBtns  = document.querySelectorAll<HTMLButtonElement>('.gallery-filter-btn');
  const bwBtn       = document.getElementById('gallery-filter-bw') as HTMLButtonElement | null;
  const gridItems   = document.querySelectorAll<HTMLElement>('.gallery-item:not(.gallery-item--pad)');
  const padItems    = document.querySelectorAll<HTMLElement>('.gallery-item--pad');
  const emptyMsg    = document.getElementById('gallery-filter-empty');

  if (!filterBtns.length || !gridItems.length) return;

  let activeCategory = 'all';
  let bwOnly = false;

  function applyFilter() {
    let visible = 0;
    gridItems.forEach(item => {
      const cat   = item.dataset.category ?? '';
      const isBW  = item.dataset.bw === 'true';
      const catOk = activeCategory === 'all' || cat === activeCategory;
      const bwOk  = !bwOnly || isBW;
      const show  = catOk && bwOk;
      item.style.display = show ? '' : 'none';
      if (show) visible++;
    });
    const showPads = activeCategory === 'all' && !bwOnly;
    padItems.forEach(p => { p.style.display = showPads ? '' : 'none'; });
    if (emptyMsg) {
      emptyMsg.textContent = visible === 0
        ? 'No photos in this category yet — check back soon.'
        : '';
    }
  }

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.dataset.filter ?? 'all';
      applyFilter();
    });
  });

  bwBtn?.addEventListener('click', () => {
    bwOnly = !bwOnly;
    bwBtn.classList.toggle('active', bwOnly);
    bwBtn.setAttribute('aria-pressed', String(bwOnly));
    applyFilter();
  });
});
