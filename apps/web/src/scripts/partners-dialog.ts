document.querySelectorAll<HTMLDialogElement>('.vendor-modal').forEach(dialog => {
  dialog.addEventListener('click', e => {
    if (e.target === dialog) dialog.close();
  });
});
