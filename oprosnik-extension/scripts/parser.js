/**
 * parser.js - Версия с исправленным сохранением и историей звонков
 * Версия: 2.1
 * Работает на странице-источнике. Отслеживает завершение звонков
 * и сохраняет данные последних звонков в localStorage.
 */

console.log('🚀 Oprosnik Helper: Parser Script загружается...', {
    timestamp: new Date().toISOString(),
    url: window.location.href,
    extensionId: chrome.runtime?.id,
    version: '2.1'
});

// Проверяем доступность Chrome API
if (!chrome || !chrome.runtime) {
    console.error('❌ Parser: Chrome API недоступен!');
} else {
    console.log('✅ Parser: Chrome API доступен');
}

class CallEndTracker {
    constructor() {
        // Данные последнего завершенного звонка
        this.lastEndedCallData = null;
        
        // История звонков (храним последние 5)
        this.callHistory = [];
        this.maxHistorySize = 5;
        
        // Статусы завершения разговора
        this.endCallStatuses = ['Поствызов', 'Готов', 'Ready', 'Not Ready', 'Wrap Up'];
        
        // Предыдущий статус агента
        this.previousAgentStatus = null;
        
        // Счетчики для диагностики
        this.stats = {
            statusChanges: 0,
            callsTracked: 0,
            saveAttempts: 0,
            saveErrors: 0
        };
        
        // Тестовые данные для отладки
        this.testData = {
            phone: '89991234567',
            duration: '00:00:00',
            region: 'ТЕСТ',
            capturedAt: new Date().toLocaleTimeString()
        };

        this.init();
    }

    /**
     * Инициализирует все необходимые наблюдатели.
     */
    init() {
        console.log('📡 CallTracker: Инициализация...');
        
        // Добавляем глобальный объект для отладки
        window._oprosnikHelper = {
            tracker: this,
            getLastCall: () => this.getLastCallData(),
            getCallHistory: () => this.callHistory,
            getStats: () => this.stats,
            setTestData: () => {
                this.lastEndedCallData = this.testData;
                this.saveToLocalStorage(this.testData);
                console.log('✅ Тестовые данные установлены:', this.testData);
                return this.testData;
            },
            findCallElements: () => this.debugFindElements(),
            // Новый метод для ручного сохранения
            saveCurrentData: () => {
                if (this.lastEndedCallData) {
                    this.saveToLocalStorage(this.lastEndedCallData);
                    return 'Данные сохранены';
                }
                return 'Нет данных для сохранения';
            }
        };
        
        console.log('💡 Команды для отладки:');
        console.log('   window._oprosnikHelper.setTestData() - установить тестовые данные');
        console.log('   window._oprosnikHelper.getLastCall() - получить последний звонок');
        console.log('   window._oprosnikHelper.getCallHistory() - получить историю звонков');
        console.log('   window._oprosnikHelper.saveCurrentData() - принудительно сохранить текущие данные');
        
        // Загружаем историю из localStorage при старте
        this.loadFromLocalStorage();
        
        // Запускаем мониторинг статуса
        this.startStatusMonitoring();
        
        // Показываем визуальный индикатор
        this.showVisualIndicator();
    }

