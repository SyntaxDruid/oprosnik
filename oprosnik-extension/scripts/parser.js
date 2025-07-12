/**
 * parser.js - Версия с улучшенной фиксацией данных после завершения звонка
 * Версия: 3.1
 * 
 * Решает проблему отставания данных при завершении звонка
 */

console.log('🚀 Oprosnik Helper: Parser Script загружается...', {
    timestamp: new Date().toISOString(),
    url: window.location.href,
    extensionId: chrome.runtime?.id,
    version: '3.1'
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
        
        // Данные текущего активного звонка
        this.currentCallData = null;
        
        // История звонков (храним последние 5)
        this.callHistory = [];
        this.maxHistorySize = 5;
        
        // Статусы завершения разговора
        this.endCallStatuses = ['Поствызов', 'Готов', 'Ready', 'Not Ready', 'Wrap Up'];
        
        // Статусы активного разговора
        this.activeCallStatuses = ['Разговор', 'Talking', 'On Call', 'Connected'];
        
        // Предыдущий статус агента
        this.previousAgentStatus = null;
        
        // Интервалы для мониторинга
        this.callMonitorInterval = null;
        this.postCallMonitorInterval = null;
        
        // Таймер для задержки финальной фиксации
        this.finalCaptureTimeout = null;
        
        // Флаг для отслеживания пост-звонкового периода
        this.isInPostCallPeriod = false;
        
        // Счетчики для диагностики
        this.stats = {
            statusChanges: 0,
            callsTracked: 0,
            callsMonitored: 0,
            postCallCaptures: 0,
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
            getCurrentCall: () => this.currentCallData,
            getCallHistory: () => this.callHistory,
            getStats: () => this.stats,
            setTestData: () => {
                this.lastEndedCallData = this.testData;
                this.saveToLocalStorage(this.testData);
                console.log('✅ Тестовые данные установлены:', this.testData);
                return this.testData;
            },
            findCallElements: () => this.debugFindElements(),
            captureCurrentCall: () => this.captureActiveCallData(),
            toggleMonitoring: (enable) => {
                if (enable) {
                    this.startCallMonitoring();
                } else {
                    this.stopCallMonitoring();
                }
            }
        };
        
        console.log('💡 Команды для отладки:');
        console.log('   window._oprosnikHelper.setTestData() - установить тестовые данные');
        console.log('   window._oprosnikHelper.getLastCall() - получить последний звонок');
        console.log('   window._oprosnikHelper.getCurrentCall() - получить текущий звонок');
        console.log('   window._oprosnikHelper.captureCurrentCall() - захватить данные текущего звонка');
        console.log('   window._oprosnikHelper.toggleMonitoring(true/false) - вкл/выкл мониторинг');
        
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

            // Проверяем начало разговора
            if (this.activeCallStatuses.some(s => currentStatus.includes(s))) {
                console.log('📞 Обнаружено начало разговора! Запускаю мониторинг...');
                this.isInPostCallPeriod = false;
                this.startCallMonitoring();
            }

            // Проверяем завершение звонка
            if (!this.endCallStatuses.some(s => previousStatus.includes(s)) && 
                this.endCallStatuses.some(s => currentStatus.includes(s))) {
                console.log('☎️ CallTracker: Обнаружено завершение звонка!');
                
                // Устанавливаем флаг пост-звонкового периода
                this.isInPostCallPeriod = true;
                
                // НЕ останавливаем мониторинг сразу, а запускаем пост-звонковый мониторинг
                this.startPostCallMonitoring();
            }

            this.previousAgentStatus = currentStatus;
        }
    }

    /**
     * Запускает периодический мониторинг активного звонка
     */
    startCallMonitoring() {
        // Очищаем предыдущий интервал если есть
        if (this.callMonitorInterval) {
            clearInterval(this.callMonitorInterval);
        }
        
        console.log('🔄 Начинаю мониторинг активного звонка...');
        
        // Сразу захватываем данные
        this.captureActiveCallData();
        
        // Затем обновляем каждые 500мс для более точного отслеживания
        this.callMonitorInterval = setInterval(() => {
            this.captureActiveCallData();
        }, 500); // Уменьшили интервал до 500мс
    }
    
    /**
     * Запускает усиленный мониторинг после завершения звонка
     */
    startPostCallMonitoring() {
        console.log('🔄 Начинаю пост-звонковый мониторинг...');
        
        // Продолжаем частый мониторинг еще 5 секунд после завершения
        let postCallAttempts = 0;
        const maxPostCallAttempts = 20; // 20 попыток по 250мс = 5 секунд
        
        // Очищаем предыдущий интервал если есть
        if (this.postCallMonitorInterval) {
            clearInterval(this.postCallMonitorInterval);
        }
        
        this.postCallMonitorInterval = setInterval(() => {
            postCallAttempts++;
            this.stats.postCallCaptures++;
            
            console.log(`📊 Пост-звонковый захват ${postCallAttempts}/${maxPostCallAttempts}`);
            
            // Продолжаем захватывать данные
            this.captureActiveCallData();
            
            if (postCallAttempts >= maxPostCallAttempts) {
                // Финальная фиксация данных
                this.finalizeCallData();
            }
        }, 250); // Каждые 250мс в пост-звонковый период
    }
    
    /**
     * Финализирует и сохраняет данные звонка
     */
    finalizeCallData() {
        console.log('🏁 Финализация данных звонка...');
        
        // Останавливаем все мониторинги
        this.stopCallMonitoring();
        this.stopPostCallMonitoring();
        
        // Сохраняем последние захваченные данные
        if (this.currentCallData) {
            console.log('💾 Сохраняю финальные данные звонка...');
            
            // Делаем последнюю попытку захвата для уверенности
            this.captureActiveCallData();
            
            this.lastEndedCallData = { 
                ...this.currentCallData,
                finalizedAt: new Date().toLocaleTimeString()
            };
            this.stats.callsTracked++;
            
            // Сохраняем в localStorage и историю
            this.saveToLocalStorage(this.lastEndedCallData);
            
            // Показываем уведомление с финальными данными
            this.showNotification(`Звонок сохранен: ${this.lastEndedCallData.duration}`);
            
            console.log('✅ Финальные данные:', this.lastEndedCallData);
            
            // Очищаем текущие данные
            this.currentCallData = null;
        } else {
            console.warn('⚠️ Нет данных о завершенном звонке');
        }
        
        // Сбрасываем флаг
        this.isInPostCallPeriod = false;
    }
    
    /**
     * Останавливает мониторинг активного звонка
     */
    stopCallMonitoring() {
        if (this.callMonitorInterval) {
            console.log('⏹️ Останавливаю мониторинг активного звонка');
            clearInterval(this.callMonitorInterval);
            this.callMonitorInterval = null;
        }
    }
    
    /**
     * Останавливает пост-звонковый мониторинг
     */
    stopPostCallMonitoring() {
        if (this.postCallMonitorInterval) {
            console.log('⏹️ Останавливаю пост-звонковый мониторинг');
            clearInterval(this.postCallMonitorInterval);
            this.postCallMonitorInterval = null;
        }
    }

    /**
     * Захватывает данные активного звонка
     */
    captureActiveCallData() {
        // Пробуем разные селекторы для контейнера звонка
        const containerSelectors = [
            '.callcontrol-grid-cell-NIrSA',
            '[class^="callcontrol-grid-cell-"]',
            '[class*="callcontrol-grid-cell"]',
            '[class*="call-control"]',
            '[class*="active-call"]',
            '.call-info',
            '#call-info-panel',
            '[class*="callcontrol"][class*="active"]',
            '[class*="call"][class*="connected"]',
            '[class*="call-container"]'
        ];
        
        let callContainer = null;
        
        // В пост-звонковый период ищем любой контейнер с данными
        if (this.isInPostCallPeriod) {
            for (const selector of containerSelectors) {
                const elements = document.querySelectorAll(selector);
                for (const element of elements) {
                    // В пост-звонковый период проверяем наличие любых данных
                    if (element.querySelector('[aria-label*="Участник"]') || 
                        element.querySelector('[role="timer"]') || 
                        element.querySelector('[class*="timer"]') ||
                        element.querySelector('[class*="duration"]')) {
                        callContainer = element;
                        break;
                    }
                }
                if (callContainer) break;
            }
        } else {
            // В активный период ищем контейнер с таймером
            for (const selector of containerSelectors) {
                const elements = document.querySelectorAll(selector);
                for (const element of elements) {
                    if (element.querySelector('[role="timer"]') || element.querySelector('[class*="timer"]')) {
                        callContainer = element;
                        break;
                    }
                }
                if (callContainer) break;
            }
        }
        
        if (!callContainer) {
            // Не логируем ошибку каждый раз
            if (this.stats.callsMonitored % 20 === 0) {
                console.log('⏳ Ищу контейнер звонка...');
            }
            return;
        }
        
        // Ищем элементы с данными
        const phoneEl = this.findElementBySelectors(callContainer, [
            '[aria-label*="Участник"]',
            '[aria-label*="участник"]',
            '[aria-label*="Caller"]',
            '[aria-label*="Phone"]',
            '[class*="participant"]',
            '[class*="phone-number"]',
            '.callcontrol-participant-number',
            '[class*="participant-number"]'
        ]);
        
        const durationEl = this.findElementBySelectors(callContainer, [
            '[role="timer"]',
            '[class*="timer"]:not([class*="header-timer"])',
            '[class*="duration"]',
            '.call-timer',
            '#call-timer',
            '[id*="call-timer"]',
            // Дополнительные селекторы для финальной длительности
            '[class*="call-duration"]',
            '[class*="final-duration"]'
        ]);
        
        const regionEl = this.findElementBySelectors(callContainer, [
            '.callcontrol-callVariableValue-290jv span',
            '[class^="callcontrol-callVariableValue"] span',
            '[class*="callVariableValue"] span',
            '[class*="call-variable"]',
            '[class*="region"]',
            '.call-info-value',
            '[class*="callVariable"] span'
        ]);

        // Извлекаем данные
        const phone = phoneEl?.textContent?.trim() || this.currentCallData?.phone || 'Не найден';
        const duration = durationEl?.textContent?.trim() || this.currentCallData?.duration || '00:00:00';
        const region = regionEl?.textContent?.trim() || this.currentCallData?.region || 'Не найден';

        // Обновляем текущие данные
        if (phoneEl || durationEl) {
            const previousDuration = this.currentCallData?.duration;
            
            this.currentCallData = {
                phone: phone,
                duration: duration,
                region: region,
                capturedAt: new Date().toLocaleTimeString(),
                capturedDate: new Date().toISOString(),
                isPostCall: this.isInPostCallPeriod
            };
            
            this.stats.callsMonitored++;
            
            // Логируем если длительность изменилась
            if (previousDuration !== duration) {
                console.log('⏱️ Длительность обновилась:', previousDuration, '→', duration);
            }
            
            // Логируем периодически
            if (this.stats.callsMonitored === 1 || this.stats.callsMonitored % 20 === 0) {
                console.log('📊 Данные звонка:', this.currentCallData);
            }
        }
    }
    
    /**
     * Ищет элемент по списку селекторов
     */
    findElementBySelectors(container, selectors) {
        for (const selector of selectors) {
            try {
                const element = container.querySelector(selector);
                if (element && element.textContent) {
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
                extensionVersion: '3.1'
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
        const patterns = ['call', 'phone', 'timer', 'participant', 'voice', 'agent', 'duration'];
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
        
        // Специальный поиск таймеров
        console.log('\n🕐 Поиск таймеров:');
        const timers = document.querySelectorAll('[role="timer"], [class*="timer"]');
        timers.forEach((timer, i) => {
            console.log(`  Timer ${i + 1}: ${timer.textContent} (${timer.className})`);
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
            indicator.innerHTML = '✅ Oprosnik Helper v3.1<br><small>Клик для информации</small>';
            
            indicator.onclick = () => {
                const info = `
Статистика:
- Изменений статуса: ${this.stats.statusChanges}
- Завершено звонков: ${this.stats.callsTracked}
- Проверок активного звонка: ${this.stats.callsMonitored}
- Пост-звонковых захватов: ${this.stats.postCallCaptures}
- Попыток сохранения: ${this.stats.saveAttempts}
- Ошибок сохранения: ${this.stats.saveErrors}
- Звонков в истории: ${this.callHistory.length}

Текущий звонок:
${this.currentCallData ? JSON.stringify(this.currentCallData, null, 2) : 'Нет активного звонка'}

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

console.log('✅ Oprosnik Helper: Parser v3.1 полностью загружен и готов к работе');
console.log('📊 URL:', window.location.href);
console.log('🆔 Extension ID:', chrome.runtime?.id);