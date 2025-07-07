console.log("Popup script loaded.");

document.getElementById('reloadBtn').addEventListener('click', () => {
  console.log("Reload button clicked.");
  // Запрашиваем активную вкладку
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length > 0) {
      const tabId = tabs[0].id;
      const targetUrl = "https://ctp.rt.ru/quiz";

      // Проверяем, на нужной ли мы странице
      if (tabs[0].url.startsWith(targetUrl)) {
        // Если да, просто перезагружаем
        chrome.tabs.reload(tabId);
        console.log("Already on the correct page, reloading...");
      } else {
        // Если нет, сначала переходим на нужный URL, а потом перезагружаем
        chrome.tabs.update(tabId, { url: targetUrl }, () => {
          // Callback не нужен, так как переход на новый URL уже является перезагрузкой.
          console.log(`Navigated to ${targetUrl}.`);
        });
      }
    } else {
      console.error("No active tab found.");
    }
  });
});
