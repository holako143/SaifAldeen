// --- Start of bundle.js ---

// --- From assets/js/modules/config.js ---
const defaultEmojis = ['😎', '✨', '❤️', '🔒', '🔥', '🌟', '🎯', '💡', '🚀', '💎', '📌', '✅', '⚡', '🌈', '🌠'];
const HEADER_MARKER = '\u061C';
const SEPARATOR = '\u034F';
const VARIATION_SELECTOR_START = 0xfe00;
const VARIATION_SELECTOR_END = 0xfe0f;
const VARIATION_SELECTOR_SUPPLEMENT_START = 0xe0100;
const VARIATION_SELECTOR_SUPPLEMENT_END = 0xe01ef;

// --- From assets/js/modules/dom.js ---
const $ = (id) => document.getElementById(id);
const elements = {
    encodeBtn: $('encodeBtn'),
    decodeBtn: $('decodeBtn'),
    deleteBtn: $('deleteBtn'),
    pasteBtn: $('pasteBtn'),
    copyBtn: $('copyBtn'),
    shareBtn: $('shareBtn'),
    resetBtn: $('resetBtn'),
    toggleThemeBtn: $('toggleTheme'),
    menuToggle: $('menuToggle'),
    closeSidebar: $('closeSidebar'),
    addCustomEmoji: $('addCustomEmoji'),
    addEmojiBtn: $('addEmojiBtn'),
    resetEmoji: $('resetEmoji'),
    clearHistory: $('clearHistory'),
    togglePassword: $('togglePassword'),
    inputText: $('inputText'),
    output: $('output'),
    customChar: $('customChar'),
    newEmoji: $('newEmoji'),
    password: $('password'),
    customIterations: $('customIterations'),
    encryptionStrength: $('encryptionStrength'),
    themeSelector: $('themeSelector'),
    fontSizeSelector: $('fontSizeSelector'),
    useCompression: $('useCompression'),
    useEncrypt: $('useEncrypt'),
    autoCopyEncodedEmoji: $('autoCopyEncodedEmoji'),
    autoCopyDecodedText: $('autoCopyDecodedText'),
    showNotifications: $('showNotifications'),
    useCustomIterations: $('useCustomIterations'),
    autoThemeToggle: $('autoThemeToggle'),
    darkThemeToggle: $('darkThemeToggle'),
    charCount: $('charCount'),
    sizeEstimate: $('sizeEstimate'),
    originalSize: $('originalSize'),
    compressedSize: $('compressedSize'),
    passwordStrength: $('passwordStrength'),
    resultsSection: $('resultsSection'),
    passwordSection: $('passwordSection'),
    customIterationsSection: $('customIterationsSection'),
    emojiSlider: $('emojiSlider'),
    customEmojiList: $('customEmojiList'),
    historyList: $('historyList'),
    emptyHistory: $('emptyHistory'),
    historyCount: $('historyCount'),
    toastContainer: $('toastContainer'),
    sidebar: document.querySelector('.sidebar'),
    sidebarOverlay: document.querySelector('.sidebar-overlay'),
    logo: document.querySelector('.logo'),
};