    /**
     * Запускает MutationObserver для отслеживания изменения статуса оператора.
     */
    startStatusMonitoring() {
        let attempts = 0;
        const maxAttempts = 30; // 15 секунд
        
        const waitForStatusElement = setInterval(() => {
            attempts++;
            
            // Пробуем разные селекторы для статуса
            const statusSelectors = [
                '#voice-state-select-headerOptionText',
                '[id*="voice-state"]',
                '[id*="agent-state"]',
                '.agent-state-select',
                '[class*="state-select"]',
                '[class*="voice-state"]'
            ];
            
            let statusContainer = null;
            for (const selector of statusSelectors) {
                statusContainer = document.querySelector(selector);
                if (statusContainer && statusContainer.textContent) {
                    console.log(`✅ Найден элемент статуса по селектору: ${selector}`);
                    break;
                }
            }
            
            if (statusContainer) {
                clearInterval(waitForStatusElement);
                console.log('✅ CallTracker: Контейнер статуса найден');
                console.log('   Текущий статус:', statusContainer.textContent.trim());

                // Сохраняем начальный статус
                this.previousAgentStatus = statusContainer.textContent.trim();

                // Создаем наблюдатель
                const observer = new MutationObserver(() => {
                    this.handleStatusChange(statusContainer);
                });

                observer.observe(statusContainer, {
                    characterData: true,
                    childList: true,
                    subtree: true,
                    attributes: true,
                    attributeFilter: ['textContent', 'innerText']
                });
                
                console.log('✅ CallTracker: MutationObserver установлен');
                
            } else if (attempts >= maxAttempts) {
                clearInterval(waitForStatusElement);
                console.error('❌ CallTracker: Не удалось найти элемент статуса после', maxAttempts, 'попыток');
                this.stats.errors++;
                
                // Показываем найденные элементы для отладки
                this.debugFindElements();
            } else if (attempts % 10 === 0) {
                console.log(`⏳ Поиск элемента статуса... попытка ${attempts}/${maxAttempts}`);
            }
        }, 500);
    }
    
    /**
     * Обрабатывает изменение статуса.
     */
    handleStatusChange(statusContainer) {
        const currentStatus = statusContainer.textContent.trim();
        const previousStatus = this.previousAgentStatus;

        if (currentStatus !== previousStatus) {
            this.stats.statusChanges++;
            console.log(`📞 CallTracker: Статус изменился с "${previousStatus}" на "${currentStatus}"`);

            // Проверяем завершение звонка
            if (!this.endCallStatuses.some(s => previousStatus.includes(s)) && 
                this.endCallStatuses.some(s => currentStatus.includes(s))) {
                console.log('☎️ CallTracker: Обнаружено завершение звонка! Собираю данные...');
                
                // Небольшая задержка, чтобы DOM успел обновиться
                setTimeout(() => this.captureLastCallData(), 500);
            }

            this.previousAgentStatus = currentStatus;
        }
    }

    /**
     * Находит на странице информацию о звонке и сохраняет ее.
     */
    captureLastCallData() {
        console.log('📊 Сбор данных о звонке...');
        
        // Пробуем разные селекторы для контейнера звонка
        const containerSelectors = [
            '.callcontrol-grid-cell-NIrSA',
            '[class^="callcontrol-grid-cell-"]',
            '[class*="callcontrol-grid-cell"]',
            '[class*="call-control"]',
            '[class*="active-call"]',
            '.call-info',
            '#call-info-panel'
        ];
        
        let callContainer = null;
        for (const selector of containerSelectors) {
            callContainer = document.querySelector(selector);
            if (callContainer) {
                console.log(`✅ Найден контейнер по селектору: ${selector}`);
                break;
            }
        }
        
        if (!callContainer) {
            console.error('❌ CallTracker: Не удалось найти контейнер звонка');
            this.stats.errors++;
            this.debugFindElements();
            return;
        }
        
        // Ищем элементы с данными с помощью гибких селекторов
        const phoneEl = this.findElementBySelectors(callContainer, [
            '[aria-label*="Участник"]',
            '[aria-label*="участник"]',
            '[aria-label*="Caller"]',
            '[aria-label*="Phone"]',
            '[class*="participant"]',
            '[class*="phone-number"]',
            '.callcontrol-participant-number'
        ]);
        
        const durationEl = this.findElementBySelectors(callContainer, [
            '[role="timer"]',
            '[class*="timer"]',
            '[class*="duration"]',
            '.call-timer',
            '#call-timer'
        ]);
        
        const regionEl = this.findElementBySelectors(callContainer, [
            '.callcontrol-callVariableValue-290jv span',
            '[class^="callcontrol-callVariableValue"] span',
            '[class*="callVariableValue"] span',
            '[class*="call-variable"]',
            '[class*="region"]',
            '.call-info-value'
        ]);

        // Извлекаем данные
        const phone = phoneEl?.textContent?.trim() || 'Не найден';
        const duration = durationEl?.textContent?.trim() || 'Не найдена';
        const region = regionEl?.textContent?.trim() || 'Не найден';

        const callData = {
            phone: phone,
            duration: duration,
            region: region,
            capturedAt: new Date().toLocaleTimeString(),
            capturedDate: new Date().toISOString()
        };

        this.lastEndedCallData = callData;
        console.log('✅ CallTracker: Данные последнего звонка зафиксированы:', callData);
        this.stats.callsTracked++;
        
        // ВАЖНО: Сохраняем в localStorage и историю
        this.saveToLocalStorage(callData);
        
        // Показываем уведомление
        this.showNotification('Данные звонка сохранены');
    }
    
