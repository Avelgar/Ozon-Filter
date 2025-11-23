let filterSettings = {
    include: [],
    exclude: [],
    blockedImages: []
};
let isObserverActive = false;
let debounceTimer = null;
// Переменная для хранения URL последней картинки под правым кликом
let lastRightClickedImageSrc = null; 

function getImageId(url) {
    try {
        const cleanUrl = url.split('?')[0]; // Убираем параметры
        const parts = cleanUrl.split('/');
        return parts[parts.length - 1];
    } catch (e) {
        return null;
    }
}

// --- НОВАЯ ЧАСТЬ: Ловим правый клик ---
document.addEventListener("contextmenu", (event) => {
    const target = event.target;

    // 1. Если кликнули прямо по картинке
    if (target.tagName === 'IMG') {
        lastRightClickedImageSrc = target.src;
        return;
    }

    // 2. Если кликнули по перекрывающему слою (коллаж/ссылка)
    // Ищем родительскую карточку
    const card = target.closest('.tile-root'); 
    if (card) {
        // Внутри карточки ищем главную картинку (обычно она первая или имеет специфический класс, но first работает хорошо)
        const img = card.querySelector('img');
        if (img) {
            lastRightClickedImageSrc = img.src;
        }
    }
}, true); // true = перехватываем событие в фазе захвата
// --------------------------------------

function loadSettings() {
    chrome.storage.local.get(['includeWords', 'excludeWords', 'blockedImages'], (result) => {
        const iText = result.includeWords || "";
        const eText = result.excludeWords || "";
        
        filterSettings.include = iText.split(/[\n,]+/).map(s => s.trim().toLowerCase()).filter(s => s);
        filterSettings.exclude = eText.split(/[\n,]+/).map(s => s.trim().toLowerCase()).filter(s => s);
        filterSettings.blockedImages = result.blockedImages || [];

        runFilter();
    });
}

function runFilter() {
    const cards = document.querySelectorAll('.tile-root');
    
    cards.forEach(card => {
        const cardText = card.innerText.toLowerCase();
        let shouldShow = true;

        if (filterSettings.exclude.length > 0) {
            if (filterSettings.exclude.some(word => cardText.includes(word))) {
                shouldShow = false;
            }
        }

        if (shouldShow && filterSettings.include.length > 0) {
            if (!filterSettings.include.some(word => cardText.includes(word))) {
                shouldShow = false;
            }
        }

        if (shouldShow && filterSettings.blockedImages.length > 0) {
            const images = card.querySelectorAll('img');
            const hasBlockedImage = Array.from(images).some(img => {
                if (!img.src) return false;
                const imgId = getImageId(img.src);
                return imgId && filterSettings.blockedImages.includes(imgId);
            });

            if (hasBlockedImage) shouldShow = false;
        }

        if (shouldShow) {
            if (card.style.display === 'none') card.style.display = '';
        } else {
            if (card.style.display !== 'none') card.style.display = 'none';
        }
    });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "updateFilters") {
        loadSettings();
    }
    
    // Обработка новой команды от background.js
    if (request.action === "blockLastClicked") {
        if (!lastRightClickedImageSrc) {
            alert("Не удалось определить картинку. Попробуйте навести курсор точнее.");
            return;
        }

        const imgId = getImageId(lastRightClickedImageSrc);
        
        if (imgId) {
            chrome.storage.local.get(['blockedImages'], (result) => {
                let currentBlocked = result.blockedImages || [];
                if (!currentBlocked.includes(imgId)) {
                    currentBlocked.push(imgId);
                    chrome.storage.local.set({ blockedImages: currentBlocked }, () => {
                        loadSettings();
                        // Небольшая визуальная обратная связь
                        alert(`Картинка ${imgId} добавлена в бан!`);
                    });
                } else {
                    alert('Эта картинка уже заблокирована.');
                }
            });
        }
    }
});

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
        debounceTimer = setTimeout(runFilter, 100);
    }
});

function startObserver() {
    if (!isObserverActive) {
        const targetNode = document.body;
        const config = { childList: true, subtree: true };
        observer.observe(targetNode, config);
        isObserverActive = true;
    }
}

loadSettings();
startObserver();