// --- From assets/js/modules/crypto.js ---
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: false, ignoreBOM: true });
function getEncoder() { return encoder; }
function getDecoder() { return decoder; }
function bytesToBase64(bytes) {
    const binString = String.fromCodePoint(...bytes);
    return btoa(binString);
}
function base64ToBytes(base64) {
    const binString = atob(base64);
    return Uint8Array.from(binString, m => m.codePointAt(0));
}
function toVariationSelector(byte) {
    if (byte >= 0 && byte < 16) {
        return String.fromCodePoint(VARIATION_SELECTOR_START + byte);
    } else if (byte >= 16 && byte < 256) {
        return String.fromCodePoint(VARIATION_SELECTOR_SUPPLEMENT_START + byte - 16);
    }
    return null;
}
function fromVariationSelector(codePoint) {
    if (codePoint >= VARIATION_SELECTOR_START && codePoint <= VARIATION_SELECTOR_END) {
        return codePoint - VARIATION_SELECTOR_START;
    } else if (codePoint >= VARIATION_SELECTOR_SUPPLEMENT_START && codePoint <= VARIATION_SELECTOR_SUPPLEMENT_END) {
        return codePoint - VARIATION_SELECTOR_SUPPLEMENT_START + 16;
    }
    return null;
}
function encodeBytesToEmoji(emoji, bytes) {
    let encoded = emoji;
    for (const byte of bytes) {
        encoded += toVariationSelector(byte);
    }
    return encoded;
}
function decodeEmojiToBytes(text) {
    let decoded = [];
    const chars = Array.from(text);
    let startIndex = 0;
    for (let i = 0; i < chars.length; i++) {
        const byte = fromVariationSelector(chars[i].codePointAt(0));
        if (byte === null) {
            startIndex = i + 1;
            break;
        }
    }
    for (let i = startIndex; i < chars.length; i++) {
        const char = chars[i];
        const byte = fromVariationSelector(char.codePointAt(0));
        if (byte !== null) {
            decoded.push(byte);
        } else {
            break;
        }
    }
    return new Uint8Array(decoded);
}
class AdvancedCompression {
    static compress(text) {
        if (!text || text.length === 0) return new Uint8Array([]);
        try {
            const textBytes = encoder.encode(text);
            return this.simpleRunLengthCompress(textBytes);
        } catch (error) {
            console.error('Compression error:', error);
            return encoder.encode(text);
        }
    }
    static decompress(data) {
        if (!data || data.length === 0) return '';
        try {
            const decompressed = this.simpleRunLengthDecompress(data);
            return decoder.decode(decompressed);
        } catch (error) {
            console.error('Decompression error:', error);
            try {
                return decoder.decode(data);
            } catch (e) {
                console.error('Fallback decode error:', e);
                return '';
            }
        }
    }
    static simpleRunLengthCompress(data) {
        const result = [];
        let i = 0;
        while (i < data.length) {
            let count = 1;
            while (i + count < data.length && data[i + count] === data[i] && count < 255) {
                count++;
            }
            if (count > 2) {
                result.push(255, count, data[i]);
            } else {
                for (let j = 0; j < count; j++) {
                    if (data[i] === 255) {
                        result.push(255, 1, 255);
                    } else {
                        result.push(data[i]);
                    }
                }
            }
            i += count;
        }
        return new Uint8Array(result);
    }
    static simpleRunLengthDecompress(data) {
        const result = [];
        let i = 0;
        while (i < data.length) {
            if (data[i] === 255 && i + 1 < data.length) {
                const count = data[i + 1];
                const value = data[i + 2];
                for (let j = 0; j < count; j++) {
                    result.push(value);
                }
                i += 3;
            } else {
                result.push(data[i]);
                i++;
            }
        }
        return new Uint8Array(result);
    }
}
class AdvancedEncryption {
    static async generateKey(password, salt, iterations) {
        const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']);
        return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    }
    static async encrypt(data, password, iterations) {
        const salt = crypto.getRandomValues(new Uint8Array(32));
        const iv = crypto.getRandomValues(new Uint8Array(16));
        const key = await this.generateKey(password, salt, iterations);
        const additionalData = encoder.encode('EmojiCipherPro-v2.1');
        const encryptedData = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData }, key, data);
        return { encrypted: new Uint8Array(encryptedData), salt: salt, iv: iv, iterations: iterations };
    }
    static async decrypt(encryptedData, salt, iv, password, iterations) {
        const key = await this.generateKey(password, salt, iterations);
        const additionalData = encoder.encode('EmojiCipherPro-v2.1');
        const decryptedData = await crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData }, key, encryptedData);
        return new Uint8Array(decryptedData);
    }
}
class AdvancedCRC {
    static crc32Table = (() => {
        const table = new Uint32Array(256);
        for (let i = 0; i < 256; i++) {
            let c = i;
            for (let j = 0; j < 8; j++) {
                c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
            }
            table[i] = c;
        }
        return table;
    })();
    static calculate(str) {
        const bytes = encoder.encode(str);
        let crc = 0 ^ (-1);
        for (let i = 0; i < bytes.length; i++) {
            crc = (crc >>> 8) ^ this.crc32Table[(crc ^ bytes[i]) & 0xFF];
        }
        return (crc ^ (-1)) >>> 0;
    }
}