    /**
     * Ищет элемент по списку селекторов
     */
    findElementBySelectors(container, selectors) {
        for (const selector of selectors) {
            try {
                const element = container.querySelector(selector);
                if (element && element.textContent) {
                    console.log(`  ✓ Найден элемент по селектору: ${selector}`);
                    return element;
                }
            } catch (e) {
                // Игнорируем ошибки невалидных селекторов
            }
        }
        return null;
    }
    
    /**
     * Сохраняет данные в localStorage с историей
     */
    saveToLocalStorage(data) {
        console.log('💾 Начинаем сохранение в localStorage...');
        this.stats.saveAttempts++;
        
        try {
            // Добавляем метаданные
            const dataWithMeta = {
                ...data,
                savedAt: Date.now(),
                extensionVersion: '2.1'
            };
            
            // Сохраняем как последний звонок
            localStorage.setItem('oprosnik_last_call', JSON.stringify(dataWithMeta));
            console.log('✅ Сохранено как последний звонок');
            
            // Добавляем в историю
            this.callHistory.unshift(dataWithMeta); // Добавляем в начало
            
            // Ограничиваем размер истории
            if (this.callHistory.length > this.maxHistorySize) {
                this.callHistory = this.callHistory.slice(0, this.maxHistorySize);
            }
            
            // Сохраняем историю
            localStorage.setItem('oprosnik_call_history', JSON.stringify(this.callHistory));
            console.log(`✅ Сохранено в историю. Всего звонков в истории: ${this.callHistory.length}`);
            
            // Логируем для отладки
            console.log('📦 Сохраненные данные:', dataWithMeta);
            console.log('📚 История звонков:', this.callHistory);
            
        } catch (e) {
            console.error('❌ Ошибка сохранения в localStorage:', e);
            this.stats.saveErrors++;
            
            // Пробуем сохранить хотя бы последний звонок
            try {
                localStorage.setItem('oprosnik_last_call_backup', JSON.stringify(data));
                console.log('⚠️ Сохранено в резервное хранилище');
            } catch (e2) {
                console.error('❌ Критическая ошибка сохранения:', e2);
            }
        }
    }
    
    /**
     * Загружает данные из localStorage
     */
    loadFromLocalStorage() {
        try {
            // Загружаем последний звонок
            const lastCall = localStorage.getItem('oprosnik_last_call');
            if (lastCall) {
                this.lastEndedCallData = JSON.parse(lastCall);
                console.log('💾 Загружен последний звонок:', this.lastEndedCallData);
            }
            
            // Загружаем историю
            const history = localStorage.getItem('oprosnik_call_history');
            if (history) {
                this.callHistory = JSON.parse(history);
                console.log(`💾 Загружена история звонков: ${this.callHistory.length} записей`);
            }
            
        } catch (e) {
            console.error('❌ Ошибка загрузки из localStorage:', e);
        }
    }

    /**
     * Возвращает данные последнего завершенного звонка
     */
    getLastCallData() {
        return this.lastEndedCallData;
    }
    
