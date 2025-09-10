// =================================================================================================
//                                    STATE MANAGEMENT
// =================================================================================================
// This file contains the global state variables for the Shafresh application.
// It's crucial that this script is loaded before any other application script.

// --- Application Settings ---
// These are the default settings. They are loaded from and saved to localStorage by storage.js.
let appSettings = {
    theme: 'default',
    darkMode: false,
    autoTheme: true,
    fontSize: '16px',
    useCompression: true,
    autoCopyEncoded: true,
    autoCopyDecoded: true,
    showNotifications: true,
    encryptionStrength: 'high',
    useEncryption: false,
    charSet: 'emoji' // 'emoji' or 'alphanumeric'
};

// --- Core Data ---
// These variables hold the application's core data structures.
let emojiList = []; // Holds the list of available emojis/characters for encoding.
let customEmojiList = []; // Holds user-added custom emojis.
let history = []; // Holds a record of encoding/decoding operations.

// --- UI State ---
// These variables track the current state of the user interface.
let isSidebarOpen = false;
let currentTab = 'cipher'; // The currently active tab in the sidebar/main view.
let activeCard = 'emoji-card'; // The card that is currently swapped in the main view.
let qrScanner = null; // Holds the jsQR scanner instance.
let activeToast = null; // Tracks the currently displayed toast notification.
let isBatchMode = false; // Flag for batch processing mode.
let isDarkMode = false; // Tracks the current dark mode state.
let currentTheme = 'default'; // Tracks the current theme.
let currentFontSize = '16px'; // Tracks the current font size.

// --- Constants ---
// These are constants used throughout the application.
const EMOJI_VERSION = '15.0';
const APP_VERSION = '2.0.0';
const GITHUB_URL = 'https://github.com/holako143/SaifAldeen';

// Default emoji list (a small subset for fallback)
const DEFAULT_EMOJI_LIST = [
    '😀', '😂', '😍', '🤔', '😎', '😢', '👍', '👎', '❤️', '🔥', '🚀', '🌟', '🎉', '💡', '💻', '📱'
];

// Default character set for alphanumeric encoding
const ALPHANUMERIC_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

// --- Flags ---
// Boolean flags to control application flow.
let isProcessing = false; // Prevents multiple operations from running at once.
let worker; // The crypto worker instance.
let workerReady = false; // Flag to indicate if the crypto worker is ready.
let workerPromises = {}; // To track promises for worker messages.
let nextWorkerId = 0; // To generate unique IDs for worker messages.
