
let deferredInstallPrompt = null;
const installBarEl = document.getElementById('installBar');
const installBtnEl = document.getElementById('installBtn');
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  });
}
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  installBarEl?.classList.add('show');
});
installBtnEl?.addEventListener('click', async () => {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    installBarEl?.classList.remove('show');
  } else {
    alert('Para salvar na tela principal: toque nos 3 pontos do navegador e escolha “Adicionar à tela inicial” ou “Instalar aplicativo”.');
  }
});
