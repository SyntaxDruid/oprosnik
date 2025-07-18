/**
 * form-modifier.js
 * Версия: 7.0
 *
 * Этот скрипт модифицирует элементы формы опросника:
 * - Скрывает ненужные поля
 * - Удаляет лишние опции из выпадающих списков
 * - Добавляет контекстные подсказки для каждого типа проблемы
 */
console.log('🚀 Oprosnik Helper: Form Modifier Script v7.0 Loaded.');

// ===========================
// КОНФИГУРАЦИЯ
// ===========================

// Конфигурация подсказок (загружается из JSON)
let hintsConfig = {
  hints: {
    type_id: {}
  },
  ui: {
    tooltip_styles: {
      hint_icon: {
        background_color: "#007bff",
        hover_color: "#0056b3",
        size: "20px"
      },
      comment_hint_icon: {
        background_color: "#1976d2",
        hover_color: "#1565c0",
        size: "20px"
      },
      tooltip_width: "320px",
      tooltip_background: "#333"
    }
  }
};

// Константы конфигурации
const CONFIG = {
  OPTIONS_TO_REMOVE: {
    type_group: ['КДГ 1 ЛТП'],
    type_id: ["9", "20", "22", "23", "27", "333", "334", "337", "354", "375", "388", "402", "404", "405", "35", "37", "41",
              "42", "43", "44", "46", "52", "53", "56", "338", "339", "340", "345", "346", "349", "353", "355", "356", "379", "381",
              "384", "394", "400", "401", "362", "369", "364", "365", "390", "370", "367", "67", "399", "398"]
  },
  INTERVALS: {
    OPTIONS_CLEANUP: 300,
    INITIAL_DELAY: 500
  }
};

// ===========================
// ФУНКЦИИ ЗАГРУЗКИ И ИНИЦИАЛИЗАЦИИ
// ===========================

/**
 * Загружает конфигурацию подсказок из JSON файла
 */
async function loadHintsConfig() {
  try {
    const response = await fetch(chrome.runtime.getURL('tips.json'));
    if (response.ok) {
      const tipsData = await response.json();
      // Конвертируем массив tips в объект подсказок
      hintsConfig.hints.type_id = {};
      tipsData.forEach(tip => {
        hintsConfig.hints.type_id[tip.id] = {
          hint1: tip.hints1,
          hint2: tip.hints2
        };
      });
      console.log('✅ Конфигурация подсказок загружена из tips.json');
    } else {
      console.warn('⚠️ Не удалось загрузить конфигурацию подсказок, используется встроенная');
    }
  } catch (error) {
    console.error('❌ Ошибка загрузки конфигурации подсказок:', error);
  }
}

/**
 * Генерирует стили для подсказок на основе конфигурации
 */
