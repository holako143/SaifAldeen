// شفرينش - Global State
// This file initializes all the global variables used across the application modules.

// ========== Global State Variables ==========

// --- Settings ---
// Default application settings, can be overridden by user's saved settings.
let appSettings = {
    theme: 'auto', // 'auto', 'light', 'dark'
    fontSize: '16px',
    themeColor: 'default',
    autoSave: true,
    saveHistory: true,
    autoCopyEncodedEmoji: true,
    autoCopyDecodedText: false,
    showNotifications: true,
    encryptionStrength: 'high', // 'low', 'medium', 'high'
};

// --- Character & Emoji Management ---
// Default list of emojis for the selector.
const defaultEmojis = [
    '😀', '😂', '👍', '❤️', '🚀', '🌟', '💡', '🔥', '✅', '⚠️',
    '🔒', '🔑', '🤖', '💻', '🌐', '✉️', '📁', '📈', '💡', '🤔'
];
// The active list of emojis, starts with the default set.
let emojiList = [...defaultEmojis];
// The list of alphanumeric characters for the alternative character set.
let alphanumericChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.split('');
// The currently selected emoji/character for encoding.
let currentActiveChar = emojiList[0];
// Flags to manage which character set is in use.
let useAlphanumeric = false;
let managingAlphanumeric = false;

// --- App Mode & History ---
// Flag for batch processing mode.
let batchMode = false;
// Array to store history of operations.
let historyItems = [];
// Current filter for the history view.
let historyFilter = 'all'; // 'all', 'encode', 'decode'

// --- Crypto Worker & Payloads ---
// Variables for managing the cryptography web worker.
let cryptoWorker = null;
let workerInitialized = false;
const _workerPromises = {};
let messageId = 0;
// Global text encoder and decoder.
const encoder = new TextEncoder();
const decoder = new TextDecoder();
// Unique markers for parsing the encrypted payload.
const HEADER_MARKER = '::S2FALT::';
const SEPARATOR = '::S2FSEP::';

// --- UI State ---
// Variables to track the state of the UI.
let currentTheme = 'light';
let isSidebarOpen = false;

// ========== Helper Functions ==========
// Shortcut for document.getElementById
const $ = (selector) => document.getElementById(selector);
