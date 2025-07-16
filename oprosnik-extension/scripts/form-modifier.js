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
    'type_group': ['КДГ 1 ЛТП'],
    'type_id': [403, 334, 404, 405, 355, 373, 391, 388, 9, 375, 402, 337, 20, 21, 22, 24, 27, 338, 339, 340, 341, 371, 46, 342, 345,
                52, 53, 346, 33, 34, 35, 392, 37, 56, 349, 353, 44, 41, 381, 401, 356, 43, 378, 379, 382, 384, 394, 362, 369, 364, 365, 390, 370, 367, 399, 398, 67, 333, 335, 400]
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
    const response = await fetch(chrome.runtime.getURL('hints-config.json'));
    if (response.ok) {
      hintsConfig = await response.json();
      console.log('✅ Конфигурация подсказок загружена из JSON');
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
  const config = hintsConfig.ui.tooltip_styles;
  return `
    <style>
      /* Анимации */
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateX(-10px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      
      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(5px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      /* Подсказка рядом с выпадающим списком */
      .oprosnik-hint-container {
        position: absolute;
        left: calc(100% + 15px);
        top: 50%;
        transform: translateY(-50%);
        z-index: 100;
        animation: slideIn 0.3s ease-out;
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
        max-width: 350px;
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
        border-radius: 10px;
        padding: 14px 18px;
        margin-top: 12px;
        font-size: 13px;
        color: #0d47a1;
        display: block;
        position: relative;
        box-shadow: 0 4px 12px rgba(25, 118, 210, 0.12);
        animation: fadeIn 0.3s ease-out;
        transition: all 0.2s ease;
      }
      
      .oprosnik-comment-hint:hover {
        box-shadow: 0 6px 16px rgba(25, 118, 210, 0.18);
        transform: translateY(-1px);
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
        content: 'ℹ';
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 18px;
        height: 18px;
        background-color: #1976d2;
        color: white;
        border-radius: 50%;
        font-size: 12px;
        font-weight: normal;
        margin-right: 6px;
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
          max-width: 100%;
        }
        
        .oprosnik-hint-display::before,
        .oprosnik-hint-display::after {
          display: none;
        }
      }
      
      /* Плавная анимация при изменении подсказок */
      .oprosnik-hint-container.fade-out {
        animation: fadeOut 0.2s ease-out forwards;
      }
      
      @keyframes fadeOut {
        to {
          opacity: 0;
          transform: translateX(-5px);
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
      // Добавляем класс для анимации исчезновения
      existingHint.classList.add('fade-out');
      setTimeout(() => existingHint.remove(), 200);
    }
    
    // Добавляем новую подсказку, если есть данные
    if (hintData && selectedValue !== '0') {
      setTimeout(() => {
        const hintElement = createHintElement(hintData.hint1);
        typeIdContainer.appendChild(hintElement);
      }, existingHint ? 250 : 0);
      
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
  
  // Удаляем старые подсказки с анимацией
  removeAllCommentHints();
  
  if (hintData && hintData.hint2) {
    // Добавляем новую подсказку с небольшой задержкой для анимации
    setTimeout(() => {
      addCommentHint('oprosnik-comment-hint-1', hintData.hint2, 'Рекомендации:', '8px');
    }, 100);
  }
}

/**
 * Добавляет подсказку под полем комментария
 * @param {string} id - ID элемента подсказки
 * @param {string} hintText - Текст подсказки
 * @param {string} label - Заголовок подсказки
 * @param {string} marginTop - Отступ сверху
 */
function addCommentHint(id, hintText, label, marginTop) {
  const commentTextarea = document.getElementById('comment_');
  if (!commentTextarea) return;
  
  // Находим родительский контейнер textarea
  const textareaContainer = commentTextarea.closest('.row');
  if (!textareaContainer) return;
  
  // Создаем элемент подсказки
  const hintElement = document.createElement('div');
  hintElement.id = id;
  hintElement.className = 'oprosnik-comment-hint';
  hintElement.style.marginTop = marginTop;
  hintElement.style.width = '100%';
  
  hintElement.innerHTML = `<strong>${label}</strong> ${hintText}`;
  
  // Добавляем после textarea
  textareaContainer.parentNode.insertBefore(hintElement, textareaContainer.nextSibling);
}

/**
 * Удаляет все подсказки комментариев с анимацией
 */
function removeAllCommentHints() {
  const hints = document.querySelectorAll('.oprosnik-comment-hint');
  hints.forEach(hint => {
    hint.style.opacity = '0';
    hint.style.transform = 'translateY(-5px)';
    setTimeout(() => hint.remove(), 200);
  });
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
    
    // 5. Добавляем обработчик подсказок с задержкой
    setTimeout(addTypeIdHint, CONFIG.INTERVALS.INITIAL_DELAY);
    
    // 6. Устанавливаем интервал для периодической очистки опций type_id
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