// --- From assets/js/modules/state.js ---
const defaultAppSettings = {
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
let appSettings = { ...defaultAppSettings };
let emojiList = [...defaultEmojis];
let historyItems = [];
let currentActiveEmoji = defaultEmojis[0];
function setActiveEmoji(emoji) {
    currentActiveEmoji = emoji;
}
function saveSettings() {
    if (appSettings.autoSave) {
        localStorage.setItem('emojiCipher_settings', JSON.stringify(appSettings));
    }
}
function loadSettings() {
    const saved = localStorage.getItem('emojiCipher_settings');
    if (saved) {
        try {
            const parsedSettings = JSON.parse(saved);
            appSettings = { ...defaultAppSettings, ...parsedSettings };
        } catch (e) {
            console.error('Error loading settings:', e);
            appSettings = { ...defaultAppSettings };
        }
    }
}
function saveEmojis() {
    localStorage.setItem('emojiCipher_emojis', JSON.stringify(emojiList));
}
function loadEmojis() {
    const saved = localStorage.getItem('emojiCipher_emojis');
    if (saved) {
        try {
            const parsedEmojis = JSON.parse(saved);
            if (Array.isArray(parsedEmojis) && parsedEmojis.length > 0) {
                emojiList = parsedEmojis;
            } else {
                emojiList = [...defaultEmojis];
            }
        } catch (e) {
            console.error('Error loading emojis:', e);
            emojiList = [...defaultEmojis];
        }
    }
    currentActiveEmoji = emojiList[0];
}
function saveHistory() {
    if (appSettings.saveHistory) {
        localStorage.setItem('emojiCipher_history', JSON.stringify(historyItems));
    }
}
function loadHistory() {
    const saved = localStorage.getItem('emojiCipher_history');
    if (saved) {
        try {
            const parsedHistory = JSON.parse(saved);
            if (Array.isArray(parsedHistory)) {
                historyItems = parsedHistory;
            }
        } catch (e) {
            console.error('Error loading history:', e);
            historyItems = [];
        }
    }
}
function resetAppSettings() {
    localStorage.removeItem('emojiCipher_settings');
    localStorage.removeItem('emojiCipher_history');
    localStorage.removeItem('emojiCipher_emojis');
    location.reload();
}

// --- From assets/js/modules/ui.js ---
function showToast(message, type = 'success', duration = 3000) {
    if (!appSettings.showNotifications || !elements.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const iconClass = {
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle',
        warning: 'fa-exclamation-triangle',
    }[type] || 'fa-check-circle';
    toast.innerHTML = `<div class="icon"><i class="fas ${iconClass}"></i></div><div class="message">${message}</div><button class="close-btn"><i class="fas fa-times"></i></button>`;
    toast.querySelector('.close-btn').onclick = () => toast.remove();
    elements.toastContainer.appendChild(toast);
    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px)';
            setTimeout(() => toast.remove(), 300);
        }
    }, duration);
}
function updateCharCount() {
    if (!elements.inputText || !elements.charCount || !elements.sizeEstimate) return;
    const text = elements.inputText.value;
    elements.charCount.textContent = text.length;
    elements.sizeEstimate.textContent = `~${new TextEncoder().encode(text).length} بايت`;
}
function updateStats(originalSize, compressedSize) {
    if (elements.originalSize) elements.originalSize.textContent = `${originalSize} بايت`;
    if (elements.compressedSize) {
        elements.compressedSize.textContent = `${compressedSize} بايت`;
        if (originalSize > 0 && compressedSize > 0 && originalSize > compressedSize) {
            const ratio = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
            elements.compressedSize.textContent += ` (${ratio}% توفير)`;
        }
    }
}
function showResultsSection(show = true) {
    if (!elements.resultsSection) return;
    elements.resultsSection.style.display = show ? 'block' : 'none';
    if (show) {
        elements.resultsSection.classList.remove('hidden');
        setTimeout(() => elements.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
    }
}
async function copyToClipboard(text, feedbackElement) {
    if (!text) return showToast('لا يوجد نص للنسخ', 'warning');
    try {
        await navigator.clipboard.writeText(text);
        showToast('تم نسخ النص إلى الحافظة');
        if (feedbackElement) {
            const originalHTML = feedbackElement.innerHTML;
            feedbackElement.innerHTML = '<i class="fas fa-check"></i> تم النسخ';
            feedbackElement.disabled = true;
            setTimeout(() => {
                feedbackElement.innerHTML = originalHTML;
                feedbackElement.disabled = false;
            }, 2000);
        }
    } catch (err) {
        console.error('Copy failed:', err);
        showToast('فشل في نسخ النص', 'error');
    }
}
function renderEmojis() {
    if (!elements.emojiSlider) return;
    elements.emojiSlider.innerHTML = '';
    emojiList.forEach(emoji => {
        const emojiEl = document.createElement('div');
        emojiEl.className = 'emoji-item';
        emojiEl.textContent = emoji;
        emojiEl.title = `استخدام ${emoji} كحاوية للتشفير`;
        emojiEl.dataset.emoji = emoji;
        if (emoji === currentActiveEmoji) emojiEl.classList.add('active');
        elements.emojiSlider.appendChild(emojiEl);
    });
    renderCustomEmojiList();
}
function updateActiveEmojiUI(emoji) {
    document.querySelectorAll('.emoji-item').forEach(el => {
        el.classList.toggle('active', el.textContent === emoji);
    });
}
function renderCustomEmojiList() {
    if (!elements.customEmojiList) return;
    elements.customEmojiList.innerHTML = '';
    if (emojiList.length === 0) {
        elements.customEmojiList.innerHTML = '<p style="text-align:center;color:#64748b;padding:2rem;">لا توجد إيموجيات</p>';
        return;
    }
    emojiList.forEach(emoji => {
        const emojiRow = document.createElement('div');
        emojiRow.className = 'emoji-row';
        emojiRow.draggable = true;
        emojiRow.dataset.emoji = emoji;
        emojiRow.innerHTML = `<div class="emoji-handle"><i class="fas fa-grip-vertical"></i>${emoji}</div><button class="delete-emoji-btn" title="حذف الإيموجي"><i class="fas fa-trash"></i></button>`;
        elements.customEmojiList.appendChild(emojiRow);
    });
}
function renderHistory() {
    if (!elements.historyList || !elements.emptyHistory || !elements.historyCount) return;
    elements.historyList.innerHTML = '';
    const items = historyItems;
    if (items.length === 0) {
        elements.emptyHistory.style.display = 'block';
        elements.historyCount.textContent = '0 عنصر محفوظ';
        return;
    }
    elements.emptyHistory.style.display = 'none';
    elements.historyCount.textContent = `${items.length} عنصر محفوظ`;
    items.forEach((item, index) => {
        const historyItemEl = document.createElement('div');
        historyItemEl.className = 'history-item';
        historyItemEl.dataset.index = index;
        const date = new Date(item.timestamp).toLocaleString('ar-EG');
        historyItemEl.innerHTML = `<div class="history-item-meta"><div class="history-item-date">${date}</div><div class="history-item-op">تشفير</div></div><div class="history-item-text">${item.text}${item.text.length >= 100 ? '...' : ''}</div><div class="history-item-emoji">${item.result.substring(0, 1)}</div>`;
        elements.historyList.appendChild(historyItemEl);
    });
}
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    const targetTab = $(`${tabName}Tab`);
    if (targetTab) targetTab.classList.add('active');
    document.querySelectorAll('.sidebar-tab').forEach(tab => tab.classList.toggle('active', tab.dataset.tab === tabName));
    if (window.innerWidth <= 768) closeSidebar();
}
function openSidebar() {
    if (elements.sidebar) elements.sidebar.classList.add('open');
    document.body.classList.add('sidebar-open');
    if (elements.sidebarOverlay) {
        elements.sidebarOverlay.classList.add('active');
    }
}
function closeSidebar() {
    if (elements.sidebar) elements.sidebar.classList.remove('open');
    if (elements.sidebarOverlay) elements.sidebarOverlay.classList.remove('active');
    document.body.classList.remove('sidebar-open');
}
function applyTheme() {
    const { theme } = appSettings;
    const isDark = (theme === 'dark') || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.body.classList.toggle('dark', isDark);
    if (elements.toggleThemeBtn) {
        elements.toggleThemeBtn.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    }
}
function changeColorTheme(themeColor) {
    document.body.className = document.body.className.split(' ').filter(c => !c.startsWith('theme-')).join(' ');
    document.body.classList.add(`theme-${themeColor}`);
    appSettings.themeColor = themeColor;
    saveSettings();
    showToast(`تم تغيير الثيم إلى: ${themeColor}`);
}
function changeFontSize(fontSize) {
    document.documentElement.style.fontSize = fontSize;
    appSettings.fontSize = fontSize;
    saveSettings();
    showToast(`تم تغيير حجم الخط إلى: ${fontSize}`);
}
function checkPasswordStrength() {
    if (!elements.password || !elements.passwordStrength) return;
    const password = elements.password.value;
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    const feedback = ['<span style="color: #ef4444;">ضعيفة جداً</span>', '<span style="color: #f59e0b;">ضعيفة</span>', '<span style="color: #eab308;">متوسطة</span>', '<span style="color: #22c55e;">قوية</span>', '<span style="color: #16a34a;">قوية جداً</span>'];
    elements.passwordStrength.innerHTML = `قوة كلمة السر: ${feedback[Math.floor(score/1.5)] || feedback[0]}`;
}
function applySettingsToUI() {
    applyTheme();
    changeFontSize(appSettings.fontSize);
    document.body.classList.add(`theme-${appSettings.themeColor}`);
    elements.themeSelector.value = appSettings.themeColor;
    elements.fontSizeSelector.value = appSettings.fontSize;
    elements.autoThemeToggle.checked = appSettings.theme === 'auto';
    elements.darkThemeToggle.checked = appSettings.theme === 'dark';
    elements.encryptionStrength.value = appSettings.encryptionStrength;
    elements.autoCopyEncodedEmoji.checked = appSettings.autoCopyEncodedEmoji;
    elements.autoCopyDecodedText.checked = appSettings.autoCopyDecodedText;
    elements.showNotifications.checked = appSettings.showNotifications;
}
function showShareModal(options, content) {
    const modal = document.createElement('div');
    modal.className = 'share-modal';
    modal.innerHTML = `<div class="share-modal-content"><div class="share-modal-header"><h3>مشاركة المحتوى</h3><button id="closeShareModal" class="close-btn">&times;</button></div><div class="share-options-grid">${options.map(opt => `<a href="${opt.url || '#'}" target="_blank" rel="noopener noreferrer" class="share-option" data-action="${opt.action || 'open'}"><i class="${opt.icon}" style="color: ${opt.color};"></i><span>${opt.name}</span></a>`).join('')}</div></div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', async (e) => {
        const isClose = e.target.matches('.share-modal, .close-btn, .close-btn *');
        const shareLink = e.target.closest('.share-option');
        if (isClose) {
            document.body.removeChild(modal);
        } else if (shareLink?.dataset.action === 'copy') {
            e.preventDefault();
            await copyToClipboard(content);
            document.body.removeChild(modal);
        }
    });
}

// --- From assets/js/modules/ui_handlers.js ---
function handleAddNewEmoji(emoji) {
    if (!emoji || emoji.trim() === '') {
        return showToast('يرجى إدخال إيموجي صحيح', 'error');
    }
    emoji = emoji.trim();
    if (emojiList.includes(emoji)) {
        return showToast('هذا الإيموجي موجود بالفعل', 'error');
    }
    emojiList.unshift(emoji);
    handleSetActiveEmoji(emoji);
    saveEmojis();
    showToast('تم إضافة الإيموجي بنجاح');
    if (elements.newEmoji) elements.newEmoji.value = '';
    if (elements.customChar) elements.customChar.value = '';
}
function handleRemoveEmoji(emoji) {
    if (emojiList.length <= 1) {
        return showToast('يجب أن تبقى إيموجي واحدة على الأقل', 'error');
    }
    emojiList = emojiList.filter(e => e !== emoji);
    if (currentActiveEmoji === emoji) {
        handleSetActiveEmoji(emojiList[0]);
    }
    saveEmojis();
    renderEmojis();
    showToast('تم حذف الإيموجي بنجاح');
}
function handleSetActiveEmoji(emoji) {
    setActiveEmoji(emoji);
    updateActiveEmojiUI(emoji);
}
function handleResetEmojis() {
    if (confirm('هل أنت متأكد من رغبتك في إعادة تعيين قائمة الإيموجي؟')) {
        emojiList = [...defaultEmojis];
        handleSetActiveEmoji(defaultEmojis[0]);
        saveEmojis();
        renderEmojis();
        showToast('تم إعادة تعيين قائمة الإيموجي');
    }
}
function handleEmojiDrop(draggedEmoji, targetEmoji) {
    const fromIndex = emojiList.indexOf(draggedEmoji);
    const toIndex = emojiList.indexOf(targetEmoji);
    if (fromIndex !== -1 && toIndex !== -1) {
        emojiList.splice(fromIndex, 1);
        emojiList.splice(toIndex, 0, draggedEmoji);
        saveEmojis();
        renderCustomEmojiList();
    }
}
function handleClearHistory() {
    if (confirm('هل أنت متأكد من رغبتك في مسح السجل؟')) {
        historyItems = [];
        saveHistory();
        renderHistory();
        showToast('تم مسح السجل بنجاح');
    }
}
function handleRestoreFromHistory(index) {
    const item = historyItems[index];
    if (item) {
        elements.inputText.value = item.result;
        updateCharCount();
        switchTab('cipher');
        showToast('تم تحميل العنصر من السجل');
    }
}
function handleThemeToggle() {
    const currentTheme = appSettings.theme;
    appSettings.theme = currentTheme === 'auto' ? 'dark' : (currentTheme === 'dark' ? 'light' : 'auto');
    applyTheme();
    saveSettings();
    showToast(`تم تغيير الثيم إلى: ${appSettings.theme}`);
}
function handleSettingToggle(key, checked) {
    if (key in appSettings) {
        appSettings[key] = checked;
        saveSettings();
    }
}
function handleClearInput() {
    if (elements.inputText) {
        elements.inputText.value = '';
        updateCharCount();
        showToast('تم مسح حقل الإدخال', 'info');
    }
}
async function handlePaste() {
    if (!elements.inputText) return;
    try {
        const text = await navigator.clipboard.readText();
        elements.inputText.value += text;
        updateCharCount();
        showToast('تم لصق النص من الحافظة');
    } catch (err) {
        console.error('Paste failed:', err);
        showToast('فشل لصق النص', 'error');
    }
}
function handleResetApp() {
    if (confirm('هل أنت متأكد من رغبتك في إعادة تعيين التطبيق؟ سيتم حذف جميع البيانات المحفوظة.')) {
        resetAppSettings();
    }
}
async function handleShare() {
    const output = elements.output;
    if (!output || !output.value) return showToast('لا يوجد محتوى للمشاركة', 'warning');
    const content = output.value;
    const title = 'Emoji Cipher Pro - نص مشفر';
    if (navigator.share) {
        await navigator.share({ title, text: content });
        showToast('تم فتح نافذة المشاركة', 'success');
    } else {
        const shareOptions = [
            { name: 'WhatsApp', icon: 'fab fa-whatsapp', color: '#25D366', url: `https:
            { name: 'Telegram', icon: 'fab fa-telegram', color: '#0088cc', url: `https:
            { name: 'Twitter', icon: 'fab fa-twitter', color: '#1DA1F2', url: `https:
            { name: 'Copy', icon: 'fas fa-link', color: '#6B7280', action: 'copy' }
        ];
        showShareModal(shareOptions, content);
    }
}

