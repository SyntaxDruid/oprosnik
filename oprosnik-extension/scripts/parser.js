/**
 * parser.js - Минимальная версия
 * Служит только для ответов на запросы от background
 */

console.log('✅ Parser.js загружен (минимальная версия)');

// Простой индикатор для визуального подтверждения
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
`;
indicator.textContent = '✓ Oprosnik Helper';
document.body.appendChild(indicator);

// Удаляем индикатор через 5 секунд
setTimeout(() => indicator.remove(), 5000);

// Обработчик сообщений - только для ping
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

console.log('📡 Parser готов к работе');