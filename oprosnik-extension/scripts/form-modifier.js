/**
 * form-modifier.js
 * Версия: 4.2
 *
 * Этот скрипт отвечает только за модификацию элементов формы опросника.
 * Он скрывает ненужные поля и удаляет лишние опции из выпадающих списков.
 */
console.log('Oprosnik Helper: Form Modifier Script v4.2 Loaded.');

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
          }
        });
      }
    }
  }
}

// --- ЗАПУСК ЛОГИКИ ---

// 1. Скрываем ненужный элемент формы.
hideCallDurationElement();

// 2. Определяем, какие опции и из каких селекторов нужно удалить.
const optionsToRemove = {
  'type_group': ['КДГ 1 ЛТП'], // Для статичного списка
  'type_id': ['333', '42', '400']  // Для динамически обновляемого списка
};

// 3. Сразу удаляем опции из статичных списков.
removeSpecificOptions({ 'type_group': optionsToRemove.type_group });

// 4. Для динамически изменяемых списков, запускаем периодическую проверку.
setInterval(() => {
  removeSpecificOptions({ 'type_id': optionsToRemove.type_id });
}, 300); // Проверяем и удаляем каждые 300 миллисекунд.