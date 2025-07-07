console.log("Sidebar control script v2.0 (Direct Style Manipulation) loaded!");

/**
 * This is the most direct approach. We will use JavaScript to set
 * inline styles directly on the elements. Inline styles have the highest
 * priority and will override any styles from the page's own stylesheets or scripts.
 */
function toggleSidebar() {
  const sidebar = document.querySelector('.main-sidebar');
  const content = document.querySelector('.content-wrapper');
  const header = document.querySelector('.main-header');

  if (!sidebar || !content || !header) {
    console.error("Critical page element not found. Aborting.");
    return "Error: A critical element was not found.";
  }

  // Проверяем, видим ли мы сайдбар
  if (sidebar.style.display !== 'none') {
    // --- СКРЫВАЕМ САЙДБАР ---
    // 1. Прячем сайдбар
    sidebar.style.display = 'none';

    // 2. Убираем отступ слева у контента и хедера
    content.style.marginLeft = '0px';
    header.style.marginLeft = '0px';

    console.log("Sidebar hidden via direct style manipulation.");
    return "hidden";

  } else {
    // --- ПОКАЗЫВАЕМ САЙДБАР ---
    // 1. Показываем сайдбар
    sidebar.style.display = ''; // Убираем инлайн стиль, возвращая к дефолту

    // 2. Убираем наши инлайн стили отступов, позволяя скриптам страницы
    // вернуть все как было.
    content.style.marginLeft = '';
    header.style.marginLeft = '';

    console.log("Sidebar restored to its default state.");
    return "visible";
  }
}

// Слушаем сообщения от popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggle_sidebar") {
    const currentState = toggleSidebar();
    sendResponse({ status: `Sidebar is now ${currentState}` });
  }
  return true;
});