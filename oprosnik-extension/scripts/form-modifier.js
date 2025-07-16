/**
 * form-modifier.js
 * Версия: 6.0
 *
 * Этот скрипт модифицирует элементы формы опросника:
 * - Скрывает ненужные поля
 * - Удаляет лишние опции из выпадающих списков
 * - Добавляет контекстные подсказки для каждого типа проблемы
 */
console.log('Oprosnik Helper: Form Modifier Script v6.0 Loaded.');

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

// Функция загрузки конфигурации подсказок
async function loadHintsConfig() {
  try {
    const response = await fetch(chrome.runtime.getURL('hints-config.json'));
    if (response.ok) {
      hintsConfig = await response.json();
      console.log('📋 Конфигурация подсказок загружена из JSON');
    } else {
      console.warn('⚠️ Не удалось загрузить конфигурацию подсказок, используется встроенная');
    }
  } catch (error) {
    console.error('❌ Ошибка загрузки конфигурации подсказок:', error);
  }
}

// Генерация стилей на основе конфигурации
function generateTooltipStyles() {
  const config = hintsConfig.ui.tooltip_styles;
  return `
  <style>
    .oprosnik-hint-container {
      position: relative;
      display: inline-block;
      margin-left: 10px;
      vertical-align: top;
    }
    
    .oprosnik-hint-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: ${config.hint_icon.size};
      height: ${config.hint_icon.size};
      background-color: ${config.hint_icon.background_color};
      color: white;
      border-radius: 50%;
      cursor: help;
      font-size: 12px;
      font-weight: bold;
      transition: all 0.3s ease;
      border: none;
      outline: none;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .oprosnik-hint-icon:hover {
      background-color: ${config.hint_icon.hover_color};
      transform: scale(1.1);
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    }
    
    .oprosnik-hint-tooltip {
      position: absolute;
      left: 30px;
      top: 50%;
      transform: translateY(-50%);
      background-color: ${config.tooltip_background};
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 13px;
      line-height: 1.4;
      width: ${config.tooltip_width};
      z-index: 1000;
      opacity: 0;
      pointer-events: none;
      transition: all 0.3s ease;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    }
    
    .oprosnik-hint-tooltip::before {
      content: '';
      position: absolute;
      left: -8px;
      top: 50%;
      transform: translateY(-50%);
      border: 8px solid transparent;
      border-right-color: ${config.tooltip_background};
    }
    
    .oprosnik-hint-container:hover .oprosnik-hint-tooltip {
      opacity: 1;
      transform: translateY(-50%) translateX(5px);
    }
    
    .oprosnik-comment-hint {
      background-color: #e3f2fd;
      border: 1px solid #1976d2;
      border-radius: 8px;
      padding: 12px 16px;
      margin-top: 8px;
      font-size: 13px;
      color: #0d47a1;
      display: none;
      position: relative;
      box-shadow: 0 2px 8px rgba(25,118,210,0.1);
    }
    
    .oprosnik-comment-hint::before {
      content: '';
      position: absolute;
      left: 16px;
      top: -8px;
      border: 8px solid transparent;
      border-bottom-color: #1976d2;
    }
    
    .oprosnik-comment-hint strong {
      font-weight: 600;
      color: #1976d2;
    }
    
    .oprosnik-comment-hint-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: ${config.comment_hint_icon.size};
      height: ${config.comment_hint_icon.size};
      background-color: ${config.comment_hint_icon.background_color};
      color: white;
      border-radius: 50%;
      cursor: help;
      font-size: 12px;
      font-weight: bold;
      transition: all 0.3s ease;
      border: none;
      outline: none;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      margin-right: 10px;
      margin-top: 8px;
      position: relative;
    }
    
    .oprosnik-comment-hint-icon:hover {
      background-color: ${config.comment_hint_icon.hover_color};
      transform: scale(1.1);
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    }
    
    .oprosnik-comment-hint-tooltip {
      position: absolute;
      left: 30px;
      top: 50%;
      transform: translateY(-50%);
      background-color: ${config.tooltip_background};
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 13px;
      line-height: 1.4;
      width: ${config.tooltip_width};
      z-index: 1000;
      opacity: 0;
      pointer-events: none;
      transition: all 0.3s ease;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      white-space: nowrap;
    }
    
    .oprosnik-comment-hint-tooltip::before {
      content: '';
      position: absolute;
      left: -8px;
      top: 50%;
      transform: translateY(-50%);
      border: 8px solid transparent;
      border-right-color: ${config.tooltip_background};
    }
    
    .oprosnik-comment-hint-icon:hover .oprosnik-comment-hint-tooltip {
      opacity: 1;
      transform: translateY(-50%) translateX(5px);
    }
  </style>
  `;
}

/**
 * Инициализация: добавляем стили на страницу
 */
function initializeStyles() {
  if (!document.getElementById('oprosnik-hint-styles')) {
    const styleElement = document.createElement('div');
    styleElement.id = 'oprosnik-hint-styles';
    styleElement.innerHTML = generateTooltipStyles();
    document.head.appendChild(styleElement);
  }
}

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
  }
}

/**
 * УНИВЕРСАЛЬНАЯ ФУНКЦИЯ
 * Находит и удаляет несколько элементов <option> из разных выпадающих списков.
 */
