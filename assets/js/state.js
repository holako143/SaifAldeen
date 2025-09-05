import { showToast } from './ui.js';

export let defaultEmojis = ['😎', '✨', '❤️', '🔒', '🔥', '🌟', '🎯', '💡', '🚀', '💎', '📌', '✅', '⚡', '🌈', '🌠'];

export let appSettings = {
    theme: 'auto',
    themeColor: 'default',
    fontSize: '16px',
    fontFamily: 'system',
    showNotifications: true,
    autoSave: true,
    saveHistory: true,
    autoCopyEncodedEmoji: true,
    autoCopyDecodedText: true,
    encryptionStrength: 'high',
    compressionLevel: 'auto'
};

export let emojiList = [...defaultEmojis];
export let historyItems = [];
export let currentActiveEmoji = defaultEmojis[0];

export function saveSettings() {
    if (appSettings.autoSave) {
        localStorage.setItem('emojiCipher_settings', JSON.stringify(appSettings));
    }
}

export function loadSettings() {
    const saved = localStorage.getItem('emojiCipher_settings');
    if (saved) {
        try {
            appSettings = { ...appSettings, ...JSON.parse(saved) };
        } catch (e) {
            console.error('Error loading settings:', e);
        }
    }
}

export function saveEmojis() {
    localStorage.setItem('emojiCipher_emojis', JSON.stringify(emojiList));
}

export function loadEmojis() {
    const saved = localStorage.getItem('emojiCipher_emojis');
    if (saved) {
        try {
            emojiList = JSON.parse(saved);
            if (emojiList.length === 0) {
                emojiList = [...defaultEmojis];
            }
        } catch (e) {
            console.error('Error loading emojis:', e);
            emojiList = [...defaultEmojis];
        }
    }
    currentActiveEmoji = emojiList[0];
}

export function saveHistory() {
    if (appSettings.saveHistory) {
        localStorage.setItem('emojiCipher_history', JSON.stringify(historyItems));
    }
}

export function loadHistory() {
    const saved = localStorage.getItem('emojiCipher_history');
    if (saved) {
        try {
            historyItems = JSON.parse(saved);
        } catch (e) {
            console.error('Error loading history:', e);
            historyItems = [];
        }
    }
}

export function addToHistory(text, result, operation) {
    if (!appSettings.saveHistory || operation === 'decode') return;

    const timestamp = new Date().toISOString();
    historyItems.unshift({
        text: text.substring(0, 100),
        result,
        timestamp,
        operation
    });

    if (historyItems.length > 50) {
        historyItems = historyItems.slice(0, 50);
    }

    saveHistory();
    // renderHistory() will be called from ui.js
}

export function clearHistory() {
    if (confirm('هل أنت متأكد من رغبتك في مسح السجل؟')) {
        historyItems = [];
        saveHistory();
        // renderHistory() will be called from ui.js
        showToast('تم مسح السجل بنجاح');
    }
}

export function resetEmojiList() {
    if (confirm('هل أنت متأكد من رغبتك في إعادة تعيين قائمة الإيموجي؟')) {
        emojiList = [...defaultEmojis];
        setActiveEmoji(defaultEmojis[0]);
        // renderEmojis() will be called from ui.js
        saveEmojis();
        showToast('تم إعادة تعيين قائمة الإيموجي');
    }
}

export function addNewEmoji(emoji) {
    if (!emoji || emoji.trim() === '') {
        showToast('يرجى إدخال إيموجي صحيح', 'error');
        return;
    }

    emoji = emoji.trim();

    if (emojiList.includes(emoji)) {
        showToast('هذا الإيموجي موجود بالفعل', 'error');
        return;
    }

    emojiList.unshift(emoji);
    setActiveEmoji(emoji);
    // renderEmojis() will be called from ui.js
    saveEmojis();
    showToast('تم إضافة الإيموجي بنجاح');

    const newEmojiInput = document.getElementById('newEmoji');
    const customCharInput = document.getElementById('customChar');
    if (newEmojiInput) newEmojiInput.value = '';
    if (customCharInput) customCharInput.value = '';
}

export function removeEmoji(emoji) {
    if (emojiList.length <= 1) {
        showToast('يجب أن تبقى إيموجي واحدة على الأقل', 'error');
        return;
    }

    emojiList = emojiList.filter(e => e !== emoji);

    if (currentActiveEmoji === emoji) {
        setActiveEmoji(emojiList[0]);
    }

    // renderEmojis() will be called from ui.js
    saveEmojis();
    showToast('تم حذف الإيموجي بنجاح');
}

export function setActiveEmoji(emoji) {
    currentActiveEmoji = emoji;
    document.querySelectorAll('.emoji-item').forEach(el => {
        el.classList.toggle('active', el.textContent === emoji);
    });
}