// --- From assets/js/modules/handlers.js ---
async function handleEncodeText() {
    const text = elements.inputText.value.trim();
    if (!text) return showToast('يرجى إدخال نص للتشفير', 'error');
    try {
        showToast('جاري التشفير...', 'info', 1000);
        const useCompression = elements.useCompression.checked;
        const useEncryption = elements.useEncrypt.checked;
        const password = elements.password.value;
        let payloadBytes = useCompression
            ? AdvancedCompression.compress(text)
            : getEncoder().encode(text);
        let encResult = null;
        if (useEncryption && password) {
            const iterations = getEncryptionIterations();
            encResult = await AdvancedEncryption.encrypt(payloadBytes, password, iterations);
            payloadBytes = encResult.encrypted;
        }
        const header = createHeader(text, payloadBytes, useCompression, useEncryption && password, encResult);
        const combinedData = assemblePayload(header, payloadBytes);
        const result = encodeBytesToEmoji(currentActiveEmoji, combinedData);
        elements.output.value = result;
        updateStats(header.origSize, header.compSize);
        showResultsSection();
        if (appSettings.autoCopyEncodedEmoji) {
            await copyToClipboard(result, elements.copyBtn);
        }
        showToast('تم تشفير النص بنجاح', 'success');
        addHistoryEntry(text, result);
    } catch (err) {
        console.error('Encoding error:', err);
        showToast(`خطأ في التشفير: ${err.message}`, 'error');
    }
}
async function handleDecodeText() {
    const src = elements.inputText.value.trim();
    if (!src) return showToast('يرجى إدخال نص مشفر', 'error');
    showToast('جاري فك التشفير...', 'info');
    try {
        const result = await decodeMessage(src);
        if (result && result.text !== null) {
            elements.output.value = result.text;
            updateStats(result.stats.originalSize, result.stats.compressedSize);
            showResultsSection();
            if (appSettings.autoCopyDecodedText) {
                await copyToClipboard(result.text, elements.copyBtn);
            }
            showToast('تم فك تشفير النص بنجاح', 'success');
        }
    } catch (err) {
        if (err.message !== "Password required") {
            showToast(`خطأ في فك التشفير: ${err.message}`, 'error');
        }
    }
}
async function decodeMessage(src) {
    const combinedData = decodeEmojiToBytes(src);
    if (combinedData.length === 0) throw new Error('لا توجد بيانات صالحة.');
    const { header, payloadBytes } = disassemblePayload(combinedData);
    if (!header || !payloadBytes) throw new Error('البيانات الوصفية تالفة.');
    let decryptedBytes = payloadBytes;
    if (header.enc) {
        const password = elements.password.value;
        if (!password) {
            showToast('النص مشفر، يرجى إدخال كلمة السر', 'error');
            throw new Error("Password required");
        }
        decryptedBytes = await AdvancedEncryption.decrypt(
            payloadBytes, base64ToBytes(header.salt), base64ToBytes(header.iv), password, header.iter
        );
    }
    const finalText = header.comp
        ? AdvancedCompression.decompress(decryptedBytes)
        : getDecoder().decode(decryptedBytes);
    return {
        text: finalText,
        stats: { originalSize: header.origSize, compressedSize: header.compSize }
    };
}
function getEncryptionIterations() {
    if (elements.useCustomIterations.checked) {
        const custom = parseInt(elements.customIterations.value, 10);
        if (custom >= 10000) return custom;
    }
    return { low: 50000, medium: 100000, high: 200000 }[appSettings.encryptionStrength] || 100000;
}
function createHeader(text, payload, comp, enc, encResult) {
    return {
        v: 2, comp, enc,
        ts: Date.now(),
        crc: AdvancedCRC.calculate(text),
        origSize: getEncoder().encode(text).length,
        compSize: payload.length,
        salt: encResult ? bytesToBase64(encResult.salt) : '',
        iv: encResult ? bytesToBase64(encResult.iv) : '',
        iter: encResult ? encResult.iterations : 0,
    };
}
function assemblePayload(header, payloadBytes) {
    const headerBytes = getEncoder().encode(JSON.stringify(header));
    const markerBytes = getEncoder().encode(HEADER_MARKER);
    const separatorBytes = getEncoder().encode(SEPARATOR);
    const combined = new Uint8Array(markerBytes.length + headerBytes.length + separatorBytes.length + payloadBytes.length);
    let offset = 0;
    combined.set(markerBytes, offset);
    offset += markerBytes.length;
    combined.set(headerBytes, offset);
    offset += headerBytes.length;
    combined.set(separatorBytes, offset);
    offset += separatorBytes.length;
    combined.set(payloadBytes, offset);
    return combined;
}
function disassemblePayload(combinedData) {
    const markerBytes = getEncoder().encode(HEADER_MARKER);
    const separatorBytes = getEncoder().encode(SEPARATOR);
    const headerStart = findSubarray(combinedData, markerBytes) + markerBytes.length;
    const separatorStart = findSubarray(combinedData, separatorBytes, headerStart);
    if (headerStart === markerBytes.length - 1 || separatorStart === -1) return {};
    const headerBytes = combinedData.slice(headerStart, separatorStart);
    const payloadBytes = combinedData.slice(separatorStart + separatorBytes.length);
    try {
        const header = JSON.parse(getDecoder().decode(headerBytes));
        return { header, payloadBytes };
    } catch {
        return {};
    }
}
function findSubarray(arr, sub, start = 0) {
    for (let i = start; i < arr.length - sub.length + 1; i++) {
        let found = true;
        for (let j = 0; j < sub.length; j++) {
            if (arr[i + j] !== sub[j]) {
                found = false;
                break;
            }
        }
        if (found) return i;
    }
    return -1;
}
function addHistoryEntry(text, result) {
    if (!appSettings.saveHistory) return;
    historyItems.unshift({
        text: text.substring(0, 100),
        result,
        timestamp: new Date().toISOString(),
        operation: 'encode'
    });
    if (historyItems.length > 50) {
        historyItems = historyItems.slice(0, 50);
    }
    saveHistory();
    renderHistory();
}

