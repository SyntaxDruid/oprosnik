/**
 * filler.js
 * Работает на странице опросника.
 * 1. Добавляет кнопку "Вставить данные о звонке".
 * 2. По клику на кнопку инициирует процесс получения данных.
 * 3. Получив данные, форматирует их и вставляет в поле "Комментарий".
 */

console.log('Oprosnik Helper: Filler Script Injected.');

/**
 * Главная функция, которая создает и настраивает кнопку.
 */
function createPasteButton() {
  // Находим элемент, после которого мы вставим нашу кнопку.
  // В данном случае, это кнопка "Ответить".
  const targetButton = document.getElementById('create_inst');
  if (!targetButton) {
    console.error('Filler: Не найдена кнопка "Ответить" для размещения новой кнопки.');
    return;
  }

  // Создаем нашу новую кнопку
  const pasteButton = document.createElement('button');
  pasteButton.innerText = 'Вставить данные о звонке';
  pasteButton.type = 'button'; // Важно, чтобы не отправлять форму
  pasteButton.className = 'btn btn-success ml-2 oprosnik-helper-btn'; // Используем классы страницы + свой

  // Добавляем обработчик клика
  pasteButton.addEventListener('click', handlePasteButtonClick);

  // Вставляем нашу кнопку на страницу после целевой кнопки
  targetButton.insertAdjacentElement('afterend', pasteButton);
  console.log('Filler: Кнопка "Вставить данные о звонке" успешно добавлена.');
}

/**
 * Обработчик нажатия на нашу кнопку.
 */
function handlePasteButtonClick() {
  console.log('Filler: Кнопка нажата. Отправляю запрос на получение данных...');
  
  // Показываем пользователю, что идет процесс
  const button = document.querySelector('.oprosnik-helper-btn');
  button.innerText = 'Получение данных...';
  button.disabled = true;

  // Отправляем сообщение в background.js с запросом данных
  chrome.runtime.sendMessage({ action: 'getCallData' }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Filler: Ошибка связи с background.js:', chrome.runtime.lastError.message);
      alert('Ошибка: Не удалось связаться с расширением. Попробуйте перезагрузить страницу.');
      resetButtonState(button);
      return;
    }

    if (response && response.status === 'success') {
      console.log('Filler: Данные успешно получены:', response.data);
      pasteDataIntoComment(response.data);
      button.innerText = 'Данные вставлены!';
      // Возвращаем кнопку в исходное состояние через 2 секунды
      setTimeout(() => resetButtonState(button), 2000);

    } else {
      // Если произошла ошибка (например, вкладка-источник не найдена)
      console.error('Filler: Ошибка при получении данных:', response.message);
      alert(`Ошибка: ${response.message}`);
      resetButtonState(button);
    }
  });
}

/**
 * Вставляет полученные данные в поле "Комментарий".
 * @param {object} callData - Объект с данными о звонке.
 */
function pasteDataIntoComment(callData) {
  const commentTextarea = document.getElementById('comment_');
  if (!commentTextarea) {
    console.error('Filler: Не найдено поле для комментария (#comment_).');
    return;
  }

  // Форматируем данные в красивую строку для вставки
  const formattedData = `
--------------------------------
Данные о последнем звонке:
- Номер телефона: ${callData.phone}
- Длительность: ${callData.duration}
- Регион: ${callData.region}
- Время фиксации: ${callData.capturedAt}
--------------------------------
  `;

  // Вставляем отформатированные данные в начало комментария,
  // не затирая то, что пользователь мог уже ввести.
  commentTextarea.value = formattedData.trim() + '\n\n' + commentTextarea.value;
}

/**
 * Возвращает кнопку в исходное состояние.
 * @param {Element} button - Элемент кнопки.
 */
function resetButtonState(button) {
    if (button) {
        button.innerText = 'Вставить данные о звонке';
        button.disabled = false;
    }
}


// --- ЗАПУСК ---
// Ждем, пока страница полностью загрузится, и только потом добавляем кнопку.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createPasteButton);
} else {
  createPasteButton();
}