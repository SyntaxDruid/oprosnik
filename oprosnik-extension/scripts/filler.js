/**
 * filler.js - Версия: 2.4
 * Работает на странице опросника
 * Позволяет выбрать данные из последних звонков
 * Улучшенные стили Bootstrap и надежность размещения кнопки
 */

// Константы
const CONFIG = {
    VERSION: '2.4',
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000,
    STORAGE_KEY: 'oprosnikCallHistory'
};

// Проверка доступности Chrome API
const diagnostics = {
    chromeAvailable: typeof chrome !== 'undefined',
    runtimeAvailable: typeof chrome !== 'undefined' && chrome.runtime,
    sendMessageAvailable: typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage
};

let messageAPI = null;

function initializeMessageAPI() {
    if (diagnostics.sendMessageAvailable) {
        messageAPI = chrome.runtime;
        return true;
    }
    return false;
}

function safeSendMessage(message, callback) {
    if (!messageAPI) {
        console.error('❌ Message API не инициализирован');
        callback({ status: 'error', message: 'API расширения недоступен' });
        return;
    }

    try {
        messageAPI.sendMessage(message, (response) => {
            if (messageAPI.lastError) {
                callback({ 
                    status: 'error', 
                    message: messageAPI.lastError.message || 'Неизвестная ошибка' 
                });
            } else {
                callback(response);
            }
        });
    } catch (error) {
        callback({ 
            status: 'error', 
            message: 'Ошибка выполнения: ' + error.message 
        });
    }
}

