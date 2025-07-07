console.log("Sidebar control script v2.1 (Persistent Observer) loaded!");

// Создаем наблюдателя, но пока не активируем его.
// Он будет следить за изменениями атрибута 'style' у элемента.
let observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    // Если изменился атрибут 'style'...
    if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
      const targetElement = mutation.target;
      // ...и отступ слева не равен '0px', мы принудительно возвращаем его к нулю.
      if (targetElement.style.marginLeft !== '0px') {
        targetElement.style.marginLeft = '0px';
        console.log(`Forcefully reset marginLeft for ${targetElement.className}`);
      }
    }
  });
});

// Настройки для наблюдателя: следить только за атрибутами.
const observerConfig = { attributes: true };

function toggleSidebar() {
  const sidebar = document.querySelector('.main-sidebar');
  const content = document.querySelector('.content-wrapper');
  const header = document.querySelector('.main-header');

  if (!sidebar || !content || !header) {
    console.error("Critical page element not found.");
    return "Error: Critical element not found.";
  }

  // Проверяем, видим ли мы сайдбар.
  if (sidebar.style.display !== 'none') {
    // --- СКРЫВАЕМ САЙДБАР И АКТИВИРУЕМ ОХРАНУ ---
    console.log("Hiding sidebar and activating observer...");
    sidebar.style.display = 'none';
    content.style.marginLeft = '0px';
    header.style.marginLeft = '0px';

    // Начинаем наблюдение за контентом и хедером.
    observer.observe(content, observerConfig);
    observer.observe(header, observerConfig);

    return "hidden";
  } else {
    // --- ПОКАЗЫВАЕМ САЙДБАР И ОТКЛЮЧАЕМ ОХРАНУ ---
    console.log("Showing sidebar and disconnecting observer...");
    // Сначала отключаем наблюдателя, чтобы он не мешал.
    observer.disconnect();

    // Затем возвращаем стили к исходному состоянию.
    sidebar.style.display = '';
    content.style.marginLeft = '';
    header.style.marginLeft = '';

    return "visible";
  }
}

// Слушаем сообщения от popup.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggle_sidebar") {
    const currentState = toggleSidebar();
    sendResponse({ status: `Sidebar is now ${currentState}` });
  }
  return true;
});