function generateTooltipStyles() {
  return `
    <style>
      /* Подсказка рядом с выпадающим списком */
      .oprosnik-hint-container {
        position: absolute;
        left: calc(100% + 15px);
        top: 50%;
        transform: translateY(-50%);
        z-index: 100;
      }
      
      .oprosnik-hint-display {
        background: linear-gradient(135deg, #e8f4fd 0%, #f3f9ff 100%);
        border: 1px solid #1976d2;
        border-radius: 8px;
        padding: 10px 14px;
        font-size: 13px;
        color: #0d47a1;
        line-height: 1.5;
        box-shadow: 0 3px 8px rgba(25, 118, 210, 0.15);
        width: 300px;
        white-space: normal;
        position: relative;
        font-weight: 500;
      }
      
      /* Стрелка для подсказки */
      .oprosnik-hint-display::before {
        content: '';
        position: absolute;
        left: -6px;
        top: 50%;
        transform: translateY(-50%);
        width: 0;
        height: 0;
        border-top: 6px solid transparent;
        border-bottom: 6px solid transparent;
        border-right: 6px solid #1976d2;
      }
      
      .oprosnik-hint-display::after {
        content: '';
        position: absolute;
        left: -5px;
        top: 50%;
        transform: translateY(-50%);
        width: 0;
        height: 0;
        border-top: 5px solid transparent;
        border-bottom: 5px solid transparent;
        border-right: 5px solid #e8f4fd;
      }
      
      /* Подсказки под полем комментария */
      .oprosnik-comment-hint {
        background: linear-gradient(135deg, #e3f2fd 0%, #f0f7ff 100%);
        border: 1px solid #1976d2;
        border-radius: 8px;
        padding: 12px 16px;
        margin-top: 12px;
        margin-bottom: 10px;
        font-size: 13px;
        color: #0d47a1;
        display: block;
        position: relative;
        box-shadow: 0 2px 8px rgba(25, 118, 210, 0.1);
        clear: both;
        max-width: 630px;
      }
      
      
      .oprosnik-comment-hint strong {
        font-weight: 600;
        color: #1565c0;
        display: inline-flex;
        align-items: center;
        margin-right: 6px;
      }
      
      /* Иконка информации */
      .oprosnik-comment-hint strong::before {
        content: 'i';
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 18px;
        height: 18px;
        background-color: #1976d2;
        color: white;
        border-radius: 50%;
        font-size: 12px;
        font-weight: bold;
        margin-right: 6px;
      }
      
      /* Стили для опций выпадающего списка */
      select#type_id option {
        height: auto !important;
        padding: 4px 8px !important;
        white-space: nowrap !important;
      }
      
      /* Агрессивные стили для увеличения высоты dropdown */
      
      /* Bootstrap Select dropdown - все возможные варианты */
      .bootstrap-select .dropdown-menu,
      .bootstrap-select .dropdown-menu.show,
      .bootstrap-select .dropdown-menu.inner,
      .bootstrap-select .dropdown-menu .inner {
        max-height: 500px !important;
        height: auto !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
      }
      
      /* Стандартный Bootstrap dropdown для select */
      .dropdown-menu,
      .dropdown-menu.show,
      select + .dropdown-menu,
      #type_id + .dropdown-menu {
        max-height: 500px !important;
        height: auto !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
      }
      
      /* Попытка через CSS переменные для Bootstrap 5 */
      select#type_id.custom-select {
        --bs-dropdown-max-height: 500px !important;
      }
      
      /* Более агрессивные стили для всех dropdown */
      [class*="dropdown"],
      [class*="select"],
      [class*="menu"] {
        max-height: 500px !important;
      }
      
      /* Дополнительные стили для кастомных select компонентов */
      .select2-results,
      .select2-results__options,
      .select2-dropdown,
      .select2-dropdown .select2-results {
        max-height: 500px !important;
        overflow-y: auto !important;
      }
      
      /* Для других популярных select библиотек */
      .chosen-results,
      .chosen-drop,
      .selectize-dropdown,
      .selectize-dropdown-content {
        max-height: 500px !important;
        overflow-y: auto !important;
      }
      
      /* Попытка перехватить любые элементы с определенными атрибутами */
      [role="listbox"],
      [role="menu"],
      [role="combobox"] + * {
        max-height: 500px !important;
        overflow-y: auto !important;
      }
      
      /* Кастомный класс для принудительного изменения высоты */
      .oprosnik-dropdown-enlarged {
        max-height: 500px !important;
        overflow-y: auto !important;
        height: auto !important;
        min-height: 100px !important;
      }
      
      /* Максимально агрессивный селектор для любых dropdown */
      .oprosnik-dropdown-enlarged,
      .oprosnik-dropdown-enlarged.dropdown-menu,
      .oprosnik-dropdown-enlarged.bootstrap-select,
      .oprosnik-dropdown-enlarged[class*="dropdown"],
      .oprosnik-dropdown-enlarged[class*="select"],
      .oprosnik-dropdown-enlarged[class*="menu"] {
        max-height: 500px !important;
        overflow-y: auto !important;
        height: auto !important;
        min-height: 100px !important;
      }
      
      /* Адаптивность для маленьких экранов */
      @media (max-width: 1200px) {
        .oprosnik-hint-container {
          position: static;
          transform: none;
          margin-top: 8px;
          margin-left: 0;
        }
        
        .oprosnik-hint-display {
          width: 100%;
        }
        
        .oprosnik-hint-display::before,
        .oprosnik-hint-display::after {
          display: none;
        }
      }
      
    </style>
  `;
}

/**
 * Инициализирует стили на странице
 */
function initializeStyles() {
  if (!document.getElementById('oprosnik-hint-styles')) {
    const styleElement = document.createElement('div');
    styleElement.id = 'oprosnik-hint-styles';
    styleElement.innerHTML = generateTooltipStyles();
    document.head.appendChild(styleElement);
    console.log('🎨 Стили подсказок добавлены');
  }
}

// ===========================
// ФУНКЦИИ МОДИФИКАЦИИ ФОРМЫ
// ===========================

/**
 * Скрывает контейнер с полем "Длительность звонка"
 */
function hideCallDurationElement() {
  const callDurationSelect = document.getElementById('call_duration_id');
  if (callDurationSelect) {
    const callDurationContainer = callDurationSelect.closest('.row');
    if (callDurationContainer) {
      callDurationContainer.style.display = 'none';
      console.log('✅ Элемент "Длительность звонка" скрыт');
    }
  }
}

/**
 * Удаляет указанные опции из выпадающих списков
 * @param {Object} selectors - Объект с id селекторов и массивами значений для удаления
 */
