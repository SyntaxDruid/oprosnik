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
  403: "Опишите конкретную проблему с настройкой порта/номера IMS/vIMS/SIP. Укажите номер договора",
  334: "Укажите причину отключения Redirect и предпринятые действия",
  404: "Детализируйте причину замены наложенной АСРЗ (Москва)",
  405: "Опишите другие проблемы АСРЗ (Москва)",
  12: "Предоставьте подробную консультацию, укажите тему вопроса",
  335: "Опишите проблему, не входящую в стандартные категории",
  13: "Укажите модель заменяемого CPE и причину замены",
  14: "Укажите старый и новый MAC-адрес STB",
  15: "Укажите старый и новый логин PPPoE",
  373: "Опишите массовую проблему с ИС (ACS, SDP, АСР и т.д.)",
  391: "Укажите код, оферту и контакт для Мультискрин Wink",
  336: "Укажите номер LAN-порта и услугу",
  388: "Опишите параметры настройки Wi-Fi через ACS",
  16: "Укажите тип порта (PON/FTTb/ADSL) и выполненные настройки",
  17: "Опишите симптомы неработающей услуги и результаты диагностики",
  9: "Укажите версию прошивки и результат обновления",
  19: "Объясните, почему не была предпринята попытка через ЕЦМ/АРМ-ПМ",
  375: "Укажите номер заявки в HELPME/JIRA",
  402: "Укажите причину перезагрузки КД",
  337: "Укажите старый и новый порт",
  354: "Укажите данные присоединенного оператора",
  20: "Результаты проверки настроек на порту",
  21: "Параметры линии, если ЕПД не отображает данные",
  22: "Параметры линии из ЕПД",
  24: "Укажите просмотренные логин/пароль для услуг",
  23: "Результат проверки наличия сессии",
  374: "Какие ошибки были сброшены на порту",
  27: "Старый и новый профиль АДСЛ (ЕПД)",
  28: "Старый и новый профиль АДСЛ (ручная настройка)",
  29: "Какие технические данные были уточнены",
  
  // Инсталляция
  338: "Опишите проблему с отображением затухания и PLOAM на Eltex OLT",
  339: "Укажите серийный номер для привязки ONT на Huawei OLT",
  340: "Детали создания профиля IMS на SPG",
  341: "Параметры ручной настройки vIMS",
  49: "Предоставьте подробную консультацию по инсталляции",
  371: "Результат восстановления через ACS",
  46: "Опишите доп.работы/демонтаж (подвинуть, изменить ВВ, аннулировать)",
  342: "Опишите другую проблему инсталляции",
  400: "Укажите номер и причину бронирования SIM карты",
  51: "Модель CPE и выполненные настройки",
  343: "Старый и новый MAC-адрес STB",
  376: "Старый и новый логин PPPoE",
  345: "Технические данные подключения ADSL",
  52: "Технические данные подключения FTTb",
  53: "Технические данные подключения FTTh",
  346: "Номера исключенных нарядов из HPSA",
  33: "Опишите массовую проблему HPSA",
  34: "Опишите массовую проблему с ИС",
  35: "Параметры настройки мультирум",
  392: "Данные для Мультискрин Wink от SAN",
  36: "Номер LAN-порта и услуга",
  37: "Параметры Wi-Fi через ACS",
  55: "Тип порта и настройки",
  56: "Причина некорректного создания наряда",
  57: "Опишите некорректные действия Инсталлятора",
  62: "Опишите некорректные действия НПП",
  349: "Подтвердите отключение ONT на 2 минуты",
  38: "Результаты диагностики неисправности",
  353: "Какой логин не создан (Интернет или ТВ)",
  44: "Версия прошивки и результат",
  377: "Почему инсталлятор не активировал через приложение",
  372: "Описание ошибки HPSA",
  41: "Какая ошибка в наряде",
  381: "Номер заявки в HELPME/JIRA",
  42: "Детали переключения/переезда",
  401: "Данные привязки оборудования к л/с клиента",
  356: "Результат принудительной активации HPSA",
  355: "Данные присоединенного оператора",
  43: "Результаты проверки настроек",
  378: "Параметры линии (ЕПД не отображает)",
  379: "Параметры линии из ЕПД",
  382: "Просмотренные логин/пароль",
  384: "Выполненные работы в ЕЛК",
  380: "Какие ошибки сброшены",
  394: "Установлен чек бокс 'Подключена/продемонстрирована'",
  383: "Уточненные тех. данные/порт",
  
  // КДГ 1 ЛТП
  359: "Опишите проблему с КТВ/ЦТВ",
  360: "Опишите проблему с Радио",
  361: "Время, когда специалист 3 ЛТП не вышел на связь",
  
  // КДГ 3 ЛТП
  389: "Какой признак NRFS создан/снят",
  406: "Результат дозвона до клиента по просьбе 3 ЛТП",
  362: "Тип закрытого наряда (ЛН/ВН/СН) и новый наряд",
  363: "Номер закрытого наряда",
  369: "На кого назначен наряд (ФИО исполнителя 3 ЛТП)",
  364: "Номер наряда, переданного на 1-ТП",
  365: "Номер наряда, переданного на 2-ТП",
  390: "На какой участок переназначен наряд",
  370: "ФИО нового исполнителя 3 ЛТП",
  366: "Старое и новое время визита",
  386: "Номер КИ и ГП (СИ)",
  367: "Данные привязки оборудования",
  385: "Номер созданного ГП (СИ)",
  368: "Уточненные условия договора по оборудованию",
  
  // КЛЮЧ
  397: "Видеонаблюдение: результаты диагностики",
  396: "Домофон: результаты диагностики",
  395: "Домофон: выполненные настройки по запросу ВС",
  399: "СКУД: результаты диагностики",
  398: "Телеметрия: результаты диагностики",
  
  // Разное
  63: "Опишите личную просьбу",
  67: "Опишите нерешенную проблему",
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
      vertical-align: middle;
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
    }
    
    .oprosnik-hint-icon:hover {
      background-color: #0056b3;
      transform: scale(1.1);
    }
    
    .oprosnik-hint-tooltip {
      position: absolute;
      left: 30px;
      top: 50%;
      transform: translateY(-50%);
      background-color: #333;
      color: white;
      padding: 10px 15px;
      border-radius: 6px;
      font-size: 13px;
      line-height: 1.4;
      width: 300px;
      z-index: 1000;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s ease;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
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
    }
    
    .oprosnik-comment-hint {
      background-color: #e3f2fd;
      border: 1px solid #1976d2;
      border-radius: 4px;
      padding: 10px;
      margin-top: 5px;
      font-size: 13px;
      color: #0d47a1;
      display: none;
    }
    
    .oprosnik-comment-hint strong {
      font-weight: 600;
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
  
  if (hint) {
    hintElement.innerHTML = `<strong>Подсказка:</strong> ${hint}`;
    hintElement.style.display = 'block';
  } else {
    hintElement.style.display = 'none';
  }
}

// --- ЗАПУСК ЛОГИКИ ---

// Определяем, какие опции и из каких селекторов нужно удалить
const optionsToRemove = {
  'type_group': ['КДГ 1 ЛТП'], // Для статичного списка
  'type_id': [403, 334, 404, 405, 355, 373, 391, 388, 9, 375, 402, 337, 20, 21, 22, 24, 27, 29, 338, 339, 340, 341, 371, 46, 342, 345, 52, 53, 346, 
              33, 34, 35, 392, 37, 56, 349, 353, 44, 41, 381, 401, 356, 43, 378, 379, 382, 384, 394, 362, 369, 364, 365, 390, 370, 367, 399, 398, 67]
};

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
  
  // 3. Сразу удаляем опции из статичных списков
  removeSpecificOptions({ 'type_group': optionsToRemove.type_group });
  
  // 4. Добавляем функционал подсказок
  setTimeout(addTypeIdHint, 500); // Небольшая задержка для гарантии загрузки списка
  
  // 5. Для динамически изменяемых списков, запускаем периодическую проверку
  setInterval(() => {
    removeSpecificOptions({ 'type_id': optionsToRemove.type_id });
  }, 300);
  
  console.log('Oprosnik Helper: Все модификации применены успешно.');
}