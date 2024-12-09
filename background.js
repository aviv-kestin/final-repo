
chrome.runtime.onInstalled.addListener(() => {
    console.log("Extension installed!");
});

chrome.tabs.onActivated.addListener(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                files: ["content.js"]
            });
        }
    });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Background received message:", message);

    if (message.command === "injectTone") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length > 0) {
                chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    files: ["Tone.js"],
                }, () => {
                    console.log("Tone.js script injected successfully.");
                    chrome.tabs.sendMessage(tabs[0].id, { command: "TONE_READY" });
                });
            }
        });
    } else if (message.command === "initializeTone") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length > 0) {
                chrome.tabs.sendMessage(tabs[0].id, { command: "initializeTone" });
            }
        });
    } else if (message.command === "toggleDrone") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length > 0) {
                chrome.tabs.sendMessage(tabs[0].id, { command: "toggleDrone" });
            }
        });
    }

    return true;
});

