let filterSettings = {
    include: [],
    exclude: [],
    blockedImages: [],
    whitelistedImages: []
};
let isObserverActive = false;
let debounceTimer = null;
let lastRightClickedImageSrc = null; 

// Получаем ID картинки (имя файла) из ссылки
function getImageId(url) {
    if (!url) return null;
    try {
        const cleanUrl = url.split('?')[0];
        const parts = cleanUrl.split('/');
        return parts[parts.length - 1];
    } catch (e) {
        return null;
    }
}

// --- ОБРАБОТЧИК ПРАВОГО КЛИКА ---
// Запоминаем картинку под курсором (даже если клик был по коллажу)
document.addEventListener("contextmenu", (event) => {
    const target = event.target;
    lastRightClickedImageSrc = null; 

    // 1. Прямое попадание в картинку
    if (target.tagName === 'IMG' && target.src) {
        lastRightClickedImageSrc = target.src;
        return;
    }

    // 2. Попадание в слой коллажа
    const card = target.closest('.tile-root'); 
    if (card) {
        // Берем главное изображение карточки
        let img = card.querySelector('img'); 
        if (img) {
            lastRightClickedImageSrc = img.src;
        }
    }
}, true);

// --- ЗАГРУЗКА НАСТРОЕК ---
function loadSettings() {
    chrome.storage.local.get(['includeWords', 'excludeWords', 'blockedImages', 'whitelistedImages'], (result) => {
        const iText = result.includeWords || "";
        const eText = result.excludeWords || "";
        
        filterSettings.include = iText.split(/[\n,]+/).map(s => s.trim().toLowerCase()).filter(s => s);
        filterSettings.exclude = eText.split(/[\n,]+/).map(s => s.trim().toLowerCase()).filter(s => s);
        filterSettings.blockedImages = result.blockedImages || [];
        filterSettings.whitelistedImages = result.whitelistedImages || [];

        runFilter();
    });
}

// --- ГЛАВНАЯ ФУНКЦИЯ ФИЛЬТРАЦИИ ---
function runFilter() {
    const cards = document.querySelectorAll('.tile-root');
    const hasWhitelist = filterSettings.whitelistedImages.length > 0;
    
    cards.forEach(card => {
        let shouldShow = true;
        const cardText = card.innerText.toLowerCase();
        
        // Собираем ID всех картинок в карточке
        const imgElements = card.querySelectorAll('img');
        const cardImageIds = Array.from(imgElements)
            .map(img => getImageId(img.src || img.getAttribute('data-src')))
            .filter(id => id);

        // 1. ПРОВЕРКА БЕЛОГО СПИСКА (Приоритет)
        if (hasWhitelist) {
            // Если ни одна картинка не входит в белый список -> скрываем
            const match = cardImageIds.some(id => filterSettings.whitelistedImages.includes(id));
            if (!match) shouldShow = false;
        }

        // 2. ПРОВЕРКА ЧЕРНОГО СПИСКА
        if (shouldShow && filterSettings.blockedImages.length > 0) {
            const isBlocked = cardImageIds.some(id => filterSettings.blockedImages.includes(id));
            if (isBlocked) shouldShow = false;
        }

        // 3. ТЕКСТОВЫЕ ФИЛЬТРЫ
        if (shouldShow) {
            if (filterSettings.exclude.length > 0) {
                if (filterSettings.exclude.some(word => cardText.includes(word))) shouldShow = false;
            }
            if (shouldShow && filterSettings.include.length > 0) {
                if (!filterSettings.include.some(word => cardText.includes(word))) shouldShow = false;
            }
        }

        // ПРИМЕНЕНИЕ
        if (shouldShow) {
            if (card.style.display === 'none') card.style.display = '';
        } else {
            if (card.style.display !== 'none') card.style.display = 'none';
        }
    });
}

// --- ОБРАБОТКА СООБЩЕНИЙ ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "updateFilters") {
        loadSettings();
    }
    
    // Вспомогательная функция для обработки действий с картинкой
    const handleImageAction = (targetList, otherList, alertMsg) => {
        if (!lastRightClickedImageSrc) {
            alert("Не удалось определить картинку. Попробуйте навести курсор точнее.");
            return;
        }
        const imgId = getImageId(lastRightClickedImageSrc);
        if (imgId) {
            chrome.storage.local.get([targetList, otherList], (result) => {
                let targetArr = result[targetList] || [];
                let otherArr = result[otherList] || [];

                if (!targetArr.includes(imgId)) {
                    targetArr.push(imgId);
                    // Удаляем из противоположного списка, чтобы не было конфликтов
                    otherArr = otherArr.filter(id => id !== imgId);
                    
                    let saveData = {};
                    saveData[targetList] = targetArr;
                    saveData[otherList] = otherArr;

                    chrome.storage.local.set(saveData, () => {
                        loadSettings();
                        if (alertMsg) alert(alertMsg);
                    });
                } else {
                    alert('Эта картинка уже добавлена в этот список.');
                }
            });
        }
    };

    if (request.action === "blockLastClicked") {
        handleImageAction('blockedImages', 'whitelistedImages', null); // Без алерта, товар просто исчезнет
    }

    if (request.action === "whitelistLastClicked") {
        handleImageAction('whitelistedImages', 'blockedImages', "Теперь отображаются ТОЛЬКО товары с этой картинкой!");
    }
});

// --- НАБЛЮДАТЕЛЬ ---
const observer = new MutationObserver((mutations) => {
    let shouldUpdate = false;
    for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
            shouldUpdate = true;
            break;
        }
    }
    if (shouldUpdate) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(runFilter, 150);
    }
});

function startObserver() {
    if (!isObserverActive) {
        const targetNode = document.body;
        if (targetNode) {
            observer.observe(targetNode, { childList: true, subtree: true });
            isObserverActive = true;
        }
    }
}

loadSettings();
startObserver();