// Константы конфигурации
const CONFIG = {
  OPTIONS_TO_REMOVE: {
    'type_group': ['КДГ 1 ЛТП'],
    'type_id': [403, 334, 404, 405, 355, 373, 391, 388, 9, 375, 402, 337, 20, 21, 22, 24, 27, 338, 339, 340, 341, 371, 46, 342, 345,
                52, 53, 346, 33, 34, 35, 392, 37, 56, 349, 353, 44, 41, 381, 401, 356, 43, 378, 379, 382, 384, 394, 362, 369, 364, 365, 390, 370, 367, 399, 398, 67, 333, 335, 400]
  },
  INTERVALS: {
    OPTIONS_CLEANUP: 300
  }
};

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
          }
        });
      }
    }
  }
}

/**
 * Создает элемент подсказки
 */
function createHintElement(hint) {
  const container = document.createElement('div');
  container.className = 'oprosnik-hint-container';
  container.innerHTML = `
    <div class="oprosnik-hint-icon">?</div>
    <div class="oprosnik-hint-tooltip">${hint}</div>
  `;
  return container;
}

/**
 * Добавляет подсказку рядом с выпадающим списком type_id
 */
function addTypeIdHint() {
  const typeIdSelect = document.getElementById('type_id');
  if (!typeIdSelect) return;
  
  const typeIdContainer = typeIdSelect.closest('.input-group');
  if (!typeIdContainer) return;
  
  // Удаляем старую подсказку, если есть
  const oldHint = typeIdContainer.querySelector('.oprosnik-hint-container');
  if (oldHint) {
    oldHint.remove();
  }
  
  // Добавляем обработчик изменения
  typeIdSelect.addEventListener('change', function() {
    const selectedValue = this.value;
    const hintData = hintsConfig.hints.type_id[selectedValue];
    
    // Удаляем старую подсказку
    const existingHint = typeIdContainer.querySelector('.oprosnik-hint-container');
    if (existingHint) {
      existingHint.remove();
    }
    
    // Добавляем новую подсказку, если есть
    if (hintData && selectedValue != 0) {
      const hintElement = createHintElement(hintData.hint1);
      typeIdSelect.parentNode.appendChild(hintElement);
      
      // Также обновляем подсказки в поле комментария
      updateCommentHints(hintData);
    } else {
      updateCommentHints(null);
    }
  });
}

/**
 * Создает элемент подсказки для комментариев
 */
function createCommentHintIcon(hint) {
  const container = document.createElement('div');
  container.className = 'oprosnik-hint-container';
  container.innerHTML = `
    <div class="oprosnik-comment-hint-icon">
      ?
      <div class="oprosnik-comment-hint-tooltip">${hint}</div>
    </div>
  `;
  return container;
}

/**
 * Обновляет подсказки под полем комментария
 */
function updateCommentHints(hintData) {
  const commentTextarea = document.getElementById('comment_');
  if (!commentTextarea) return;
  
  const commentContainer = commentTextarea.closest('.row');
  if (!commentContainer) return;
  
  // Удаляем старые подсказки
  removeAllCommentHints();
  
  if (hintData && hintData.hint1 && hintData.hint2) {
    // Первая подсказка
    addCommentHint('oprosnik-comment-hint-1', hintData.hint1, 'Основная информация:', '8px');
    
    // Вторая подсказка
    addCommentHint('oprosnik-comment-hint-2', hintData.hint2, 'Дополнительные детали:', '16px');
  }
}

/**
 * Добавляет подсказку под полем комментария
 */
function addCommentHint(id, hintText, label, marginTop) {
  const commentTextarea = document.getElementById('comment_');
  if (!commentTextarea) return;
  
  const commentContainer = commentTextarea.closest('.row');
  if (!commentContainer) return;
  
  const hintElement = document.createElement('div');
  hintElement.id = id;
  hintElement.className = 'oprosnik-comment-hint';
  hintElement.style.marginTop = marginTop;
  
  hintElement.innerHTML = `<strong>${label}</strong> ${hintText}`;
  
  // Добавляем иконку подсказки
  const hintIcon = createCommentHintIcon(hintText);
  hintElement.appendChild(hintIcon);
  
  commentContainer.appendChild(hintElement);
  hintElement.style.display = 'block';
}

/**
 * Удаляет все подсказки комментариев
 */
function removeAllCommentHints() {
  const hint1 = document.getElementById('oprosnik-comment-hint-1');
  const hint2 = document.getElementById('oprosnik-comment-hint-2');
  
  if (hint1) hint1.remove();
  if (hint2) hint2.remove();
  
  // Удаляем старые иконки подсказок
  const commentContainer = document.getElementById('comment_')?.closest('.row');
  if (commentContainer) {
    const oldIcons = commentContainer.querySelectorAll('.oprosnik-comment-hint-icon');
    oldIcons.forEach(icon => {
      if (icon.parentElement) {
        icon.parentElement.remove();
      }
    });
  }
}

// --- ЗАПУСК ЛОГИКИ ---

// Ждем загрузки DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeAll);
} else {
  initializeAll();
}

async function initializeAll() {
  // 1. Загружаем конфигурацию подсказок
  await loadHintsConfig();
  
  // 2. Инициализируем стили
  initializeStyles();
  
  // 3. Скрываем ненужный элемент формы
  hideCallDurationElement();
  
  removeSpecificOptions({ 'type_group': CONFIG.OPTIONS_TO_REMOVE.type_group });
  setTimeout(addTypeIdHint, 500);
  
  setInterval(() => {
    removeSpecificOptions({ 'type_id': CONFIG.OPTIONS_TO_REMOVE.type_id });
  }, CONFIG.INTERVALS.OPTIONS_CLEANUP);
}