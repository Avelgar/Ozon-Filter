chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "blockOzonImage",
        title: "⛔ Скрыть все товары с этой картинкой",
        // Добавляем "link", чтобы срабатывало на карточках-ссылках
        contexts: ["image", "link"] 
    });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "blockOzonImage") {
        // Мы просто шлем команду, а контент-скрипт сам разберется, какой URL брать
        chrome.tabs.sendMessage(tab.id, {
            action: "blockLastClicked"
        });
    }
});