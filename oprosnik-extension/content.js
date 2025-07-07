console.log("Form modification script v2.9 loaded!");

// --- Постоянный CSS для скрытия сайдбара и исправления отступа ---
const permanentCSS = `
  /* Полностью и навсегда скрываем сайдбар */
  .main-sidebar {
    display: none !important;
  }

  /* Принудительно убираем левый отступ у всех основных контейнеров */
  .content-wrapper,
  .main-header,
  .main-footer {
    margin-left: 0 !important;
  }
`;
const styleSheet = document.createElement("style");
styleSheet.innerText = permanentCSS;
document.head.appendChild(styleSheet);


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
    // console.log('Элемент "Длительность звонка" не найден на этой странице.');
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
            // console.log(`Элемент <option> с value="${value}" удален из select#${selectId}.`);
          }
        });
      }
    }
  }
}


// --- Вызовы функций ---

// Вызываем функции для модификации формы сразу после загрузки скрипта.
hideCallDurationElement();

// Определяем, какие опции и из каких селекторов нужно удалить.
const optionsToRemove = {
  'type_group': ['КДГ 1 ЛТП'], // Статическое удаление
  'type_id': ['333', '42', '400']  // Список для динамического удаления
};

// Вызываем удаление для статичных селектов, которые не меняются.
removeSpecificOptions({ 'type_group': optionsToRemove.type_group });

// Для динамически изменяемых списков, запускаем периодическую проверку.
setInterval(() => {
  removeSpecificOptions({ 'type_id': optionsToRemove.type_id });
}, 300); // Проверяем и удаляем каждые 300 миллисекунд.