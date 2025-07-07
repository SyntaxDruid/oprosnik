console.log("Sidebar control script v2.3 loaded!");

// --- Логика для сайдбара (остается без изменений) ---
const aggressiveCSS = `
  .sidebar-hidden .main-sidebar {
    display: none !important;
  }
  .sidebar-hidden .content-wrapper,
  .sidebar-hidden .main-header,
  .sidebar-hidden .main-footer {
    margin-left: 0 !important;
  }
  .sidebar-hidden .content-wrapper,
  .sidebar-hidden .main-header,
  .sidebar-hidden .main-footer {
    transition: none !important;
  }
`;
const styleSheet = document.createElement("style");
styleSheet.innerText = aggressiveCSS;
document.head.appendChild(styleSheet);

function toggleSidebar() {
  document.body.classList.toggle('sidebar-hidden');
  const isHidden = document.body.classList.contains('sidebar-hidden');
  console.log(`Toggled class. Sidebar is now ${isHidden ? 'hidden' : 'visible'}.`);
  return isHidden ? 'hidden' : 'visible';
}

// --- НОВАЯ ЛОГИКА: Скрытие элемента формы ---

/**
 * Находит и скрывает контейнер элемента "Длительность звонка".
 * Это делается путем установки style.display = 'none', что скрывает
 * элемент, но оставляет его в DOM для валидации сервером.
 */
function hideCallDurationElement() {
  // 1. Находим выпадающий список по его уникальному ID.
  const callDurationSelect = document.getElementById('call_duration_id');

  if (callDurationSelect) {
    // 2. Находим его ближайший родительский элемент с классом 'row'.
    // Это и есть контейнер, который нужно скрыть.
    const callDurationContainer = callDurationSelect.closest('.row');

    if (callDurationContainer) {
      // 3. Скрываем контейнер.
      callDurationContainer.style.display = 'none';
      console.log('Элемент "Длительность звонка" был успешно скрыт.');
    } else {
      console.error('Не удалось найти родительский контейнер для элемента "Длительность звонка".');
    }
  } else {
    // Это сообщение появится, если элемент не будет найден на странице.
    console.log('Элемент "Длительность звонка" не найден на этой странице.');
  }
}

// --- Обработчики сообщений и вызовы функций ---

// Вызываем новую функцию для скрытия элемента сразу после загрузки скрипта.
hideCallDurationElement();

// Слушаем сообщения от popup для управления сайдбаром.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggle_sidebar") {
    const currentState = toggleSidebar();
    sendResponse({ status: `Sidebar is now ${currentState}` });
  }
  return true;
});
