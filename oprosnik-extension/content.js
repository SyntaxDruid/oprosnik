console.log("Sidebar control script v2.6 loaded!");

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
 * НОВАЯ УНИВЕРСАЛЬНАЯ ФУНКЦИЯ
 * Находит и удаляет несколько элементов <option> из разных выпадающих списков.
 * @param {object} selectors - Объект, где ключ - это ID селектора,
 * а значение - массив 'value' опций для удаления.
 */
function removeSpecificOptions(selectors) {
  // Перебираем все селекторы (ключи) в переданном объекте
  for (const selectId in selectors) {
    // Проверяем, что это действительно свойство объекта, а не из прототипа
    if (Object.prototype.hasOwnProperty.call(selectors, selectId)) {
      const selectElement = document.getElementById(selectId);

      if (selectElement) {
        // Получаем массив значений для удаления для текущего селектора
        const valuesToRemove = selectors[selectId];

        // Перебираем все значения, которые нужно удалить
        valuesToRemove.forEach(value => {
          // Ищем option с точным совпадением атрибута value
          const optionToRemove = selectElement.querySelector(`option[value="${value}"]`);
          if (optionToRemove) {
            optionToRemove.remove();
            console.log(`Элемент <option> с value="${value}" удален из select#${selectId}.`);
          } else {
            console.log(`Элемент <option> с value="${value}" не найден в select#${selectId}.`);
          }
        });
      } else {
        console.error(`Выпадающий список с id="${selectId}" не найден.`);
      }
    }
  }
}


// --- Обработчики сообщений и вызовы функций ---

// Вызываем функции для модификации формы сразу после загрузки скрипта.
hideCallDurationElement();

// Определяем, какие опции и из каких селекторов нужно удалить.
const optionsToRemove = {
  'type_group': ['КДГ 1 ЛТП'], // Удаляем "КДГ 1 ЛТП" из #type_group
  'type_id': ['42','400','0']  // Удаляем "Не определен" из #mrf_id
};
// Вызываем новую универсальную функцию
removeSpecificOptions(optionsToRemove);


// Слушаем сообщения от popup для управления сайдбаром.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggle_sidebar") {
    const currentState = toggleSidebar();
    sendResponse({ status: `Sidebar is now ${currentState}` });
  }
  return true;
});