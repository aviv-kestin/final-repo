chrome.runtime.sendMessage({ command: "injectTone" });

let synth, lfo, gain;
let droneSynth, droneGain, droneInterval;
let keySynth;
let audioActive = false; 
let isPlaying = false;
let dronePlaying = false;
let lastScrollY = 0;
let scrollTimeout;
const pressedKeys = new Map();

function initializeSynthExtension() {
    console.log("Initializing synth components...");

    if (synth) {
        console.log("Synth components already initialized.");
        return;
    }

    gain = new Tone.Gain(0).toDestination();
    synth = new Tone.MonoSynth({
        oscillator: { type: "triangle" },
        filter: { type: "lowpass", frequency: 50, Q: 1 },
        envelope: { attack: 0.1, decay: 0.1, sustain: 1, release: 0.5 },
    }).connect(gain);

    lfo = new Tone.LFO({ type: "sine", frequency: 0, min: 0, max: 0.6 }).connect(gain.gain);
    lfo.start();

    const reverb = new Tone.Reverb({ decay: 5, wet: 0.8 }).toDestination();
    keySynth = new Tone.PolySynth(Tone.Synth, { oscillator: { type: "sine" } }).connect(reverb);

    setupKeyboardListeners();
    setupScrollListener();
    setupButtonListeners(); 

    console.log("Synth components initialized!");
}

function toggleDrone() {
    if (!audioActive) {
        console.log("Audio is not active. Cannot toggle drone.");
        return;
    }

    if (!droneGain) {
        droneGain = new Tone.Gain(0.6).toDestination();
        const reverb = new Tone.Reverb({ decay: 250, wet: 0.9 });
        const postReverbGain = new Tone.Gain(0.4);
        reverb.connect(postReverbGain);
        postReverbGain.connect(droneGain);
        droneSynth = new Tone.Oscillator({ type: "triangle", frequency: 0 }).connect(reverb);
    }

    if (!dronePlaying) {
        console.log("Starting drone...");
        droneSynth.start();
        const pitches = ["F2", "G2", "D3", "C3"];
        let index = 0;

        const playNote = () => {
            const frequency = Tone.Frequency(pitches[index]).toFrequency();
            droneSynth.frequency.rampTo(frequency, 1);
            setTimeout(() => droneSynth.frequency.rampTo(0, 0.5), 3000);
            index = (index + 1) % pitches.length;
        };

        playNote();
        droneInterval = setInterval(playNote, 8000);
        dronePlaying = true;
    } else {
        console.log("Stopping drone...");
        clearInterval(droneInterval);
        droneSynth.stop();
        droneGain.gain.rampTo(0, 0.5);
        dronePlaying = false;

        setTimeout(() => {
            droneSynth.dispose();
            droneGain.dispose();
            droneSynth = null;
            droneGain = null;
        }, 1000);
    }
}

function setupKeyboardListeners() {
    console.log("Setting up keyboard listeners...");
    window.addEventListener("keydown", (event) => {
        console.log(`Key down event: ${event.key}`);
        if (!keySynth || !audioActive || pressedKeys.has(event.key)) return;
        const notes = ["D3", "F4", "A4", "D5", "E5", "F5", "A6"];
        const randomNote = notes[Math.floor(Math.random() * notes.length)];
        pressedKeys.set(event.key, randomNote);
        keySynth.triggerAttack(randomNote);
    });

    window.addEventListener("keyup", (event) => {
        console.log(`Key up event: ${event.key}`);
        if (!keySynth || !audioActive || !pressedKeys.has(event.key)) return;
        const note = pressedKeys.get(event.key);
        keySynth.triggerRelease(note);
        pressedKeys.delete(event.key);
    });

    console.log("Keyboard listeners set up!");
}

function setupScrollListener() {
    console.log("Setting up scroll listener...");
    window.addEventListener("scroll", () => {
        console.log("Scroll detected!");
        if (!synth || !lfo || !gain || !audioActive) return;

        const currentScrollY = window.scrollY;
        const scrollSpeed = Math.abs(currentScrollY - lastScrollY) || 0;
        console.log(`Scroll speed: ${scrollSpeed}`);
        const mappedLFOFrequency = map(scrollSpeed, 0, 100, 0, 40);
        lfo.frequency.value = mappedLFOFrequency;

        if (scrollSpeed > 0) {
            if (!isPlaying) {
                console.log("Scroll triggered sound.");
                synth.triggerAttack("C4");
                isPlaying = true;
            }
        }

        clearTimeout(scrollTimeout); // Clear any existing timeout
        scrollTimeout = setTimeout(() => {
            if (isPlaying) {
                console.log("Scroll released sound.");
                synth.triggerRelease();
                isPlaying = false;
                setTimeout(() => (gain.gain.value = 0), 1000); // Fade out after release
            }
        }, 150);

        const mappedCutoff = map(scrollSpeed, 0, 100, 50, 5000);
        const mappedResonance = map(scrollSpeed, 0, 100, 1, 10);
        synth.filter.set({ frequency: mappedCutoff, Q: mappedResonance });
        lastScrollY = currentScrollY;
    });

    console.log("Scroll listener set up!");
}

function setupButtonListeners() {
    console.log("Setting up button listeners...");
    document.querySelectorAll("button").forEach((button) => {
        button.addEventListener("click", () => {
            if (!keySynth || !audioActive) return;
            const notes = ["D4", "E4", "G4", "Bb4", "F5", "G5"];
            const randomNote = notes[Math.floor(Math.random() * notes.length)];
            console.log(`Button clicked, playing note: ${randomNote}`);
            keySynth.triggerAttackRelease(randomNote, "0.3");
        });
    });
    console.log("Button listeners set up!");
}

function map(value, inMin, inMax, outMin, outMax) {
    if (typeof value !== "number" || isNaN(value)) return outMin;
    return Math.max(outMin, Math.min(outMax, ((value - inMin) * (outMax - inMin)) / (inMax - inMin) + outMin));
}

// Handle messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Message received in content script:", message);

    if (message.command === "TONE_READY") {
        console.log("Tone.js is ready in the page context.");
        initializeSynthExtension();
        sendResponse({ success: true });
    } else if (message.command === "initializeTone") {
        Tone.start()
            .then(() => {
                console.log("AudioContext started!");
                if (!audioActive) initializeSynthExtension(); // Initialize only once
                audioActive = !audioActive; // Toggle audioActive state
                console.log("Audio active state toggled:", audioActive);
                sendResponse({ success: true });
            })
            .catch((err) => {
                console.error("Error starting AudioContext:", err);
                sendResponse({ success: false });
            });
    } else if (message.command === "toggleDrone") {
        toggleDrone();
        sendResponse({ success: true });
    } else {
        console.error("Unknown command:", message.command);
        sendResponse({ success: false });
    }
});