function removeSpecificOptions(selectors) {
  let removedCount = 0;
  
  for (const selectId in selectors) {
    if (Object.prototype.hasOwnProperty.call(selectors, selectId)) {
      const selectElement = document.getElementById(selectId);
      if (selectElement) {
        const valuesToRemove = selectors[selectId];
        valuesToRemove.forEach(value => {
          const optionToRemove = selectElement.querySelector(`option[value="${value}"]`);
          if (optionToRemove) {
            optionToRemove.remove();
            removedCount++;
          }
        });
      }
    }
  }
  
  if (removedCount > 0) {
    console.log(`🗑️ Удалено ${removedCount} опций`);
  }
}

// ===========================
// ФУНКЦИИ РАБОТЫ С ПОДСКАЗКАМИ
// ===========================

/**
 * Создает элемент подсказки
 * @param {string} hint - Текст подсказки
 * @returns {HTMLElement} - DOM элемент подсказки
 */
function createHintElement(hint) {
  const container = document.createElement('div');
  container.className = 'oprosnik-hint-container';
  container.innerHTML = `
    <div class="oprosnik-hint-display">${hint}</div>
  `;
  return container;
}



/**
 * Настраивает высоту dropdown списка для селекта type_id
 */
function configureSelectDropdown() {
  const typeIdSelect = document.getElementById('type_id');
  if (typeIdSelect) {
    console.log('🔧 Найден селект type_id:', typeIdSelect);
    console.log('🔧 Классы селекта:', typeIdSelect.className);
    console.log('🔧 Родительские элементы:', typeIdSelect.parentElement);
    
    // Проверяем все CSS библиотеки select на странице
    const bootstrapSelects = document.querySelectorAll('.bootstrap-select');
    const select2Elements = document.querySelectorAll('.select2-container');
    const chosenElements = document.querySelectorAll('.chosen-container');
    
    console.log('🔧 Bootstrap Select найдено:', bootstrapSelects.length);
    console.log('🔧 Select2 найдено:', select2Elements.length);
    console.log('🔧 Chosen найдено:', chosenElements.length);
    
    // Если это обернуто в Bootstrap Select
    if (typeIdSelect.closest('.bootstrap-select')) {
      console.log('🔧 Обнаружен Bootstrap Select');
      // Пробуем инициализировать с нужными параметрами
      if (typeof $ !== 'undefined' && $.fn.selectpicker) {
        $(typeIdSelect).selectpicker({
          size: 10,
          liveSearch: true,
          dropupAuto: false,
          windowPadding: 10
        });
        console.log('🔧 Bootstrap Select переинициализирован');
      }
    }
    
    // Только стили для реальных кастомных библиотек select
    const style = document.createElement('style');
    style.id = 'oprosnik-dropdown-height-fix';
    style.textContent = `
      /* Только для Bootstrap Select */
      .bootstrap-select .dropdown-menu {
        max-height: 400px !important;
        overflow-y: auto !important;
      }
      
      /* Только для Select2 */
      .select2-results {
        max-height: 400px !important;
        overflow-y: auto !important;
      }
      
      /* Только для Chosen */
      .chosen-results {
        max-height: 400px !important;
        overflow-y: auto !important;
      }
    `;
    document.head.appendChild(style);
    
    // Пробуем подход с multiple для показа всех опций
    console.log('🔧 Пробуем установить multiple для показа всех опций');
    typeIdSelect.setAttribute('multiple', 'multiple');
    typeIdSelect.setAttribute('size', '10');
    
    // Добавляем стили для select с multiple
    const multipleStyle = document.createElement('style');
    multipleStyle.textContent = `
      select#type_id[multiple] {
        height: auto !important;
        min-height: 300px !important;
        max-height: 500px !important;
        overflow-y: auto !important;
        width: 100% !important;
        font-size: 14px !important;
        border: 1px solid #ced4da !important;
        border-radius: 0.375rem !important;
        padding: 4px !important;
      }
      
      select#type_id[multiple] option {
        padding: 6px 8px !important;
        font-size: 14px !important;
        line-height: 1.2 !important;
      }
      
      select#type_id[multiple] option:hover {
        background-color: #007bff !important;
        color: white !important;
      }
      
      select#type_id[multiple] option:selected {
        background-color: #007bff !important;
        color: white !important;
      }
    `;
    document.head.appendChild(multipleStyle);
    
    // Добавляем обработчик для эмуляции single-select поведения
    typeIdSelect.addEventListener('change', function() {
      const selectedOptions = this.selectedOptions;
      if (selectedOptions.length > 1) {
        // Если выбрано больше одного элемента, оставляем только последний
        for (let i = 0; i < selectedOptions.length - 1; i++) {
          selectedOptions[i].selected = false;
        }
      }
    });
    
    console.log('✅ Установлен multiple с эмуляцией single-select');
  }
}

/**
 * Добавляет динамические подсказки для поля type_id
 */