    /**
     * Отладочная функция для поиска элементов
     */
    debugFindElements() {
        console.group('🔍 Отладка: поиск элементов на странице');
        
        // Ищем все потенциальные контейнеры
        const patterns = ['call', 'phone', 'timer', 'participant', 'voice', 'agent'];
        patterns.forEach(pattern => {
            const elements = document.querySelectorAll(`[class*="${pattern}"], [id*="${pattern}"]`);
            if (elements.length > 0) {
                console.log(`Найдено элементов с "${pattern}":`, elements.length);
                elements.forEach((el, i) => {
                    if (i < 3) { // Показываем только первые 3
                        console.log(`  - ${el.tagName}.${el.className || el.id}:`, 
                                   el.textContent?.substring(0, 50));
                    }
                });
            }
        });
        
        console.groupEnd();
    }
    
    /**
     * Показывает визуальный индикатор
     */
    showVisualIndicator() {
        try {
            const indicator = document.createElement('div');
            indicator.id = 'oprosnik-helper-indicator';
            indicator.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: #4CAF50;
                color: white;
                padding: 10px 15px;
                border-radius: 5px;
                font-size: 14px;
                z-index: 99999;
                cursor: pointer;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                transition: all 0.3s ease;
            `;
            indicator.innerHTML = '✅ Oprosnik Helper активен<br><small>Клик для информации</small>';
            
            indicator.onclick = () => {
                const info = `
Статистика:
- Изменений статуса: ${this.stats.statusChanges}
- Отслежено звонков: ${this.stats.callsTracked}
- Попыток сохранения: ${this.stats.saveAttempts}
- Ошибок сохранения: ${this.stats.saveErrors}
- Звонков в истории: ${this.callHistory.length}

Последний звонок:
${this.lastEndedCallData ? JSON.stringify(this.lastEndedCallData, null, 2) : 'Нет данных'}
                `;
                alert(info);
            };
            
            document.body.appendChild(indicator);
            
            // Удаляем через 10 секунд
            setTimeout(() => {
                indicator.style.opacity = '0';
                setTimeout(() => indicator.remove(), 300);
            }, 10000);
            
        } catch (e) {
            console.error('Не удалось создать индикатор:', e);
        }
    }
    
    /**
     * Показывает уведомление
     */
    showNotification(message) {
        try {
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #2196F3;
                color: white;
                padding: 15px 20px;
                border-radius: 5px;
                font-size: 14px;
                z-index: 99999;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                animation: slideIn 0.3s ease;
            `;
            notification.textContent = '📞 ' + message;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.style.opacity = '0';
                setTimeout(() => notification.remove(), 300);
            }, 3000);
            
        } catch (e) {
            console.error('Не удалось показать уведомление:', e);
        }
    }
}

// Создаем единственный экземпляр трекера
const callTracker = new CallEndTracker();

// ОБРАБОТЧИК СООБЩЕНИЙ
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('📨 Parser: Получено сообщение:', request.action);
    
    // Обработка ping для проверки загрузки
    if (request.action === 'ping') {
        console.log('🏓 Parser: Отвечаю на ping');
        sendResponse({ 
            status: 'pong', 
            message: 'Parser script активен',
            stats: callTracker.stats
        });
        return true;
    }
    
    // Запрос данных о звонке
    if (request.action === 'parseCallData') {
        console.log('📋 Parser: Запрос на получение данных...');
        const data = callTracker.getLastCallData();

        if (data) {
            console.log('✅ Parser: Отправляю данные:', data);
            sendResponse({ status: 'success', data: data });
        } else {
            console.log('⚠️ Parser: Данные о звонке отсутствуют');
            sendResponse({ 
                status: 'error', 
                message: 'Данные о последнем завершенном звонке еще не были зафиксированы. Сначала завершите звонок.',
                hint: 'Используйте window._oprosnikHelper.setTestData() для тестирования'
            });
        }
    }
    
    // Новый запрос для получения истории
    if (request.action === 'getCallHistory') {
        console.log('📚 Parser: Запрос истории звонков...');
        sendResponse({ 
            status: 'success', 
            history: callTracker.callHistory,
            count: callTracker.callHistory.length
        });
    }
    
    return true;
});

// Добавляем стили для анимации
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);

console.log('✅ Oprosnik Helper: Parser полностью загружен и готов к работе');
console.log('📊 URL:', window.location.href);
console.log('🆔 Extension ID:', chrome.runtime?.id);