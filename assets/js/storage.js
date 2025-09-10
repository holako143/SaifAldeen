// =================================================================================================
//                                    STORAGE MANAGEMENT
// =================================================================================================
// This file handles all interactions with the browser's localStorage.
// It's responsible for saving and loading application settings, history, and custom data.

// --- Constants ---
const SETTINGS_KEY = 'shafresh_settings';
const HISTORY_KEY = 'shafresh_history';
const CUSTOM_EMOJI_KEY = 'shafresh_custom_emojis';

/**
 * Saves the current application settings to localStorage.
 */
function saveSettings() {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(appSettings));
    } catch (e) {
        console.error("Error saving settings to localStorage:", e);
        showToast("فشل حفظ الإعدادات. قد تكون مساحة التخزين ممتلئة.", "error");
    }
}

/**
 * Loads application settings from localStorage. If no settings are found,
 * it initializes with the default settings from state.js.
 */
function loadSettings() {
    try {
        const savedSettings = localStorage.getItem(SETTINGS_KEY);
        if (savedSettings) {
            // Merge saved settings with defaults to ensure new settings are not missed
            const parsedSettings = JSON.parse(savedSettings);
            appSettings = { ...appSettings, ...parsedSettings };
        }
    } catch (e) {
        console.error("Error loading settings from localStorage:", e);
        showToast("فشل تحميل الإعدادات. سيتم استخدام الإعدادات الافتراضية.", "error");
    }
}

/**
 * Saves the entire history array to localStorage.
 */
function saveHistory() {
    try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
        console.error("Error saving history to localStorage:", e);
        showToast("فشل حفظ السجل. قد تكون مساحة التخزين ممتلئة.", "error");
    }
}

/**
 * Loads the history array from localStorage.
 */
function loadHistory() {
    try {
        const savedHistory = localStorage.getItem(HISTORY_KEY);
        if (savedHistory) {
            history = JSON.parse(savedHistory);
        }
    } catch (e) {
        console.error("Error loading history from localStorage:", e);
        history = []; // Reset history on parsing error
        showToast("فشل تحميل السجل. قد يكون تالفًا.", "error");
    }
}

/**
 * Adds a new item to the history and saves it.
 * @param {string} type - The type of operation ('encode' or 'decode').
 * @param {string} original - The original text.
 * @param {string} result - The resulting text.
 */
function addHistoryItem(type, original, result) {
    const newItem = {
        id: Date.now(),
        type,
        original,
        result,
        date: new Date().toISOString()
    };
    // Add to the beginning of the array
    history.unshift(newItem);
    // Limit history to 100 items to prevent excessive storage use
    if (history.length > 100) {
        history.pop();
    }
    saveHistory();
    updateHistoryUI(); // This function is in history.js
}

/**
 * Clears the entire history from the state and localStorage.
 */
function clearHistory() {
    history = [];
    saveHistory();
    updateHistoryUI();
    showToast("تم مسح السجل بنجاح.", "success");
}

/**
 * Saves the list of custom emojis to localStorage.
 */
function saveCustomEmojis() {
    try {
        localStorage.setItem(CUSTOM_EMOJI_KEY, JSON.stringify(customEmojiList));
    } catch (e) {
        console.error("Error saving custom emojis:", e);
    }
}

/**
 * Loads the list of custom emojis from localStorage.
 */
function loadCustomEmojis() {
    try {
        const savedEmojis = localStorage.getItem(CUSTOM_EMOJI_KEY);
        if (savedEmojis) {
            customEmojiList = JSON.parse(savedEmojis);
        } else {
            customEmojiList = [...DEFAULT_EMOJI_LIST]; // Initialize with defaults if none saved
        }
    } catch (e) {
        console.error("Error loading custom emojis:", e);
        customEmojiList = [...DEFAULT_EMOJI_LIST]; // Reset on error
    }
}
