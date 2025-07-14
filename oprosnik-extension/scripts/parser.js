/**
 * parser.js - Версия 2.0
 * Минимальный скрипт для страниц Finesse
 */

// Создаем визуальный индикатор работы расширения
function createIndicator() {
    const indicator = document.createElement('div');
    indicator.style.cssText = `
        position: fixed;
        bottom: 10px;
        right: 10px;
        background: #4CAF50;
        color: white;
        padding: 5px 10px;
        border-radius: 3px;
        font-size: 12px;
        z-index: 99999;
        opacity: 0.8;
    `;
    indicator.textContent = '✓ Oprosnik Helper';
    document.body.appendChild(indicator);
    
    setTimeout(() => indicator.remove(), 3000);
}

// Обработчик сообщений от background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'ping') {
        sendResponse({ 
            status: 'pong',
            message: 'Parser активен',
            url: window.location.href
        });
        return true;
    }
});

// Инициализация при загрузке
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createIndicator);
} else {
    createIndicator();
}