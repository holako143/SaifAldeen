// =================================================================================================
//                                    STORAGE MANAGEMENT
// =================================================================================================
// This file handles all interactions with the browser's localStorage.
// It's responsible for saving and loading application settings, history, and custom data.

// --- Constants ---
const SETTINGS_KEY = 'shafresh_settings';
const HISTORY_KEY = 'shafresh_history';
const EMOJI_LIST_KEY = 'shafresh_emoji_list';
const ALPHANUMERIC_LIST_KEY = 'shafresh_alphanumeric_list';


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
    }
}

/**
 * Adds a new item to the history and saves it.
 * Note: This function no longer calls the UI update directly.
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
    history.unshift(newItem);
    if (history.length > 100) {
        history.pop();
    }
    saveHistory();
}

/**
 * Saves the current list of emojis to localStorage.
 */
function saveEmojiList() {
    try {
        localStorage.setItem(EMOJI_LIST_KEY, JSON.stringify(emojiList));
    } catch (e) {
        console.error("Error saving emoji list:", e);
    }
}

/**
 * Loads the list of emojis from localStorage.
 */
function loadEmojiList() {
    try {
        const savedEmojis = localStorage.getItem(EMOJI_LIST_KEY);
        if (savedEmojis) {
            emojiList = JSON.parse(savedEmojis);
            if (!Array.isArray(emojiList) || emojiList.length === 0) {
                emojiList = [...defaultEmojis];
            }
        } else {
            emojiList = [...defaultEmojis];
        }
    } catch (e) {
        console.error("Error loading emoji list:", e);
        emojiList = [...defaultEmojis];
    }
}

/**
 * Saves the current list of alphanumeric characters to localStorage.
 */
function saveAlphanumericList() {
    try {
        localStorage.setItem(ALPHANUMERIC_LIST_KEY, JSON.stringify(alphanumericChars));
    } catch (e) {
        console.error("Error saving alphanumeric list:", e);
    }
}

/**
 * Loads the list of alphanumeric characters from localStorage.
 */
function loadAlphanumericList() {
    try {
        const savedChars = localStorage.getItem(ALPHANUMERIC_LIST_KEY);
        if (savedChars) {
            alphanumericChars = JSON.parse(savedChars);
            if (!Array.isArray(alphanumericChars) || alphanumericChars.length === 0) {
                alphanumericChars = [...defaultAlphanumericChars];
            }
        } else {
            alphanumericChars = [...defaultAlphanumericChars];
        }
    } catch (e) {
        console.error("Error loading alphanumeric list:", e);
        alphanumericChars = [...defaultAlphanumericChars];
    }
}
