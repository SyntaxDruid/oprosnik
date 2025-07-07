document.getElementById('toggleSidebar').addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    // Отправляем сообщение в content.js с новой командой
    chrome.tabs.sendMessage(tabs[0].id, { action: "toggle_sidebar" });
  });
});