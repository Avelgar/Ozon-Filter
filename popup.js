document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get(['includeWords', 'excludeWords', 'blockedImages'], (result) => {
        if (result.includeWords) document.getElementById('include').value = result.includeWords;
        if (result.excludeWords) document.getElementById('exclude').value = result.excludeWords;
        
        const imgCount = result.blockedImages ? result.blockedImages.length : 0;
        document.getElementById('imgCount').textContent = imgCount;
    });
});

function notifyContentScript() {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {action: "updateFilters"});
        }
    });
}

document.getElementById('saveBtn').addEventListener('click', () => {
    const includeText = document.getElementById('include').value;
    const excludeText = document.getElementById('exclude').value;

    chrome.storage.local.set({
        includeWords: includeText,
        excludeWords: excludeText
    }, () => {
        const status = document.getElementById('status');
        status.textContent = 'Сохранено!';
        setTimeout(() => status.textContent = '', 2000);
        notifyContentScript();
    });
});

document.getElementById('clearImagesBtn').addEventListener('click', () => {
    chrome.storage.local.set({ blockedImages: [] }, () => {
        document.getElementById('imgCount').textContent = '0';
        notifyContentScript();
    });
});

document.getElementById('resetBtn').addEventListener('click', () => {
    document.getElementById('include').value = '';
    document.getElementById('exclude').value = '';
    document.getElementById('saveBtn').click();
});