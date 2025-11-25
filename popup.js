document.addEventListener('DOMContentLoaded', () => {
    loadData();
});

function loadData() {
    chrome.storage.local.get(['includeWords', 'excludeWords', 'blockedImages', 'whitelistedImages'], (result) => {
        // Загружаем текст
        document.getElementById('include').value = result.includeWords || "";
        document.getElementById('exclude').value = result.excludeWords || "";
        
        // Загружаем счетчики
        const bCount = result.blockedImages ? result.blockedImages.length : 0;
        const wCount = result.whitelistedImages ? result.whitelistedImages.length : 0;
        
        document.getElementById('blockCount').textContent = bCount;
        document.getElementById('whiteCount').textContent = wCount;
    });
}

// Функция отправки сигнала на страницу
function notifyContentScript() {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {action: "updateFilters"});
        }
    });
}

function showStatus(text) {
    const el = document.getElementById('status');
    el.textContent = text;
    setTimeout(() => el.textContent = '', 2000);
}

// 1. Сохранение текстовых полей
document.getElementById('saveBtn').addEventListener('click', () => {
    const includeText = document.getElementById('include').value;
    const excludeText = document.getElementById('exclude').value;

    chrome.storage.local.set({
        includeWords: includeText,
        excludeWords: excludeText
    }, () => {
        showStatus('Текстовые фильтры сохранены!');
        notifyContentScript();
    });
});

// 2. Сброс ЧЕРНОГО списка (Скрытые картинки)
document.getElementById('clearBlockBtn').addEventListener('click', () => {
    chrome.storage.local.set({ blockedImages: [] }, () => {
        loadData(); // Обновляем цифры в попапе
        notifyContentScript(); // Обновляем страницу Ozon
    });
});

// 3. Сброс БЕЛОГО списка (Разрешенные картинки) - ВОТ ЭТА ФУНКЦИЯ
document.getElementById('clearWhiteBtn').addEventListener('click', () => {
    chrome.storage.local.set({ whitelistedImages: [] }, () => {
        loadData(); // Обновляем цифры в попапе
        notifyContentScript(); // Обновляем страницу Ozon
    });
});

// 4. Полный сброс всего
document.getElementById('resetBtn').addEventListener('click', () => {
    if(!confirm("Сбросить абсолютно все настройки?")) return;

    document.getElementById('include').value = '';
    document.getElementById('exclude').value = '';
    
    chrome.storage.local.set({
        includeWords: '',
        excludeWords: '',
        blockedImages: [],
        whitelistedImages: []
    }, () => {
        loadData();
        notifyContentScript();
        showStatus('Всё сброшено!');
    });
});