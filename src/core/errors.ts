export function showError(error: unknown): void {
  console.error('[Corsaire]', error);
  if (document.getElementById('fatal-error')) return;
  document.querySelector('#app')?.setAttribute('inert', '');
  const panel = document.createElement('section');
  panel.id = 'fatal-error';
  panel.className = 'error-panel';
  panel.setAttribute('role', 'alert');
  const title = document.createElement('h2');
  title.textContent = 'La scène est interrompue';
  const message = document.createElement('p');
  message.textContent = error instanceof Error ? error.message : 'Une erreur inattendue est survenue.';
  const retry = document.createElement('button');
  retry.textContent = 'Recharger la scène';
  retry.onclick = () => location.reload();
  panel.append(title, message, retry);
  document.body.append(panel);
  retry.focus();
}
