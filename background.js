chrome.runtime.onInstalled.addListener(() => {
    // 1. Черный список (Скрыть)
    chrome.contextMenus.create({
        id: "blockOzonImage",
        title: "⛔ Скрыть товары с этой картинкой",
        contexts: ["all"] 
    });
    
    // 2. Белый список (Оставить только)
    chrome.contextMenus.create({
        id: "whitelistOzonImage",
        title: "✅ Оставить ТОЛЬКО товары с этой картинкой",
        contexts: ["all"] 
    });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    // Отправляем разные команды в зависимости от выбранного пункта
    if (info.menuItemId === "blockOzonImage") {
        chrome.tabs.sendMessage(tab.id, { action: "blockLastClicked" });
    } else if (info.menuItemId === "whitelistOzonImage") {
        chrome.tabs.sendMessage(tab.id, { action: "whitelistLastClicked" });
    }
});