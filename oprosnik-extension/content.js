console.log("Скрипт для управления сайдбаром загружен!");

// Функция для переключения видимости сайдбара
function toggleSidebar() {
  // Находим тег body
  const body = document.body;

  // Проверяем, есть ли у body класс 'sidebar-collapse'
  if (body.classList.contains('sidebar-collapse')) {
    // Если есть - убираем его, чтобы показать сайдбар
    body.classList.remove('sidebar-collapse');
    console.log('Сайдбар показан.');
  } else {
    // Если нет - добавляем его, чтобы скрыть сайдбар
    body.classList.add('sidebar-collapse');
    console.log('Сайдбар скрыт.');
  }
}

// Слушаем сообщения от popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Если пришла команда 'toggle_sidebar', вызываем нашу функцию
  if (request.action === "toggle_sidebar") {
    toggleSidebar();
  }
});