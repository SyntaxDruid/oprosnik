/**
 * parser.js
 * Работает на странице-источнике. Отслеживает завершение звонков
 * и сохраняет данные последнего из них, чтобы передать по запросу.
 */
console.log('Oprosnik Helper: Advanced Parser Script Injected.');

class CallEndTracker {
    constructor() {
        // Здесь будут храниться данные последнего завершенного звонка
        this.lastEndedCallData = null;
        // Статусы, которые однозначно указывают на завершение разговора
        this.endCallStatuses = ['Поствызов', 'Готов'];
        // Предыдущий статус агента, чтобы отследить изменение
        this.previousAgentStatus = null;

        this.init();
    }

    /**
     * Инициализирует все необходимые наблюдатели.
     */
    init() {
        console.log('CallTracker: Инициализация...');
        this.startStatusMonitoring();
    }

    /**
     * Запускает MutationObserver для отслеживания изменения статуса оператора.
     * Это самый надежный способ определить завершение звонка.
     */
    startStatusMonitoring() {
        // Ждем, пока элемент со статусом появится на странице
        const waitForStatusElement = setInterval(() => {
            const statusContainer = document.querySelector('#voice-state-select-headerOptionText');
            if (statusContainer) {
                clearInterval(waitForStatusElement);
                console.log('CallTracker: Контейнер статуса найден. Запускаю наблюдатель.');

                // Сохраняем начальный статус
                this.previousAgentStatus = statusContainer.textContent.trim();

                const observer = new MutationObserver(() => {
                    this.handleStatusChange(statusContainer);
                });

                observer.observe(statusContainer, {
                    characterData: true,
                    childList: true,
                    subtree: true
                });
            }
        }, 500); // Проверяем каждые 500мс
    }
    
    /**
     * Обрабатывает изменение статуса. Если звонок завершился,
     * запускает парсинг и сохранение данных.
     */
    handleStatusChange(statusContainer) {
        const currentStatus = statusContainer.textContent.trim();
        const previousStatus = this.previousAgentStatus;

        console.log(`CallTracker: Статус изменился с "${previousStatus}" на "${currentStatus}"`);

        // Главное условие: если предыдущий статус НЕ был статусом завершения,
        // а текущий — ЯВЛЯЕТСЯ, значит, звонок только что закончился.
        if (!this.endCallStatuses.includes(previousStatus) && this.endCallStatuses.includes(currentStatus)) {
            console.log('CallTracker: Обнаружено завершение звонка! Собираю данные...');
            this.captureLastCallData();
        }

        // Обновляем предыдущий статус
        this.previousAgentStatus = currentStatus;
    }

    /**
     * Находит на странице информацию о звонке и сохраняет ее.
     * Эта функция вызывается в момент завершения звонка.
     */
    captureLastCallData() {
        const callContainer = document.querySelector('.callcontrol-grid-cell-NIrSA');
        if (!callContainer) {
            console.warn('CallTracker: Не удалось найти контейнер звонка для сбора данных.');
            return;
        }

        const phoneEl = callContainer.querySelector('[aria-label*="Участник"]');
        const durationEl = callContainer.querySelector('[role="timer"]');
        const regionEl = callContainer.querySelector('.callcontrol-callVariableValue-290jv span');

        this.lastEndedCallData = {
            phone: phoneEl ? phoneEl.textContent.trim() : 'Не найден',
            duration: durationEl ? durationEl.textContent.trim() : 'Не найдена',
            region: regionEl ? regionEl.textContent.trim() : 'Не найден',
            capturedAt: new Date().toLocaleTimeString()
        };

        console.log('CallTracker: Данные последнего звонка зафиксированы:', this.lastEndedCallData);
    }

    /**
     * Возвращает данные последнего завершенного звонка.
     */
    getLastCallData() {
        return this.lastEndedCallData;
    }
}

// Создаем единственный экземпляр нашего трекера
const callTracker = new CallEndTracker();

// --- ОБРАБОТЧИК СООБЩЕНИЙ ---
// Слушаем входящие команды от background.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'parseCallData') {
        console.log('Парсер: Получена команда на получение данных...');
        const data = callTracker.getLastCallData();

        if (data) {
            sendResponse({ status: 'success', data: data });
        } else {
            sendResponse({ status: 'error', message: 'Данные о последнем завершенном звонке еще не были зафиксированы.' });
        }
    }
    return true;
});