console.log("Sidebar control script v2.5 loaded!");

// --- Логика для сайдбара (остается без изменений) ---
const aggressiveCSS = `
  /* Принудительно скрываем сайдбар */
  .sidebar-hidden .main-sidebar {
    display: none !important;
    width: 0 !important;
  }

  /* КРИТИЧНО: Убираем отступ слева у всех основных контейнеров */
  .sidebar-hidden .content-wrapper,
  .sidebar-hidden .main-header,
  .sidebar-hidden .main-footer {
    margin-left: 0 !important;
  }

  /* Убираем все transitions чтобы избежать визуальных артефактов */
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

// --- Логика для скрытия элементов формы ---

/**
 * Находит и скрывает контейнер элемента "Длительность звонка".
 */
function hideCallDurationElement() {
  const callDurationSelect = document.getElementById('call_duration_id');
  if (callDurationSelect) {
    const callDurationContainer = callDurationSelect.closest('.row');
    if (callDurationContainer) {
      callDurationContainer.style.display = 'none';
      console.log('Элемент "Длительность звонка" был успешно скрыт.');
    }
  } else {
    console.log('Элемент "Длительность звонка" не найден на этой странице.');
  }
}

/**
 * НОВАЯ ФУНКЦИЯ
 * Находит и удаляет конкретный элемент <option> из выпадающего списка.
 */
function removeSpecificOption() {
  // 1. Находим родительский select по ID.
  const typeGroupSelect = document.getElementById('type_group');

  if (typeGroupSelect) {
    // 2. Используем CSS-селектор для поиска нужного option по его атрибуту value.
    const optionToRemove = typeGroupSelect.querySelector('option[value="КДГ 1 ЛТП"]');

    if (optionToRemove) {
      // 3. Удаляем найденный элемент.
      optionToRemove.remove();
      console.log('Элемент <option> со значением "КДГ 1 ЛТП" был успешно удален.');
    } else {
      console.log('Элемент <option> со значением "КДГ 1 ЛТП" не найден.');
    }
  } else {
    console.error('Выпадающий список с id="type_group" не найден.');
  }
}


// --- Обработчики сообщений и вызовы функций ---

// Вызываем функции для модификации формы сразу после загрузки скрипта.
hideCallDurationElement();
removeSpecificOption();

// Слушаем сообщения от popup для управления сайдбаром.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggle_sidebar") {
    const currentState = toggleSidebar();
    sendResponse({ status: `Sidebar is now ${currentState}` });
  }
  return true;
});
