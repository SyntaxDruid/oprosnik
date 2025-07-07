console.log("Sidebar control script v1.8 (User CSS + Simplified JS) loaded!");

// 1. Используем ваш подробный и мощный CSS.
const customCSS = `
  /* Когда на body есть класс sidebar-collapse, применяем эти стили */
  .sidebar-collapse .main-sidebar {
    display: none !important;
  }

  .sidebar-collapse .content-wrapper,
  .sidebar-collapse .main-footer,
  .sidebar-collapse .main-header {
    margin-left: 0 !important;
  }
`;

// 2. Внедряем эти стили на страницу.
const styleSheet = document.createElement("style");
styleSheet.innerText = customCSS;
document.head.appendChild(styleSheet);

/**
 * 3. Самая простая и надежная функция переключения.
 * Она просто добавляет/убирает класс, а CSS выше делает всю работу.
 */
function toggleSidebar() {
  document.body.classList.toggle('sidebar-collapse');
  
  const isHidden = document.body.classList.contains('sidebar-collapse');
  console.log(`Toggled class. Sidebar is now ${isHidden ? 'hidden' : 'visible'}.`);
  return isHidden ? 'hidden' : 'visible';
}

// 4. Слушаем сообщения от popup.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggle_sidebar") {
    const currentState = toggleSidebar();
    sendResponse({ status: `Sidebar is now ${currentState}` });
  }
  return true; // Для асинхронного ответа.
});