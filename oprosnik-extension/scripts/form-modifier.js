/**
 * form-modifier.js
 * Версия: 5.0
 *
 * Этот скрипт модифицирует элементы формы опросника:
 * - Скрывает ненужные поля
 * - Удаляет лишние опции из выпадающих списков
 * - Добавляет контекстные подсказки для каждого типа проблемы
 */
console.log('Oprosnik Helper: Form Modifier Script v5.0 Loaded.');

// Конфигурация подсказок для каждого type_id
const TYPE_HINTS = {
  // 3ЛТП
  333: "Укажите точные технические данные клиента и какие именно настройки не соответствуют",
  12: "Предоставьте подробную консультацию, укажите тему вопроса",
  335: "Опишите проблему, не входящую в стандартные категории",
  13: "Укажите модель заменяемого CPE и причину замены",
  14: "Укажите старый и новый MAC-адрес STB",
  15: "Укажите старый и новый логин PPPoE",
  336: "Укажите номер LAN-порта и услугу",
  16: "Укажите тип порта (PON/FTTb/ADSL) и выполненные настройки",
  17: "Опишите симптомы неработающей услуги и результаты диагностики",
  19: "Объясните, почему не была предпринята попытка через ЕЦМ/АРМ-ПМ",
  354: "Укажите данные присоединенного оператора",
  23: "Результат проверки наличия сессии",
  374: "Какие ошибки были сброшены на порту",
  28: "Старый и новый профиль АДСЛ (ручная настройка)",
  
  // Инсталляция
  49: "Предоставьте подробную консультацию по инсталляции",
  400: "Укажите номер и причину бронирования SIM карты",
  51: "Модель CPE и выполненные настройки",
  343: "Старый и новый MAC-адрес STB",
  376: "Старый и новый логин PPPoE",
  55: "Тип порта и настройки",
  57: "Опишите некорректные действия Инсталлятора",
  62: "Опишите некорректные действия НПП",
  38: "Результаты диагностики неисправности",
  377: "Почему инсталлятор не активировал через приложение",
  372: "Описание ошибки HPSA",
  42: "Детали переключения/переезда",
  380: "Какие ошибки сброшены",
  383: "Уточненные тех. данные/порт",
  
  // КДГ 1 ЛТП
  359: "Опишите проблему с КТВ/ЦТВ",
  360: "Опишите проблему с Радио",
  361: "Время, когда специалист 3 ЛТП не вышел на связь",
  
  // КДГ 3 ЛТП
  389: "Какой признак NRFS создан/снят",
  406: "Результат дозвона до клиента по просьбе 3 ЛТП",
  363: "Номер закрытого наряда",
  366: "Старое и новое время визита",
  386: "Номер КИ и ГП (СИ)",
  385: "Номер созданного ГП (СИ)",
  368: "Уточненные условия договора по оборудованию",
  
  // КЛЮЧ
  397: "Видеонаблюдение: результаты диагностики",
  396: "Домофон: результаты диагностики",
  395: "Домофон: выполненные настройки по запросу ВС",
  
  // Разное
  63: "Опишите личную просьбу",
  64: "Укажите правильный номер",
  393: "Подтвердите, что проблема решена",
  387: "Причина сброса звонка"
};

// Стили для подсказок
const TOOLTIP_STYLES = `
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
      width: 20px;
      height: 20px;
      background-color: #007bff;
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
      background-color: #0056b3;
      transform: scale(1.1);
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    }
    
    .oprosnik-hint-tooltip {
      position: absolute;
      left: 30px;
      top: 50%;
      transform: translateY(-50%);
      background-color: #333;
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 13px;
      line-height: 1.4;
      width: 320px;
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
      border-right-color: #333;
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
      width: 20px;
      height: 20px;
      background-color: #1976d2;
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
      background-color: #1565c0;
      transform: scale(1.1);
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    }
    
    .oprosnik-comment-hint-tooltip {
      position: absolute;
      left: 30px;
      top: 50%;
      transform: translateY(-50%);
      background-color: #333;
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 13px;
      line-height: 1.4;
      width: 320px;
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
      border-right-color: #333;
    }
    
    .oprosnik-comment-hint-icon:hover .oprosnik-comment-hint-tooltip {
      opacity: 1;
      transform: translateY(-50%) translateX(5px);
    }
  </style>
`;

/**
 * Инициализация: добавляем стили на страницу
 */
function initializeStyles() {
  if (!document.getElementById('oprosnik-hint-styles')) {
    const styleElement = document.createElement('div');
    styleElement.id = 'oprosnik-hint-styles';
    styleElement.innerHTML = TOOLTIP_STYLES;
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
    'type_id': [403, 334, 404, 405, 355, 373, 391, 388, 9, 375, 402, 337, 20, 21, 22, 24, 27, 29, 338, 339, 340, 341, 371, 46, 342, 345, 52, 53, 346, 33, 34,
                35, 392, 37, 56, 349, 353, 44, 41, 381, 401, 356, 43, 378, 379, 382, 384, 394, 362, 369, 364, 365, 390, 370, 367, 399, 398, 67, 333, 335, 400]
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
    const hint = TYPE_HINTS[selectedValue];
    
    // Удаляем старую подсказку
    const existingHint = typeIdContainer.querySelector('.oprosnik-hint-container');
    if (existingHint) {
      existingHint.remove();
    }
    
    // Добавляем новую подсказку, если есть
    if (hint && selectedValue != 0) {
      const hintElement = createHintElement(hint);
      typeIdSelect.parentNode.appendChild(hintElement);
      
      // Также обновляем подсказку в поле комментария
      updateCommentHint(hint);
    } else {
      updateCommentHint(null);
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
 * Обновляет подсказку под полем комментария
 */
function updateCommentHint(hint) {
  const commentTextarea = document.getElementById('comment_');
  if (!commentTextarea) return;
  
  const commentContainer = commentTextarea.closest('.row');
  if (!commentContainer) return;
  
  // Находим или создаем элемент подсказки
  let hintElement = document.getElementById('oprosnik-comment-hint');
  if (!hintElement) {
    hintElement = document.createElement('div');
    hintElement.id = 'oprosnik-comment-hint';
    hintElement.className = 'oprosnik-comment-hint';
    commentContainer.appendChild(hintElement);
  }
  
  // Удаляем старую иконку подсказки
  const oldIcon = commentContainer.querySelector('.oprosnik-comment-hint-icon');
  if (oldIcon) {
    oldIcon.parentElement.remove();
  }
  
  if (hint) {
    hintElement.innerHTML = `<strong>Подсказка:</strong> ${hint}`;
    hintElement.style.display = 'block';
    
    // Добавляем иконку подсказки
    const hintIcon = createCommentHintIcon(hint);
    hintElement.appendChild(hintIcon);
  } else {
    hintElement.style.display = 'none';
  }
}

// --- ЗАПУСК ЛОГИКИ ---


// Ждем загрузки DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeAll);
} else {
  initializeAll();
}

function initializeAll() {
  // 1. Инициализируем стили
  initializeStyles();
  
  // 2. Скрываем ненужный элемент формы
  hideCallDurationElement();
  
  removeSpecificOptions({ 'type_group': CONFIG.OPTIONS_TO_REMOVE.type_group });
  setTimeout(addTypeIdHint, 500);
  
  setInterval(() => {
    removeSpecificOptions({ 'type_id': CONFIG.OPTIONS_TO_REMOVE.type_id });
  }, CONFIG.INTERVALS.OPTIONS_CLEANUP);

}