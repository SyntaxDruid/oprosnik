console.log("Sidebar control script v2.8 loaded!");

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

// --- Логика для скрытия и модификации элементов формы ---

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
 * УНИВЕРСАЛЬНАЯ ФУНКЦИЯ
 * Находит и удаляет несколько элементов <option> из разных выпадающих списков.
 * @param {object} selectors - Объект, где ключ - это ID селектора,
 * а значение - массив 'value' опций для удаления.
 */
function removeSpecificOptions(selectors) {
  for (const selectId in selectors) {
    if (Object.prototype.hasOwnProperty.call(selectors, selectId)) {
      const selectElement = document.getElementById(selectId);
      if (selectElement) {
        const valuesToRemove = selectors[selectId];
        valuesToRemove.forEach(value => {
          const optionToRemove = selectElement.querySelector(`option[value="${value}"]`);
          if (optionToRemove) {
            optionToRemove.remove();
            console.log(`Элемент <option> с value="${value}" удален из select#${selectId}.`);
          }
        });
      } else {
        // Не выводим ошибку, т.к. элемент может еще не существовать
      }
    }
  }
}


// --- Обработчики сообщений и вызовы функций ---

// Вызываем функции для модификации формы сразу после загрузки скрипта.
hideCallDurationElement();

// Определяем, какие опции и из каких селекторов нужно удалить.
const optionsToRemove = {
  'type_group': ['КДГ 1 ЛТП'], // Статическое удаление
  'type_id': ['0', '333', '42', '400']  // Список для динамического удаления
};

// Вызываем удаление для статичных селектов, которые не меняются.
removeSpecificOptions(optionsToRemove);

// Для динамически изменяемых списков, запускаем периодическую проверку.
// Это менее эффективно, чем MutationObserver, но может быть более надежным
// для обработки сложных динамических изменений на странице.
setInterval(() => {
  removeSpecificOptions(optionsToRemove);
}, 300); // Проверяем и удаляем каждые 300 миллисекунд.


// Слушаем сообщения от popup для управления сайдбаром.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggle_sidebar") {
    const currentState = toggleSidebar();
    sendResponse({ status: `Sidebar is now ${currentState}` });
  }
  return true;
});