// --- From assets/js/modules/events.js ---
let dragStartEmoji = null;
function addListener(element, event, handler) {
    if (element) element.addEventListener(event, handler);
}
function setupEventListeners() {
    addListener(elements.encodeBtn, 'click', handleEncodeText);
    addListener(elements.decodeBtn, 'click', handleDecodeText);
    addListener(elements.deleteBtn, 'click', handleClearInput);
    addListener(elements.pasteBtn, 'click', handlePaste);
    addListener(elements.inputText, 'input', updateCharCount);
    addListener(elements.logo, 'click', () => switchTab('cipher'));
    addListener(elements.menuToggle, 'click', openSidebar);
    addListener(elements.closeSidebar, 'click', closeSidebar);
    document.querySelectorAll('.sidebar-tab').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });
    addListener(elements.resetBtn, 'click', handleResetApp);
    addListener(elements.toggleThemeBtn, 'click', handleThemeToggle);
    addListener(elements.copyBtn, 'click', (e) => copyToClipboard(elements.output.value, e.currentTarget));
    addListener(elements.shareBtn, 'click', handleShare);
    addListener(elements.addCustomEmoji, 'click', () => handleAddNewEmoji(elements.customChar?.value));
    addListener(elements.addEmojiBtn, 'click', () => handleAddNewEmoji(elements.newEmoji?.value));
    addListener(elements.resetEmoji, 'click', handleResetEmojis);
    if (elements.emojiSlider) {
        elements.emojiSlider.addEventListener('click', (e) => {
            const target = e.target.closest('.emoji-item');
            if (target) handleSetActiveEmoji(target.dataset.emoji);
        });
    }
    if (elements.customEmojiList) {
        elements.customEmojiList.addEventListener('click', (e) => {
            if (e.target.closest('.delete-emoji-btn')) {
                handleRemoveEmoji(e.target.closest('.emoji-row').dataset.emoji);
            }
        });
        elements.customEmojiList.addEventListener('dragstart', e => {
            const target = e.target.closest('.emoji-row');
            if (target) dragStartEmoji = target.dataset.emoji;
        });
        elements.customEmojiList.addEventListener('drop', e => {
            const target = e.target.closest('.emoji-row');
            if (target && dragStartEmoji) handleEmojiDrop(dragStartEmoji, target.dataset.emoji);
        });
        elements.customEmojiList.addEventListener('dragover', e => e.preventDefault());
    }
    addListener(elements.clearHistory, 'click', handleClearHistory);
    addListener(elements.historyList, 'click', e => {
        const target = e.target.closest('.history-item');
        if (target) handleRestoreFromHistory(target.dataset.index);
    });
    addListener(elements.themeSelector, 'change', e => changeColorTheme(e.target.value));
    addListener(elements.fontSizeSelector, 'change', e => changeFontSize(e.target.value));
    addListener(elements.autoThemeToggle, 'change', e => {
        appSettings.theme = e.target.checked ? 'auto' : 'light';
        if (e.target.checked && elements.darkThemeToggle) elements.darkThemeToggle.checked = false;
        applyTheme();
        saveSettings();
    });
    addListener(elements.darkThemeToggle, 'change', e => {
        appSettings.theme = e.target.checked ? 'dark' : 'light';
        if (e.target.checked && elements.autoThemeToggle) elements.autoThemeToggle.checked = false;
        applyTheme();
        saveSettings();
    });
    addListener(elements.useEncrypt, 'change', e => elements.passwordSection.classList.toggle('hidden', !e.target.checked));
    addListener(elements.password, 'input', checkPasswordStrength);
    addListener(elements.togglePassword, 'click', () => {
        const isPassword = elements.password.type === 'password';
        elements.password.type = isPassword ? 'text' : 'password';
        elements.togglePassword.innerHTML = isPassword ? '<i class="far fa-eye-slash"></i>' : '<i class="far fa-eye"></i>';
    });
    addListener(elements.encryptionStrength, 'change', e => {
        appSettings.encryptionStrength = e.target.value;
        saveSettings();
    });
    addListener(elements.useCustomIterations, 'change', e => {
        elements.customIterationsSection.classList.toggle('hidden', !e.target.checked);
        elements.encryptionStrength.disabled = e.target.checked;
    });
    addListener(elements.autoCopyEncodedEmoji, 'change', e => handleSettingToggle('autoCopyEncodedEmoji', e.target.checked));
    addListener(elements.autoCopyDecodedText, 'change', e => handleSettingToggle('autoCopyDecodedText', e.target.checked));
    addListener(elements.showNotifications, 'change', e => handleSettingToggle('showNotifications', e.target.checked));
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (appSettings.theme === 'auto') applyTheme();
    });
    document.addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && document.activeElement === elements.inputText) {
            e.preventDefault();
            handleEncodeText();
        }
        if (e.key === 'Escape') closeSidebar();
    });
}

// --- From assets/js/app.js ---
function initializeApp() {
    console.log("Initializing Emoji Cipher Pro v2 (Bundled)...");
    loadSettings();
    loadEmojis();
    loadHistory();
    applySettingsToUI();
    renderEmojis();
    renderHistory();
    updateCharCount();
    setupEventListeners();
    switchTab('cipher');
    console.log("Application initialized successfully.");
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// --- End of bundle.js ---