function addTypeIdHint() {
  const typeIdSelect = document.getElementById('type_id');
  if (!typeIdSelect) {
    console.warn('⚠️ Элемент type_id не найден');
    return;
  }
  
  const typeIdContainer = typeIdSelect.closest('.input-group');
  if (!typeIdContainer) {
    console.warn('⚠️ Контейнер для type_id не найден');
    return;
  }
  
  // Делаем контейнер относительно позиционированным для абсолютных подсказок
  typeIdContainer.style.position = 'relative';
  
  // Добавляем обработчик изменения
  typeIdSelect.addEventListener('change', function() {
    const selectedValue = this.value;
    const hintData = hintsConfig.hints.type_id[selectedValue];
    
    // Находим существующую подсказку
    const existingHint = typeIdContainer.querySelector('.oprosnik-hint-container');
    
    if (existingHint) {
      existingHint.remove();
    }
    
    // Добавляем новую подсказку, если есть данные
    if (hintData && selectedValue !== '0') {
      const hintElement = createHintElement(hintData.hint1);
      typeIdContainer.appendChild(hintElement);
      
      // Обновляем подсказки в поле комментария
      updateCommentHints(hintData);
    } else {
      updateCommentHints(null);
    }
  });
  
  console.log('✅ Обработчик подсказок для type_id добавлен');
}

/**
 * Обновляет подсказки под полем комментария
 * @param {Object|null} hintData - Данные подсказок или null
 */
function updateCommentHints(hintData) {
  const commentTextarea = document.getElementById('comment_');
  if (!commentTextarea) return;
  
  // Удаляем старые подсказки
  removeAllCommentHints();
  
  if (hintData && hintData.hint2) {
    addCommentHint('oprosnik-comment-hint-1', hintData.hint2, 'Рекомендации:');
  }
}

/**
 * Добавляет подсказку под полем комментария
 * @param {string} id - ID элемента подсказки
 * @param {string} hintText - Текст подсказки
 * @param {string} label - Заголовок подсказки
 * @param {string} marginTop - Отступ сверху
 */
function addCommentHint(id, hintText, label) {
  const commentTextarea = document.getElementById('comment_');
  if (!commentTextarea) return;
  
  // Находим контейнер с textarea (.input-group.col-sm)
  const textareaContainer = commentTextarea.closest('.input-group');
  if (!textareaContainer) return;
  
  // Получаем ширину поля комментария
  const textareaWidth = commentTextarea.offsetWidth;
  
  // Создаем элемент подсказки
  const hintElement = document.createElement('div');
  hintElement.id = id;
  hintElement.className = 'oprosnik-comment-hint';
  hintElement.style.marginTop = '12px';
  hintElement.style.width = textareaWidth + 'px';
  hintElement.style.clear = 'both';
  hintElement.style.position = 'relative';
  hintElement.style.marginLeft = '0px';
  
  hintElement.innerHTML = `<strong>${label}</strong> ${hintText}`;
  
  // Добавляем сразу после контейнера textarea
  textareaContainer.insertAdjacentElement('afterend', hintElement);
}

/**
 * Удаляет все подсказки комментариев с анимацией
 */
function removeAllCommentHints() {
  const hints = document.querySelectorAll('.oprosnik-comment-hint');
  hints.forEach(hint => hint.remove());
}

// ===========================
// ГЛАВНАЯ ФУНКЦИЯ ИНИЦИАЛИЗАЦИИ
// ===========================


/**
 * Инициализирует все модификации формы
 */
async function initializeAll() {
  console.log('🔧 Начало инициализации модификаций формы...');
  
  try {
    // 1. Загружаем конфигурацию подсказок
    await loadHintsConfig();
    
    // 2. Инициализируем стили
    initializeStyles();
    
    // 3. Скрываем ненужные элементы формы
    hideCallDurationElement();
    
    // 4. Удаляем ненужные опции из type_group
    removeSpecificOptions({ 'type_group': CONFIG.OPTIONS_TO_REMOVE.type_group });
    
    // 5. Настраиваем размер dropdown для селекта
    setTimeout(configureSelectDropdown, CONFIG.INTERVALS.INITIAL_DELAY);
    
    // 6. Добавляем обработчик подсказок с задержкой
    setTimeout(addTypeIdHint, CONFIG.INTERVALS.INITIAL_DELAY);
    
    // 7. Устанавливаем интервал для периодической очистки опций type_id
    setInterval(() => {
      removeSpecificOptions({ 'type_id': CONFIG.OPTIONS_TO_REMOVE.type_id });
    }, CONFIG.INTERVALS.OPTIONS_CLEANUP);
    
    console.log('✅ Все модификации формы успешно применены!');
    
  } catch (error) {
    console.error('❌ Ошибка при инициализации:', error);
  }
}

// ===========================
// ЗАПУСК СКРИПТА
// ===========================

// Ждем загрузки DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeAll);
} else {
  // DOM уже загружен, запускаем сразу
  initializeAll();
}