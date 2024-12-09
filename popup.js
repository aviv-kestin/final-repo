document.getElementById("initialize-button").addEventListener("click", () => {
    chrome.runtime.sendMessage({ command: "initializeTone" }, (response) => {
        if (response && response.success) {
            console.log("Tone.js initialized!");
            toggleOutline(true); 
        } else {
            console.error("Failed to initialize Tone.js", response?.error);
            toggleOutline(false); 
        }
    });
});

document.getElementById("toggle-drone-button").addEventListener("click", () => {
    chrome.runtime.sendMessage({ command: "toggleDrone" }, (response) => {
        if (response && response.success) {
            console.log("Drone toggled!");
        } else {
            console.error("Failed to toggle drone", response?.error);
        }
    });
});

function toggleOutline(show) {
    const outline = document.getElementById("outline");
    if (show) {
        outline.style.opacity = "1"; 
    } else {
        outline.style.opacity = "0"; 
    }
}


console.log("Popup script loaded and ready!");