function showCallHistoryModal(callHistory) {
    console.log('📚 Показываем историю звонков:', callHistory.length);
    
    // Создаем оверлей
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    
    // Создаем модальное окно
    const modal = document.createElement('div');
    modal.style.cssText = `
        background: white;
        border-radius: 8px;
        padding: 20px;
        max-width: 600px;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    `;
    
    // Заголовок
    modal.innerHTML = `
        <h3 style="margin-top: 0; color: #333;">Выберите звонок для вставки</h3>
        <p style="color: #666; margin-bottom: 20px;">Найдено звонков в истории: ${callHistory.length}</p>
    `;
    
    // Создаем список звонков
    const callList = document.createElement('div');
    callList.style.cssText = 'display: flex; flex-direction: column; gap: 10px;';
    
    callHistory.forEach((call, index) => {
        const callItem = document.createElement('div');
        callItem.style.cssText = `
            border: 2px solid #e0e0e0;
            border-radius: 5px;
            padding: 15px;
            cursor: pointer;
            transition: all 0.2s;
            background: #f9f9f9;
        `;
        
        callItem.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <div>
                    <strong style="color: #333;">📞 ${call.phone}</strong>
                    <div style="color: #666; font-size: 14px; margin-top: 5px;">
                        ⏱ Длительность: ${call.duration}<br>
                        📍 Регион: ${call.region}<br>
                        🕐 Время: ${call.capturedAt}
                        ${call.capturedDate ? `<br>📅 Дата: ${new Date(call.capturedDate).toLocaleDateString()}` : ''}
                    </div>
                </div>
                <div style="text-align: right; color: #999; font-size: 12px;">
                    ${index === 0 ? '<span style="color: #4CAF50; font-weight: bold;">Последний</span>' : `#${index + 1}`}
                </div>
            </div>
        `;
        
        // Эффекты при наведении
        callItem.onmouseenter = () => {
            callItem.style.borderColor = '#4CAF50';
            callItem.style.background = '#f0f8f0';
        };
        
        callItem.onmouseleave = () => {
            callItem.style.borderColor = '#e0e0e0';
            callItem.style.background = '#f9f9f9';
        };
        
        // Обработчик клика
        callItem.onclick = () => {
            pasteDataIntoComment(call);
            document.body.removeChild(overlay);
        };
        
        callList.appendChild(callItem);
    });
    
    modal.appendChild(callList);
    
    // Кнопка закрытия
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Отмена';
    closeButton.style.cssText = `
        margin-top: 20px;
        padding: 10px 20px;
        background: #666;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        width: 100%;
    `;
    closeButton.onclick = () => document.body.removeChild(overlay);
    modal.appendChild(closeButton);
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Закрытие по клику на оверлей
    overlay.onclick = (e) => {
        if (e.target === overlay) {
            document.body.removeChild(overlay);
        }
    };
}

/**
 * Главная функция, которая создает и настраивает кнопку.
 */
function createPasteButton() {
    console.log('🔍 Поиск места для размещения кнопки...');
    
    let attempts = 0;
    const maxAttempts = 10;
    
    const tryCreateButton = () => {
        attempts++;
        let targetButton = null;
        let targetContainer = null;
        
        // Улучшенный поиск целевой кнопки и контейнера
        const searchStrategies = [
            // Стратегия 1: Поиск по ID
            () => {
                const btn = document.getElementById('create_inst');
                if (btn) {
                    console.log('✅ Найдена кнопка по ID: create_inst');
                    return { button: btn, container: btn.parentElement };
                }
                return null;
            },
            
            // Стратегия 2: Поиск кнопки "Ответить" с классом btn-primary
            () => {
                const buttons = document.querySelectorAll('button.btn-primary');
                for (const btn of buttons) {
                    if (btn.innerText && btn.innerText.trim() === 'Ответить') {
                        console.log('✅ Найдена кнопка "Ответить" по классу btn-primary');
                        return { button: btn, container: btn.parentElement };
                    }
                }
                return null;
            },
            
            // Стратегия 3: Общий поиск кнопок с текстом "Ответить"
            () => {
                const selectors = ['button', 'input[type="submit"]', '.btn'];
                for (const selector of selectors) {
                    try {
                        const elements = document.querySelectorAll(selector);
                        for (const el of elements) {
                            if (el.innerText && el.innerText.includes('Ответить')) {
                                console.log(`✅ Найдена кнопка по селектору: ${selector}`);
                                return { button: el, container: el.parentElement };
                            }
                        }
                    } catch (e) {
                        console.error('Ошибка при поиске по селектору:', selector, e);
                    }
                }
                return null;
            },
            
            // Стратегия 4: Поиск по структуре формы (последняя кнопка в форме)
            () => {
                const forms = document.querySelectorAll('form');
                for (const form of forms) {
                    const buttons = form.querySelectorAll('button[type="button"], input[type="submit"]');
                    if (buttons.length > 0) {
                        const lastBtn = buttons[buttons.length - 1];
                        console.log('✅ Найдена последняя кнопка в форме');
                        return { button: lastBtn, container: lastBtn.parentElement };
                    }
                }
                return null;
            }
        ];
        
        // Пробуем каждую стратегию поиска
        let result = null;
        for (const strategy of searchStrategies) {
            result = strategy();
            if (result) {
                targetButton = result.button;
                targetContainer = result.container;
                break;
            }
        }
        
        if (!targetButton) {
            console.log(`⏳ Попытка ${attempts}/${maxAttempts}: Кнопка не найдена`);
            
            if (attempts < maxAttempts) {
                setTimeout(tryCreateButton, 500);
            } else {
                console.error('❌ Не удалось найти кнопку "Ответить" после', maxAttempts, 'попыток');
                showDiagnosticInfo();
            }
            return;
        }

        // Проверяем, не существует ли уже наша кнопка
        const existingButtons = document.querySelectorAll('.oprosnik-helper-btn');
        let validButtonExists = false;
        
        existingButtons.forEach(btn => {
            if (btn.tagName === 'BUTTON' && btn.innerText.includes('Вставить данные') && btn.onclick) {
                validButtonExists = true;
                console.log('✅ Рабочая кнопка уже существует');
            } else {
                console.log('🔧 Удаляем старую/невалидную кнопку:', btn);
                btn.remove();
            }
        });
        
        if (validButtonExists) {
            return;
        }

        // Создаем контейнер для кнопок (если нужно)
        let buttonContainer = targetContainer;
        const needsContainer = !targetContainer.classList.contains('oprosnik-buttons-container');
        
        if (needsContainer) {
            buttonContainer = document.createElement('div');
            buttonContainer.className = 'oprosnik-buttons-container';
        }
        
        // Создаем нашу новую кнопку
        const pasteButton = document.createElement('button');
        pasteButton.innerText = 'Вставить данные о звонке';
        pasteButton.type = 'button';
        pasteButton.className = 'btn btn-success oprosnik-helper-btn';
        pasteButton.style.height = '38px';
        pasteButton.style.fontSize = '16px !important';
        
        // Добавляем data-атрибуты для диагностики
        pasteButton.setAttribute('data-extension-id', chrome.runtime?.id || 'unknown');
        pasteButton.setAttribute('data-version', CONFIG.VERSION);
        pasteButton.setAttribute('data-created-at', new Date().toISOString());

        // Добавляем обработчик клика
        pasteButton.addEventListener('click', handlePasteButtonClick);

        // Размещаем кнопку
        try {
            if (needsContainer) {
                // Если нужен контейнер, создаем его и размещаем после целевой кнопки
                buttonContainer.appendChild(pasteButton);
                targetButton.insertAdjacentElement('afterend', buttonContainer);
                console.log('✅ Кнопка размещена в новом контейнере после целевой кнопки');
            } else {
                // Если контейнер уже есть, просто добавляем кнопку
                buttonContainer.appendChild(pasteButton);
                console.log('✅ Кнопка добавлена в существующий контейнер');
            }
            
            // Проверяем видимость через небольшую задержку
            setTimeout(() => {
                const isVisible = pasteButton.offsetParent !== null && 
                                pasteButton.clientHeight > 0 && 
                                pasteButton.clientWidth > 0;
                                
                if (!isVisible) {
                    console.error('⚠️ Кнопка добавлена, но не видима! Применяем принудительные стили.');
                    pasteButton.style.cssText += ' display: inline-block !important; visibility: visible !important; opacity: 1 !important; position: relative !important;';
                } else {
                    console.log('✅ Кнопка видима и готова к использованию');
                }
                
                // Индикатор статуса API удален
            }, 100);
            
        } catch (e) {
            console.error('❌ Ошибка при добавлении кнопки:', e);
            
            // Fallback: пробуем добавить кнопку прямо в body
            try {
                pasteButton.style.cssText += ' position: fixed !important; bottom: 20px !important; right: 20px !important; z-index: 9999 !important;';
                document.body.appendChild(pasteButton);
                console.log('🔄 Кнопка добавлена как fallback в нижний правый угол');
            } catch (fallbackError) {
                console.error('❌ Критическая ошибка: не удалось добавить кнопку:', fallbackError);
            }
        }
    };
    
    tryCreateButton();
}

/**
 * Добавляет визуальный индикатор статуса API
 */
function addStatusIndicator() {
    const button = document.querySelector('.oprosnik-helper-btn');
    if (!button) return;
    
    const indicator = document.createElement('span');
    indicator.style.cssText = 'margin-left: 5px; font-size: 12px;';
    
    if (messageAPI) {
        indicator.innerHTML = '●';
        indicator.style.color = '#28a745';
        indicator.title = 'API доступен';
    } else {
        indicator.innerHTML = '●';
        indicator.style.color = '#dc3545';
        indicator.title = 'API недоступен';
    }
    
    button.appendChild(indicator);
}

/**
 * Обработчик нажатия на нашу кнопку.
 */
/**
 * Обработчик нажатия на нашу кнопку. (ИСПРАВЛЕННАЯ ВЕРСИЯ)
 */
function handlePasteButtonClick(event) {
    console.log('🖱️ Кнопка нажата', {
        timestamp: new Date().toISOString(),
        apiAvailable: !!messageAPI,
        buttonElement: event.target
    });
    
    const button = event.target.closest('.oprosnik-helper-btn');
    if (!button) {
        console.error('❌ Не удалось найти кнопку в событии');
        return;
    }
    
    // Предотвращаем повторные клики
    if (button.dataset.processing === 'true') {
        console.log('⏳ Кнопка уже обрабатывается, игнорируем клик');
        return;
    }
    
    button.dataset.processing = 'true';
    
    // Проверяем инициализацию API
    if (!messageAPI && !initializeMessageAPI()) {
        console.error('❌ Не удалось инициализировать API');
        button.dataset.processing = 'false';
        tryLocalStorageFallback(button);
        return;
    }
    
    // Показываем пользователю, что идет процесс
    const originalText = button.innerText;
    const originalBg = button.style.backgroundColor;
    
    button.innerText = 'Получение данных...';
    button.disabled = true;
    button.style.backgroundColor = '#ffc107';

    // Отправляем сообщение в background.js с запросом данных
    safeSendMessage({ action: 'getCallData' }, (response) => {
        console.log('📨 Обработка ответа:', response);
        
        // Всегда сбрасываем флаг обработки
        button.dataset.processing = 'false';

        if (response && response.status === 'success' && response.data) {
            console.log('✅ Данные успешно получены:', response.data);
            
            // ПРОВЕРКА: response.data должен быть массивом истории.
            // Если это массив и в нем больше одного звонка, показываем модальное окно.
            if (Array.isArray(response.data) && response.data.length > 1) {
                console.log(`📚 Найдена история из ${response.data.length} звонков. Показываем выбор.`);
                button.innerText = originalText;
                button.disabled = false;
                button.style.backgroundColor = originalBg;
                showCallHistoryModal(response.data);
                return;
            
            // Если это массив, но в нем только один звонок
            } else if (Array.isArray(response.data) && response.data.length === 1) {
                console.log('📝 В истории только один звонок. Вставляем его.');
                pasteDataIntoComment(response.data[0]);
                showSuccessState(button, originalText, originalBg);
                return;
                
            // Если это не массив, а просто объект одного звонка (для обратной совместимости)
            } else if (typeof response.data === 'object' && response.data !== null && !Array.isArray(response.data)) {
                console.log('📝 Получен один звонок. Вставляем его.');
                pasteDataIntoComment(response.data);
                showSuccessState(button, originalText, originalBg);
                return;
            
            // Если данные пустые
            } else {
                console.log('⚠️ Получены пустые данные. Пробуем fallback.');
                resetButtonState(button, originalText, originalBg);
                tryLocalStorageFallback(button);
                return;
            }

        } else {
            // Если произошла ошибка
            const errorMessage = response?.message || 'Неизвестная ошибка';
            console.error('❌ Ошибка при получении данных:', errorMessage);
            resetButtonState(button, originalText, originalBg);
            tryLocalStorageFallback(button);
        }
    });
}

// Вспомогательные функции для управления состоянием кнопки
function showSuccessState(button, originalText, originalBg) {
    button.innerText = 'Данные вставлены!';
    button.style.backgroundColor = '#28a745';
    button.disabled = false;
    
    setTimeout(() => {
        button.innerText = originalText;
        button.style.backgroundColor = originalBg;
    }, 2000);
}

function resetButtonState(button, originalText, originalBg) {
    button.innerText = originalText;
    button.disabled = false;
    button.style.backgroundColor = originalBg;
}
/**
 * Пробует получить данные из localStorage как fallback
 */
function tryLocalStorageFallback(button) {
    console.log('🔄 Пробуем получить данные из localStorage...');
    
    try {
        const history = localStorage.getItem('oprosnik_call_history');
        const lastCall = localStorage.getItem('oprosnik_last_call');
        
        if (history) {
            const callHistory = JSON.parse(history);
            if (callHistory && callHistory.length > 0) {
                console.log('✅ История найдена в localStorage:', callHistory.length);
                button.innerText = 'Вставить данные о звонке';
                button.disabled = false;
                showCallHistoryModal(callHistory);
                return;
            }
        }
        
        if (lastCall) {
            const data = JSON.parse(lastCall);
            console.log('✅ Последний звонок найден в localStorage:', data);
            pasteDataIntoComment(data);
            button.innerText = 'Данные вставлены!';
            setTimeout(() => {
                button.innerText = 'Вставить данные о звонке';
                button.disabled = false;
            }, 2000);
            return;
        }
        
        throw new Error('Нет данных в localStorage');
        
    } catch (e) {
        console.error('❌ Ошибка при чтении localStorage:', e);
        alert('Ошибка: Не удалось получить данные о звонках.\n\nУбедитесь, что:\n1. Открыта вкладка Cisco Finesse\n2. Был завершен хотя бы один звонок');
        button.innerText = 'Введите данные о звонке';
        button.disabled = false;
    }
}

/**
 * Вставляет полученные данные в поле "Комментарий".
 * @param {object} callData - Объект с данными о звонке.
 */
function pasteDataIntoComment(callData) {
    console.log('📝 Вставка данных в комментарий...');
    
    let commentTextarea = document.getElementById('comment_');
    if (!commentTextarea) {
        console.error('❌ Не найдено поле для комментария (#comment_)');
        // Пробуем найти по другим селекторам
        const alternativeSelectors = [
            'textarea[name="comment"]',
            'textarea[id*="comment"]',
            '.form-control[placeholder*="комментарий"]',
            'textarea.form-control'
        ];
        
        for (const selector of alternativeSelectors) {
            const element = document.querySelector(selector);
            if (element) {
                console.log('✅ Найдено альтернативное поле:', selector);
                commentTextarea = element;
                break;
            }
        }
        
        if (!commentTextarea) {
            alert('Ошибка: Не найдено поле для вставки комментария');
            return;
        }
    }
    
    insertDataIntoField(commentTextarea, callData);
}

/**
 * Вставляет данные в указанное поле
 */
function insertDataIntoField(field, callData) {
    // Используем только расчётное время
    let durationText = callData.duration || 'Неизвестно';

    // Форматируем данные в красивую строку для вставки
    const formattedData = `
Номер телефона: ${callData.phone}
Длительность: ${durationText}
Регион: ${callData.region}
`;

    // Сохраняем текущее значение
    const currentValue = field.value;
    
    // Вставляем отформатированные данные в начало комментария
    field.value = formattedData.trim() + '\n\n' + currentValue;
    
    // Фокусируемся на поле и устанавливаем курсор в конец
    field.focus();
    field.setSelectionRange(field.value.length, field.value.length);
    
    // Вызываем событие изменения для активации валидации формы
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
    
    console.log('✅ Данные успешно вставлены в поле');
}

/**
 * Показывает диагностическую информацию
 */
function showDiagnosticInfo() {
    console.group('🔧 Диагностическая информация');
    console.log('URL страницы:', window.location.href);
    console.log('Доступные элементы формы:');
    console.log('- Кнопки:', Array.from(document.querySelectorAll('button')).map(b => ({
        id: b.id,
        class: b.className,
        text: b.innerText
    })));
    console.log('- Текстовые поля:', Array.from(document.querySelectorAll('textarea')).map(t => ({
        id: t.id,
        name: t.name,
        class: t.className
    })));
    console.groupEnd();
}

/**
 * Дополнительная функция для принудительного пересоздания кнопки
 * Можно вызвать из консоли: recreateHelperButton()
 */
window.recreateHelperButton = function() {
    console.log('🔄 Принудительное пересоздание кнопки...');
    
    // Удаляем все существующие кнопки
    document.querySelectorAll('.oprosnik-helper-btn').forEach(btn => {
        console.log('🗑️ Удаляем:', btn);
        btn.remove();
    });
    
    // Пересоздаем
    createPasteButton();
};

// Добавляем глобальную функцию для отладки
window.debugOprosnikHelper = function() {
    console.group('🐛 Debug Oprosnik Helper');
    console.log('Кнопка "Ответить":', document.getElementById('create_inst'));
    console.log('Наша кнопка:', document.querySelector('.oprosnik-helper-btn'));
    console.log('Chrome API:', typeof chrome !== 'undefined' && chrome.runtime);
    console.log('Extension ID:', chrome.runtime?.id);
    
    // Проверяем localStorage
    try {
        const history = localStorage.getItem('oprosnik_call_history');
        const lastCall = localStorage.getItem('oprosnik_last_call');
        console.log('История в localStorage:', history ? JSON.parse(history).length + ' звонков' : 'нет');
        console.log('Последний звонок:', lastCall ? 'есть' : 'нет');
    } catch (e) {
        console.error('Ошибка чтения localStorage:', e);
    }
    
    console.groupEnd();
};

// ===== ЗАПУСК =====
console.log('🏁 Инициализация расширения...');

// Инициализируем API
const apiInitialized = initializeMessageAPI();
console.log('📡 API инициализирован:', apiInitialized);

// Ждем, пока страница полностью загрузится
if (document.readyState === 'loading') {
    console.log('⏳ Ожидание загрузки DOM...');
    document.addEventListener('DOMContentLoaded', () => {
        console.log('✅ DOM загружен');
        createPasteButton();
    });
} else {
    console.log('✅ DOM уже загружен');
    createPasteButton();
}

console.log('✅ Oprosnik Helper: Filler Script полностью загружен');