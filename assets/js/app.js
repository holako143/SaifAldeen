// Emoji Cipher Pro - Enhanced Encryption System with Multi-Emoji Support
// تطبيق تشفير الإيموجي - نظام تشفير محسن مع دعم عدة إيموجي

// ========== Global Variables ==========
const $ = (id) => document.getElementById(id);
const defaultEmojis = [
    '😎', '✨', '❤️', '🔒', '🔥', '🌟', '🎯', '💡', '🚀', '💎', '📌', '✅', '⚡', '🌈', '🌠',
    '😊', '😂', '😍', '🤔', '👍', '👎', '🙌', '👀', '👻', '💀', '👽', '🤖', '👾', '🎃', '🧠',
    '👑', '💼', '🕶️', '🎓', '🔑', '💡', '🎉', '🎁', '🎈', '✉️', '📬', '📮', '📁', '📈', '📉',
    '📌', '📍', '📎', '✂️', '🗑️', '✏️', '✒️', '🔍', '🔎', '🔓', '🔏', '🔐', '🔑', '🏷️', '💰',
    '⚙️', '⚗️', '🔭', '🔬', '📡', '🛡️', '⚔️', '💣', '🔫', '💊', '💉', '🌡️', '⚖️', '🔗', '⛓️'
];

// ========== Helper Functions ==========
// Helper functions for robust Base64 encoding/decoding to handle binary data correctly
function bytesToBase64(bytes) {
    const binString = String.fromCodePoint(...bytes);
    return btoa(binString);
}

function base64ToBytes(base64) {
    const binString = atob(base64);
    return Uint8Array.from(binString, m => m.codePointAt(0));
}

// Application Settings
let appSettings = {
    theme: 'auto',
    themeColor: 'default',
    fontSize: '16px',
    fontFamily: 'system',
    showNotifications: false,
    autoSave: true,
    saveHistory: true,
    autoCopyEncodedEmoji: true, // تفعيل النسخ التلقائي
    autoCopyDecodedText: true,
    encryptionStrength: 'high',
    compressionLevel: 'auto'
};

// Application Data
const alphanumericChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.split('');
let emojiList = [...defaultEmojis];
let historyItems = [];
let useAlphanumeric = false;
let currentActiveChar = defaultEmojis[0];

const HEADER_MARKER = '\u061C'; // Arabic letter mark
const SEPARATOR = '\u034F'; // Combining grapheme joiner

// UTF-8 compatible encoder/decoder
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: false, ignoreBOM: true });

// ========== Unicode Variation Selector Encoding ==========

// Variation selectors block https://unicode.org/charts/nameslist/n_FE00.html
// VS1..=VS16
const VARIATION_SELECTOR_START = 0xfe00;
const VARIATION_SELECTOR_END = 0xfe0f;

// Variation selectors supplement https://unicode.org/charts/nameslist/n_E0100.html
// VS17..=VS256
const VARIATION_SELECTOR_SUPPLEMENT_START = 0xe0100;
const VARIATION_SELECTOR_SUPPLEMENT_END = 0xe01ef;

function toVariationSelector(byte) {
    if (byte >= 0 && byte < 16) {
        return String.fromCodePoint(VARIATION_SELECTOR_START + byte);
    } else if (byte >= 16 && byte < 256) {
        return String.fromCodePoint(VARIATION_SELECTOR_SUPPLEMENT_START + byte - 16);
    } else {
        return null;
    }
}

function fromVariationSelector(codePoint) {
    if (codePoint >= VARIATION_SELECTOR_START && codePoint <= VARIATION_SELECTOR_END) {
        return codePoint - VARIATION_SELECTOR_START;
    } else if (codePoint >= VARIATION_SELECTOR_SUPPLEMENT_START && codePoint <= VARIATION_SELECTOR_SUPPLEMENT_END) {
        return codePoint - VARIATION_SELECTOR_SUPPLEMENT_START + 16;
    } else {
        return null;
    }
}

function encode(emoji, bytes) {
    let encoded = emoji;
    for (const byte of bytes) {
        encoded += toVariationSelector(byte);
    }
    return encoded;
}

function decode(text) {
    let decoded = [];
    const chars = Array.from(text);

    // Find the first non-variation-selector character (the emoji) and start decoding after it.
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
            // Stop at the next non-variation-selector character
            break;
        }
    }

    return new Uint8Array(decoded);
}

// ========== Enhanced Compression System with UTF-8 Support ==========

class AdvancedCompression {
    static compress(text) {
        if (!text || text.length === 0) return new Uint8Array([]);

        try {
            const textBytes = encoder.encode(text);
            return this.simpleCompress(textBytes);
        } catch (error) {
            console.error('Compression error:', error);
            return encoder.encode(text);
        }
    }

    static decompress(data) {
        if (!data || data.length === 0) return '';

        try {
            const decompressed = this.simpleDecompress(data);
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

    static simpleCompress(data) {
        const result = [];
        let i = 0;

        while (i < data.length) {
            const current = data[i];
            let count = 1;

            while (i + count < data.length && data[i + count] === current && count < 255) {
                count++;
            }

            if (count > 3 || current === 255) {
                result.push(255, count, current);
            } else {
                for (let j = 0; j < count; j++) {
                    result.push(current);
                }
            }

            i += count;
        }

        return new Uint8Array(result);
    }

    static simpleDecompress(data) {
        const result = [];
        let i = 0;

        while (i < data.length) {
            if (data[i] === 255 && i + 2 < data.length) {
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

// ========== Crypto Worker Setup with Fallback ==========
let cryptoWorker;
let workerInitialized = false;
const _workerPromises = {};
let messageId = 0;

try {
    cryptoWorker = new Worker('./assets/js/crypto-worker.js');
    workerInitialized = true;
    cryptoWorker.onmessage = (event) => {
        const { id, status, payload } = event.data;
        const promise = _workerPromises[id];
        if (promise) {
            if (status === 'success') promise.resolve(payload);
            else promise.reject(new Error(payload));
            delete _workerPromises[id];
        }
    };
    console.log('Crypto worker initialized successfully.');
} catch (e) {
    console.warn('Crypto worker failed to initialize. Falling back to synchronous encryption.', e);
    workerInitialized = false;
}

function callWorker(type, payload) {
    return new Promise((resolve, reject) => {
        const id = messageId++;
        _workerPromises[id] = { resolve, reject };
        cryptoWorker.postMessage({ id, type, payload });
    });
}

// ========== Synchronous Encryption Class (Fallback) ==========
class AdvancedEncryption {
    static async generateKey(password, salt, iterations = 100000) {
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            'PBKDF2',
            false,
            ['deriveKey']
        );

        return crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: iterations,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    }

    static async encrypt(data, password, strength = 'high') {
        const iterations = {
            'low': 50000,
            'medium': 100000,
            'high': 200000
        }[strength] || 100000;

        const salt = crypto.getRandomValues(new Uint8Array(32));
        const iv = crypto.getRandomValues(new Uint8Array(16));
        const key = await this.generateKey(password, salt, iterations);

        const additionalData = encoder.encode('EmojiCipherPro-v2.1');

        const encryptedData = await crypto.subtle.encrypt(
            {
                name: 'AES-GCM',
                iv: iv,
                additionalData: additionalData
            },
            key,
            data
        );

        return {
            encrypted: new Uint8Array(encryptedData),
            salt: salt,
            iv: iv,
            iterations: iterations
        };
    }

    static async decrypt(encryptedData, salt, iv, password, iterations = 100000) {
        const key = await this.generateKey(password, salt, iterations);
        const additionalData = encoder.encode('EmojiCipherPro-v2.1');

        const decryptedData = await crypto.subtle.decrypt(
            {
                name: 'AES-GCM',
                iv: iv,
                additionalData: additionalData
            },
            key,
            encryptedData
        );

        return new Uint8Array(decryptedData);
    }
}


// ========== Enhanced CRC System ==========

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

    static verify(str, expectedCrc) {
        return this.calculate(str) === expectedCrc;
    }
}

// ========== Main Encryption Functions ==========

async function encodeText() {
    const inputText = $('inputText');
    const output = $('output');

    if (!inputText || !output) {
        showToast('عناصر الواجهة غير متوفرة', 'error');
        return;
    }

    const text = inputText.value.trim();
    if (!text) {
        showToast('يرجى إدخال نص للتشفير', 'error');
        return;
    }

    try {
        showToast('جاري التشفير...', 'info', 1000);

        const useCompression = $('useCompression')?.checked ?? true;
        const useEncryption = $('useEncrypt')?.checked ?? false;
        const password = $('password')?.value ?? '';

        let payloadBytes;
        if (useCompression) {
            payloadBytes = AdvancedCompression.compress(text);
        } else {
            payloadBytes = encoder.encode(text);
        }

        let encryptionData = null;
        const salt = crypto.getRandomValues(new Uint8Array(32));
        const iv = crypto.getRandomValues(new Uint8Array(16));

        let header = {
            v: 2, ts: Date.now(), cmp: useCompression ? 1 : 0, enc: useEncryption && password ? 1 : 0,
            crc: AdvancedCRC.calculate(text), oSize: encoder.encode(text).length,
            salt: '', iv: '', iter: 0
        };

        if (useEncryption && password) {
            header.salt = bytesToBase64(salt);
            header.iv = bytesToBase64(iv);
            const headerBytesForAAD = encoder.encode(JSON.stringify(header));
            const strength = appSettings.encryptionStrength;

            if (workerInitialized) {
                encryptionData = await callWorker('encrypt', { data: payloadBytes, password, strength, salt, iv, additionalData: headerBytesForAAD });
            } else {
                console.log('Using synchronous encryption fallback.');
                encryptionData = await AdvancedEncryption.encrypt(payloadBytes, password, strength, salt, iv, headerBytesForAAD);
            }
            payloadBytes = encryptionData.encrypted;
            header.iter = encryptionData.iterations;
        }

        header.cSize = payloadBytes.length;

        const headerJson = JSON.stringify(header);
        const headerBytes = encoder.encode(headerJson);

        const markerBytes = encoder.encode(HEADER_MARKER);
        const separatorBytes = encoder.encode(SEPARATOR);

        const totalSize = markerBytes.length + headerBytes.length + separatorBytes.length + payloadBytes.length;
        const combinedData = new Uint8Array(totalSize);

        let offset = 0;
        combinedData.set(markerBytes, offset);
        offset += markerBytes.length;
        combinedData.set(headerBytes, offset);
        offset += headerBytes.length;
        combinedData.set(separatorBytes, offset);
        offset += separatorBytes.length;
        combinedData.set(payloadBytes, offset);

        const base64Data = bytesToBase64(combinedData);
        const result = encode(currentActiveChar, encoder.encode(base64Data));

        output.value = result;
        output.classList.add('has-content');
        autoGrowTextarea(output);

        setTimeout(() => {
            updateStats(header.originalSize, header.compressedSize, text.length);
        }, 0);
        addToHistory(text, result, 'encode');

        if (appSettings.autoCopyEncodedEmoji) {
            await copyToClipboard(result);
            showToast('تم التشفير ونسخ النتيجة تلقائياً', 'success');
        } else {
            showToast('تم تشفير النص بنجاح', 'success');
        }

        showResultCard(true);

    } catch (error) {
        console.error('Encoding error:', error);
        showToast('حدث خطأ أثناء التشفير: ' + error.message, 'error');
    }
}

async function decodeSingleMessage(src, { showToasts = true } = {}) {
    try {
        const base64Bytes = decode(src);
        if (base64Bytes.length === 0) {
            if (showToasts) showToast('لم يتم العثور على بيانات مشفرة صالحة', 'error');
            return null;
        }
        const base64Data = decoder.decode(base64Bytes);
        const combinedData = base64ToBytes(base64Data);

        const markerBytes = encoder.encode(HEADER_MARKER);
        const separatorBytes = encoder.encode(SEPARATOR);

        let headerStart = -1;
        for (let j = 0; j <= combinedData.length - markerBytes.length; j++) {
            let matchFound = true;
            for (let k = 0; k < markerBytes.length; k++) {
                if (combinedData[j + k] !== markerBytes[k]) {
                    matchFound = false;
                    break;
                }
            }
            if (matchFound) {
                headerStart = j + markerBytes.length;
                break;
            }
        }

        if (headerStart === -1) {
            if (showToasts) showToast('فشل في العثور على بداية البيانات الوصفية.', 'error');
            return null;
        }

        let separatorStart = -1;
        for (let j = headerStart; j <= combinedData.length - separatorBytes.length; j++) {
            let matchFound = true;
            for (let k = 0; k < separatorBytes.length; k++) {
                if (combinedData[j + k] !== separatorBytes[k]) {
                    matchFound = false;
                    break;
                }
            }
            if (matchFound) {
                separatorStart = j;
                break;
            }
        }

        if (separatorStart === -1) {
            if (showToasts) showToast('فشل في العثور على الفاصل بين البيانات الوصفية والمحتوى.', 'error');
            return null;
        }

        const headerBytes = combinedData.slice(headerStart, separatorStart);
        let payloadBytes = combinedData.slice(separatorStart + separatorBytes.length);
        const header = JSON.parse(decoder.decode(headerBytes));

        if (header.enc) {
            const password = $('password')?.value ?? '';
            if (!password) {
                if (showToasts) showToast(`النص مشفر بكلمة سر، يرجى إدخال كلمة السر`, 'error');
                throw new Error("Password required");
            }
            try {
                const salt = base64ToBytes(header.salt);
                const iv = base64ToBytes(header.iv);
                const iterations = header.iter || 100000;
                if (workerInitialized) {
                    payloadBytes = await callWorker('decrypt', { encryptedData: payloadBytes, salt, iv, password, iterations, additionalData: headerBytes });
                } else {
                    payloadBytes = await AdvancedEncryption.decrypt(payloadBytes, salt, iv, password, iterations, headerBytes);
                }
            } catch (e) {
                console.error(`Decryption error:`, e);
                if (showToasts) showToast(`فشل في فك التشفير - قد تكون كلمة السر خاطئة`, 'error');
                return null;
            }
        }

        let finalText;
        if (header.compression) {
            finalText = AdvancedCompression.decompress(payloadBytes);
        } else {
            finalText = decoder.decode(payloadBytes);
        }

        return {
            text: finalText,
            stats: {
                originalSize: header.originalSize,
                compressedSize: header.compressedSize
            }
        };

    } catch (error) {
        console.error('Single message decoding error:', error);
        if (showToasts && error.message !== "Password required") {
            showToast('حدث خطأ أثناء فك التشفير: ' + error.message, 'error');
        }
        if (error.message === "Password required") throw error;
        return null;
    }
}

async function decodeText() {
    const inputText = $('inputText');
    const output = $('output');

    if (!inputText || !output) {
        showToast('عناصر الواجهة غير متوفرة', 'error');
        return;
    }

    const src = inputText.value.trim();
    if (!src) {
        showToast('يرجى إدخال نص مشفر', 'error');
        return;
    }

    showToast('جاري فك التشفير...', 'info', 1000);

    const result = await decodeSingleMessage(src);

    if (result && result.text !== null) {
        output.value = result.text;
        output.classList.add('has-content');
        autoGrowTextarea(output);

        setTimeout(() => {
            updateStats(result.stats.originalSize, result.stats.compressedSize, result.text.length);
        }, 0);

        if (appSettings.autoCopyDecodedText) {
            await copyToClipboard(result.text);
            showToast(`تم فك تشفير النص ونسخ النتيجة تلقائياً`, 'success');
        } else {
            showToast(`تم فك تشفير النص بنجاح`, 'success');
        }

        showResultCard(true);
    }
}

async function decodeMultipleText() {
    const inputText = $('inputText');
    const output = $('output');

    if (!inputText || !output) {
        showToast('عناصر الواجهة غير متوفرة', 'error');
        return;
    }

    const src = inputText.value.trim();
    if (!src) {
        showToast('يرجى إدخال نص مشفر', 'error');
        return;
    }

    showToast('جاري البحث عن رسائل متعددة...', 'info');

    const emojiRegex = new RegExp(`(${emojiList.map(e => e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g');

    const matches = [...src.matchAll(emojiRegex)];

    if (matches.length === 0) {
        showToast('لم يتم العثور على أي إيموجي معروف للبدء به.', 'error');
        return;
    }

    let decodedCount = 0;
    let decodedOutputs = [];
    let totalOriginalSize = 0;
    let totalCompressedSize = 0;

    for (const match of matches) {
        const potentialMessage = src.substring(match.index);
        try {
            const result = await decodeSingleMessage(potentialMessage, { showToasts: false });
            if (result && result.text) {
                decodedOutputs.push(result.text);
                decodedCount++;
                totalOriginalSize += result.stats.originalSize || 0;
                totalCompressedSize += result.stats.compressedSize || 0;
            }
        } catch (e) {
            if (e.message === "Password required") {
                showToast(`رسالة مشفرة بكلمة سر، يرجى إدخال كلمة السر ثم المحاولة مجدداً`, 'error');
                return;
            }
            console.log("Could not decode potential message at index " + match.index, e);
        }
    }

    if (decodedCount > 0) {
        output.value = `--- تم العثور على ${decodedCount} رسالة ---\n\n` + decodedOutputs.join('\n\n----------\n\n');
        output.classList.add('has-content');
        autoGrowTextarea(output);
        setTimeout(() => {
            updateStats(totalOriginalSize, totalCompressedSize, output.value.length);
        }, 0);
        showToast(`تم فك تشفير ${decodedCount} رسالة بنجاح.`, 'success');
        showResultCard(true);
    } else {
        showToast('تم البحث ولكن لم يتم العثور على رسائل مشفرة صالحة.', 'warning');
    }
}

// ========== Share Function ==========

async function shareContent() {
    const output = $('output');
    if (!output || !output.value) {
        showToast('لا يوجد محتوى للمشاركة', 'warning');
        return;
    }

    const content = output.value;
    const title = 'Emoji Cipher Pro - نص مشفر';

    try {
        // استخدام Web Share API إذا كان متاحاً
        if (navigator.share) {
            await navigator.share({
                title: title,
                text: content
            });
            showToast('تم فتح نافذة المشاركة', 'success');
        } else {
            // إنشاء قائمة خيارات المشاركة
            const shareOptions = [
                {
                    name: 'WhatsApp',
                    icon: 'fab fa-whatsapp',
                    color: '#25D366',
                    url: `https://wa.me/?text=${encodeURIComponent(content)}`
                },
                {
                    name: 'Telegram',
                    icon: 'fab fa-telegram',
                    color: '#0088cc',
                    url: `https://t.me/share/url?text=${encodeURIComponent(content)}`
                },
                {
                    name: 'Twitter',
                    icon: 'fab fa-twitter',
                    color: '#1DA1F2',
                    url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(content)}`
                },
                {
                    name: 'Facebook',
                    icon: 'fab fa-facebook',
                    color: '#4267B2',
                    url: `https://www.facebook.com/sharer/sharer.php?quote=${encodeURIComponent(content)}`
                },
                {
                    name: 'نسخ الرابط',
                    icon: 'fas fa-link',
                    color: '#6B7280',
                    action: 'copy'
                }
            ];

            showShareModal(shareOptions, content);
        }
    } catch (error) {
        console.error('Share error:', error);
        showToast('حدث خطأ أثناء المشاركة', 'error');
    }
}

function showShareModal(options, content) {
    // إنشاء نافذة المشاركة
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        backdrop-filter: blur(4px);
    `;

    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        border-radius: 1rem;
        padding: 1.5rem;
        max-width: 400px;
        width: 90%;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    `;

    modalContent.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <h3 style="margin: 0; color: #1f2937;">مشاركة المحتوى</h3>
            <button id="closeShareModal" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #6b7280;">×</button>
        </div>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem;">
            ${options.map(option => `
                <button class="share-option" data-url="${option.url || ''}" data-action="${option.action || 'open'}"
                        style="display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 0.5rem; background: white; cursor: pointer; transition: all 0.2s; text-decoration: none; color: ${option.color};">
                    <i class="${option.icon}" style="font-size: 1.25rem;"></i>
                    <span style="font-size: 0.875rem; font-weight: 500;">${option.name}</span>
                </button>
            `).join('')}
        </div>
    `;

    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    // إضافة مستمعي الأحداث
    modal.querySelector('#closeShareModal').addEventListener('click', () => {
        document.body.removeChild(modal);
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });

    modal.querySelectorAll('.share-option').forEach(button => {
        button.addEventListener('click', async (e) => {
            const action = button.dataset.action;
            const url = button.dataset.url;

            if (action === 'copy') {
                await copyToClipboard(content);
                showToast('تم نسخ المحتوى', 'success');
            } else if (url) {
                window.open(url, '_blank', 'width=600,height=400');
                showToast('تم فتح نافذة المشاركة', 'success');
            }

            document.body.removeChild(modal);
        });

        // تأثيرات التفاعل
        button.addEventListener('mouseenter', () => {
            button.style.transform = 'translateY(-2px)';
            button.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
        });

        button.addEventListener('mouseleave', () => {
            button.style.transform = 'translateY(0)';
            button.style.boxShadow = 'none';
        });
    });
}

// ========== UI Functions ==========

function autoGrowTextarea(element) {
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = (element.scrollHeight) + 'px';
}

function showResultCard(show) {
    const container = document.querySelector('.dynamic-card-container');
    if (container) {
        container.classList.toggle('show-result', show);
    }
}

function swapDynamicCards() {
    const container = document.querySelector('.dynamic-card-container');
    if (container) {
        const isResultVisible = container.classList.contains('show-result');
        showResultCard(!isResultVisible);
        showToast(isResultVisible ? 'تم عرض بطاقة الإيموجي' : 'تم عرض بطاقة النتيجة', 'info');
    }
}

function showToast(message, type = 'success', duration = 3000) {
    if (!appSettings.showNotifications) return;

    const container = $('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let iconClass = 'fas fa-check-circle';
    if (type === 'error') iconClass = 'fas fa-exclamation-circle';
    if (type === 'info') iconClass = 'fas fa-info-circle';
    if (type === 'warning') iconClass = 'fas fa-exclamation-triangle';

    toast.innerHTML = `
        <div class="icon"><i class="${iconClass}"></i></div>
        <div class="message">${message}</div>
        <button class="close-btn" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px)';
            setTimeout(() => toast.remove(), 300);
        }
    }, duration);
}

function updateCharCount() {
    const inputText = $('inputText');
    const charCount = $('charCount');
    const sizeEstimate = $('sizeEstimate');

    if (!inputText || !charCount) return;

    const text = inputText.value;
    charCount.textContent = text.length;

    if (text.length > 0) {
        try {
            const compressedBytes = AdvancedCompression.compress(text).length;
            if (sizeEstimate) sizeEstimate.textContent = `~${compressedBytes} بايت`;
        } catch (error) {
            if (sizeEstimate) sizeEstimate.textContent = '~0 بايت';
        }
    } else {
        if (sizeEstimate) sizeEstimate.textContent = '~0 بايت';
    }
}

function updateStats(originalSize, compressedSize, textLength) {
    const originalSizeEl = $('originalSize');
    const compressedSizeEl = $('compressedSize');

    if (originalSizeEl) originalSizeEl.textContent = `${originalSize} بايت`;
    if (compressedSizeEl) compressedSizeEl.textContent = `${compressedSize} بايت`;

    if (originalSize > 0 && compressedSize > 0) {
        const ratio = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
        if (compressedSizeEl) {
            compressedSizeEl.textContent += ` (${ratio}% توفير)`;
        }
    }
}

async function copyToClipboard(text = null) {
    const output = $('output');
    const textToCopy = text || (output ? output.value : '');

    if (!textToCopy) {
        showToast('لا يوجد نص للنسخ', 'warning');
        return;
    }

    try {
        await navigator.clipboard.writeText(textToCopy);
        showToast('تم نسخ النص إلى الحافظة', 'success');

        const copyBtn = $('copyBtn');
        if (copyBtn) {
            const originalIcon = copyBtn.innerHTML;
            copyBtn.innerHTML = '<i class="fas fa-check"></i>';
            setTimeout(() => {
                copyBtn.innerHTML = originalIcon;
            }, 2000);
        }
    } catch (error) {
        console.error('Copy failed:', error);
        showToast(`فشل في نسخ النص: ${error.message}`, 'error');
    }
}

// ========== Character List Management ==========

function renderCharacterList() {
    const slider = $('emojiSlider');
    if (!slider) return;
    const list = useAlphanumeric ? alphanumericChars : emojiList;
    const itemClass = useAlphanumeric ? 'char-item' : 'emoji-item';
    slider.innerHTML = '';
    list.forEach((char) => {
        const charEl = document.createElement('div');
        charEl.className = itemClass;
        charEl.textContent = char;
        charEl.title = `استخدام ${char} كحاوية للتشفير`;
        if (char === currentActiveChar) charEl.classList.add('active');
        charEl.addEventListener('click', () => setActiveChar(char));
        slider.appendChild(charEl);
    });
    if (!list.includes(currentActiveChar)) setActiveChar(list[0]);
    $('customChar').parentElement.style.display = useAlphanumeric ? 'none' : 'flex';
    document.querySelector('.sidebar-tab[data-tab="emoji"]').style.display = useAlphanumeric ? 'none' : 'flex';
    if (useAlphanumeric && document.querySelector('.sidebar-tab[data-tab="emoji"].active')) switchTab('cipher');
    renderCustomEmojiList();
}

function setActiveChar(char) {
    currentActiveChar = char;
    document.querySelectorAll('.emoji-item, .char-item').forEach(el => el.classList.toggle('active', el.textContent === char));
}

function addNewEmoji(emoji) {
    if (useAlphanumeric) { showToast('لا يمكن إضافة رموز في وضع الحروف والأرقام', 'warning'); return; }
    if (!emoji || emoji.trim() === '' || emojiList.includes(emoji)) { showToast('إيموجي غير صالح أو موجود بالفعل', 'error'); return; }
    emojiList.unshift(emoji.trim());
    setActiveChar(emoji.trim());
    renderCharacterList();
    saveEmojis();
    $('newEmoji').value = '';
    $('customChar').value = '';
}

function removeEmoji(emoji) {
    if (emojiList.length <= 1) { showToast('يجب أن تبقى إيموجي واحدة على الأقل', 'error'); return; }
    emojiList = emojiList.filter(e => e !== emoji);
    if (currentActiveChar === emoji) setActiveChar(emojiList[0]);
    renderCharacterList();
    saveEmojis();
}

function renderCustomEmojiList() {
    const customEmojiList = $('customEmojiList');
    if (!customEmojiList) return;
    customEmojiList.innerHTML = '';
    if (emojiList.length === 0) {
        customEmojiList.innerHTML = '<p style="text-align: center; color: #64748b; padding: 2rem;">لا توجد إيموجيات</p>';
        return;
    }
    emojiList.forEach((emoji, index) => {
        const emojiRow = document.createElement('div');
        emojiRow.className = 'emoji-manage-item';
        emojiRow.setAttribute('draggable', 'true');
        emojiRow.setAttribute('data-index', index);
        emojiRow.innerHTML = `
            <div class="emoji-info"><i class="fas fa-grip-vertical drag-handle"></i><span class="emoji-char">${emoji}</span></div>
            <button class="delete-emoji-btn" title="حذف الإيموجي"><i class="fas fa-trash"></i></button>
        `;
        emojiRow.querySelector('.delete-emoji-btn').addEventListener('click', (e) => { e.stopPropagation(); removeEmoji(emoji); });
        customEmojiList.appendChild(emojiRow);
    });
}

function resetEmojiList() {
    if (confirm('هل أنت متأكد من رغبتك في إعادة تعيين قائمة الإيموجي؟')) {
        emojiList = [...defaultEmojis];
        setActiveChar(defaultEmojis[0]);
        renderCharacterList();
        saveEmojis();
        showToast('تم إعادة تعيين قائمة الإيموجي');
    }
}

// ========== History Management ==========

function addToHistory(text, result, operation) {
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
    renderHistory();
}

async function shareHistoryItem(content) {
    const title = 'Emoji Cipher Pro - نص مشفر';
    try {
        if (navigator.share) {
            await navigator.share({ title, text: content });
            showToast('تم فتح نافذة المشاركة', 'success');
        } else {
            await copyToClipboard(content);
            showToast('تم نسخ المحتوى، المشاركة غير مدعومة', 'info');
        }
    } catch (error) {
        console.error('Share error:', error);
        showToast('حدث خطأ أثناء المشاركة', 'error');
    }
}

function renderHistory() {
    const historyList = $('historyList');
    const emptyHistory = $('emptyHistory');
    const historyCount = $('historyCount');

    if (!historyList || !emptyHistory || !historyCount) return;

    historyList.innerHTML = '';

    if (historyItems.length === 0) {
        emptyHistory.classList.remove('hidden');
        historyCount.textContent = '0 عنصر محفوظ';
        return;
    }

    emptyHistory.classList.add('hidden');
    historyCount.textContent = `${historyItems.length} عنصر محفوظ`;

    historyItems.forEach(item => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';

        const date = new Date(item.timestamp).toLocaleString('ar-EG');
        historyItem.innerHTML = `
            <div class="history-item-main">
                <div class="history-item-info">
                    <div class="history-item-date">${date}</div>
                    <div class="history-item-text">${item.text}${item.text.length >= 100 ? '...' : ''}</div>
                    <div class="history-item-op">تشفير</div>
                </div>
                <div class="history-item-emoji">${item.result.substring(0, 1)}</div>
            </div>
            <div class="history-item-actions">
                <button class="icon-btn-sm copy-history-btn"><i class="far fa-copy"></i></button>
                <button class="icon-btn-sm share-history-btn"><i class="fas fa-share-alt"></i></button>
                <button class="icon-btn-sm restore-history-btn"><i class="fas fa-redo"></i></button>
            </div>
        `;

        historyItem.querySelector('.restore-history-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            const inputText = $('inputText');
            if (inputText) {
                inputText.value = item.result;
                updateCharCount();
                switchTab('cipher');
                showToast('تم تحميل العنصر من السجل');
            }
        });

        historyItem.querySelector('.copy-history-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            copyToClipboard(item.result);
        });

        historyItem.querySelector('.share-history-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            shareHistoryItem(item.result);
        });

        historyList.appendChild(historyItem);
    });
}

function clearHistory() {
    if (confirm('هل أنت متأكد من رغبتك في مسح السجل؟')) {
        historyItems = [];
        saveHistory();
        renderHistory();
        showToast('تم مسح السجل بنجاح');
    }
}

// ========== Tab Management ==========

function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Hide results section when switching tabs
    const resultsSection = $('resultsSection');
    if (resultsSection) {
        resultsSection.classList.remove('visible');
    }

    const targetTab = $(`${tabName}Tab`);
    if (targetTab) {
        targetTab.classList.add('active');
    }

    document.querySelectorAll('.sidebar-tab').forEach(tab => {
        tab.classList.toggle('active', tab.getAttribute('data-tab') === tabName);
    });

    if (window.innerWidth <= 768) {
        closeSidebar();
    }
}

// ========== Sidebar Management ==========

function openSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        sidebar.classList.add('open');
        document.body.classList.add('sidebar-open');

        let overlay = document.querySelector('.sidebar-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'sidebar-overlay';
            document.body.appendChild(overlay);
            overlay.addEventListener('click', closeSidebar);
        }
        overlay.classList.add('active');
    }
}

function closeSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');

    if (sidebar) {
        sidebar.classList.remove('open');
        document.body.classList.remove('sidebar-open');
    }

    if (overlay) {
        overlay.classList.remove('active');
    }
}

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar && sidebar.classList.contains('open')) {
        closeSidebar();
    } else {
        openSidebar();
    }
}

// ========== Theme Management ==========

function toggleTheme() {
    if (appSettings.theme === 'auto') {
        appSettings.theme = 'dark';
    } else if (appSettings.theme === 'dark') {
        appSettings.theme = 'light';
    } else {
        appSettings.theme = 'auto';
    }

    applyTheme();
    saveSettings();

    const themeNames = { 'auto': 'تلقائي', 'dark': 'داكن', 'light': 'فاتح' };
    showToast(`��م تغيير الثيم إلى: ${themeNames[appSettings.theme]}`);
}

function applyTheme() {
    const toggleThemeBtn = $('toggleTheme');

    if (appSettings.theme === 'auto') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.body.classList.toggle('dark', prefersDark);
        if (toggleThemeBtn) {
            toggleThemeBtn.innerHTML = prefersDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        }
    } else {
        const isDark = appSettings.theme === 'dark';
        document.body.classList.toggle('dark', isDark);
        if (toggleThemeBtn) {
            toggleThemeBtn.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        }
    }
}

function changeColorTheme(themeColor) {
    document.body.className = document.body.className.split(' ').filter(c => !c.startsWith('theme-')).join(' ');
    document.body.classList.add(`theme-${themeColor}`);

    appSettings.themeColor = themeColor;
    saveSettings();

    const themeNames = {
        'default': 'افتراضي',
        'blue-sky': 'سماء زرقاء',
        'green-forest': 'غابة خضراء',
        'purple-dream': 'حلم أرجواني',
        'sunset-glow': 'توهج الغروب',
        'cyber-pink': 'سايبر وردي',
        'elegant-night': 'ليل أنيق',
        'nature-calm': 'طبيعة هادئة',
        'ocean-breeze': 'نسمة المحيط',
        'ruby-red': 'أحمر ياقوتي',
        'golden-sand': 'رمال ذهبية'
    };

    showToast(`تم تغيير الثيم إلى: ${themeNames[themeColor] || themeColor}`);
}

function changeFontSize(fontSize) {
    document.documentElement.style.fontSize = fontSize;
    appSettings.fontSize = fontSize;
    saveSettings();
    showToast(`تم تغيير حجم الخط إلى: ${fontSize}`);
}

// ========== Data Management ==========

function saveSettings() {
    if (appSettings.autoSave) {
        localStorage.setItem('emojiCipher_settings', JSON.stringify(appSettings));
    }
}

function loadSettings() {
    const saved = localStorage.getItem('emojiCipher_settings');
    if (saved) {
        try {
            appSettings = { ...appSettings, ...JSON.parse(saved) };
        } catch (e) {
            console.error('Error loading settings:', e);
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
            emojiList = JSON.parse(saved);
            if (emojiList.length === 0) {
                emojiList = [...defaultEmojis];
            }
        } catch (e) {
            console.error('Error loading emojis:', e);
            emojiList = [...defaultEmojis];
        }
    }
    currentActiveChar = emojiList[0];
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
            historyItems = JSON.parse(saved);
        } catch (e) {
            console.error('Error loading history:', e);
            historyItems = [];
        }
    }
}

// ========== Drag and Drop for Emoji Management ==========

function setupDragAndDrop() {
    const customEmojiList = $('customEmojiList');
    if (!customEmojiList) return;

    let dragSrcEl = null;

    function handleDragStart(e) {
        this.classList.add('dragging');
        dragSrcEl = this;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', this.getAttribute('data-index'));
    }

    function handleDragOver(e) {
        if (e.preventDefault) {
            e.preventDefault();
        }
        e.dataTransfer.dropEffect = 'move';
        return false;
    }

    function handleDragEnter(e) {
        const target = this.closest('.emoji-manage-item');
        if (target) {
            target.classList.add('over');
        }
    }

    function handleDragLeave(e) {
        const target = this.closest('.emoji-manage-item');
        if (target) {
            target.classList.remove('over');
        }
    }

    function handleDrop(e) {
        if (e.stopPropagation) {
            e.stopPropagation();
        }

        if (dragSrcEl !== this) {
            const srcIndex = parseInt(dragSrcEl.getAttribute('data-index'));
            const dropIndex = parseInt(this.getAttribute('data-index'));

            const [removed] = emojiList.splice(srcIndex, 1);
            emojiList.splice(dropIndex, 0, removed);

            saveEmojis();
            renderCharacterList();
            showToast('تم تحديث ترتيب الإيموجي', 'success');
        }
        return false;
    }

    function handleDragEnd(e) {
        document.querySelectorAll('.emoji-manage-item').forEach(item => {
            item.classList.remove('over');
            item.classList.remove('dragging');
        });
    }

    // Use event delegation
    customEmojiList.addEventListener('dragstart', function(e) {
        const target = e.target.closest('.emoji-manage-item');
        if (target) {
            handleDragStart.call(target, e);
        }
    });

    customEmojiList.addEventListener('dragenter', function(e) {
        const target = e.target.closest('.emoji-manage-item');
        if (target && target !== dragSrcEl) {
            handleDragEnter.call(target, e);
        }
    });

    customEmojiList.addEventListener('dragover', handleDragOver);

    customEmojiList.addEventListener('dragleave', function(e) {
        const target = e.target.closest('.emoji-manage-item');
        if (target) {
            handleDragLeave.call(target, e);
        }
    });

    customEmojiList.addEventListener('drop', function(e) {
        e.preventDefault();
        const target = e.target.closest('.emoji-manage-item');
        if (target) {
            handleDrop.call(target, e);
        }
    });

    customEmojiList.addEventListener('dragend', function(e) {
        const target = e.target.closest('.emoji-manage-item');
        if (target) {
            handleDragEnd.call(target, e);
        }
    });
}

function setupSliderDrag() {
    const slider = document.querySelector('.emoji-slider-container');
    if (!slider) return;

    let isDown = false;
    let startX;
    let startY;
    let scrollLeft;
    let scrollTop;

    slider.addEventListener('mousedown', (e) => {
        isDown = true;
        slider.classList.add('active-drag');
        startX = e.pageX - slider.offsetLeft;
        startY = e.pageY - slider.offsetTop;
        scrollLeft = slider.scrollLeft;
        scrollTop = slider.scrollTop;
    });

    slider.addEventListener('mouseleave', () => {
        isDown = false;
        slider.classList.remove('active-drag');
    });

    slider.addEventListener('mouseup', () => {
        isDown = false;
        slider.classList.remove('active-drag');
    });

    slider.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - slider.offsetLeft;
        const y = e.pageY - slider.offsetTop;
        const walkX = (x - startX) * 2; // scroll-fast
        const walkY = (y - startY) * 2; // scroll-fast
        slider.scrollLeft = scrollLeft - walkX;
        slider.scrollTop = scrollTop - walkY;
    });
}

// ========== Event Setup ==========

function setupEventListeners() {
    setupDragAndDrop();
    setupSliderDrag();
    // Encode/Decode buttons
    const encodeBtn = $('encodeBtn');
    const decodeBtn = $('decodeBtn');
    const decodeMultipleBtn = $('decodeMultipleBtn');
    const swapBtn = $('swapBtn');

    if (encodeBtn) encodeBtn.addEventListener('click', encodeText);
    if (decodeBtn) decodeBtn.addEventListener('click', decodeText);
    if (decodeMultipleBtn) decodeMultipleBtn.addEventListener('click', decodeMultipleText);
    if (swapBtn) swapBtn.addEventListener('click', swapDynamicCards);

    // Input action buttons
    const deleteBtn = $('deleteBtn');
    const pasteBtn = $('pasteBtn');

    if (deleteBtn) deleteBtn.addEventListener('click', clearInput);
    if (pasteBtn) pasteBtn.addEventListener('click', pasteFromClipboard);

    // Text input monitoring
    const inputText = $('inputText');
    if (inputText) {
        inputText.addEventListener('input', () => {
            updateCharCount();
            autoGrowTextarea(inputText);
        });

        // Custom paste handler to prevent browser sanitization of invisible characters
        inputText.addEventListener('paste', (event) => {
            event.preventDefault();
            const text = (event.clipboardData || window.clipboardData).getData('text/plain');
            const { selectionStart, selectionEnd } = event.target;

            // Insert the raw text at the current cursor position
            event.target.value =
                event.target.value.substring(0, selectionStart) +
                text +
                event.target.value.substring(selectionEnd);

            // Move the cursor to the end of the pasted content
            event.target.selectionStart = event.target.selectionEnd = selectionStart + text.length;

            // Manually trigger an 'input' event to ensure other listeners, like char count, are updated
            const inputEvent = new Event('input', { bubbles: true, cancelable: true });
            event.target.dispatchEvent(inputEvent);
        });
    }

    // Navigation buttons
    const logo = document.querySelector('.logo');
    if (logo) {
        logo.addEventListener('click', () => {
            switchTab('cipher');
        });
    }
    const menuToggle = $('menuToggle');
    const closeSidebarBtn = $('closeSidebar');
    const resetBtn = $('resetBtn');
    const toggleThemeBtn = $('toggleTheme');

    if (menuToggle) menuToggle.addEventListener('click', toggleSidebar);
    if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', closeSidebar);
    if (resetBtn) resetBtn.addEventListener('click', resetApp);
    if (toggleThemeBtn) toggleThemeBtn.addEventListener('click', toggleTheme);

    // Sidebar tabs
    document.querySelectorAll('.sidebar-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.getAttribute('data-tab');
            switchTab(tabName);
        });
    });

    // Copy and Share buttons
    const copyBtn = $('copyBtn');
    const shareBtn = $('shareBtn');

    if (copyBtn) copyBtn.addEventListener('click', () => copyToClipboard());
    if (shareBtn) shareBtn.addEventListener('click', shareContent);

    // Emoji management
    const addCustomEmojiBtn = $('addCustomEmoji');
    const addEmojiBtnBtn = $('addEmojiBtn');
    const resetEmojiBtn = $('resetEmoji');
    const clearHistoryBtn = $('clearHistory');

    if (addCustomEmojiBtn) {
        addCustomEmojiBtn.addEventListener('click', () => {
            const emoji = $('customChar')?.value?.trim();
            if (emoji) addNewEmoji(emoji);
        });
    }

    if (addEmojiBtnBtn) {
        addEmojiBtnBtn.addEventListener('click', () => {
            const emoji = $('newEmoji')?.value?.trim();
            if (emoji) addNewEmoji(emoji);
        });
    }

    if (resetEmojiBtn) resetEmojiBtn.addEventListener('click', resetEmojiList);
    if (clearHistoryBtn) clearHistoryBtn.addEventListener('click', clearHistory);

    $('charSetSwitch').addEventListener('change', (e) => {
        useAlphanumeric = e.target.checked;
        renderCharacterList();
    });

    // Password settings
    const useEncrypt = $('useEncrypt');
    const passwordSection = $('passwordSection');
    const togglePasswordBtn = $('togglePassword');
    const passwordInput = $('password');
    const encryptionStrengthSelect = $('encryptionStrength');

    if (useEncrypt && passwordSection) {
        useEncrypt.addEventListener('change', (e) => {
            passwordSection.classList.toggle('hidden', !e.target.checked);
        });
    }

    if (togglePasswordBtn && passwordInput) {
        togglePasswordBtn.addEventListener('click', () => {
            const isPassword = passwordInput.type === 'password';
            passwordInput.type = isPassword ? 'text' : 'password';
            togglePasswordBtn.innerHTML = isPassword ? '<i class="far fa-eye-slash"></i>' : '<i class="far fa-eye"></i>';
        });
    }

    // Password strength checker
    if (passwordInput) {
        passwordInput.addEventListener('input', checkPasswordStrength);
    }

    // Encryption strength setting
    if (encryptionStrengthSelect) {
        encryptionStrengthSelect.addEventListener('change', (e) => {
            appSettings.encryptionStrength = e.target.value;
            saveSettings();
            showToast(`تم تغيير قوة التشفير إلى: ${getStrengthName(e.target.value)}`);
        });
    }

    // Auto copy and notification settings
    const autoCopyEncodedEmoji = $('autoCopyEncodedEmoji');
    const autoCopyDecodedText = $('autoCopyDecodedText');
    const showNotifications = $('showNotifications');

    if (autoCopyEncodedEmoji) {
        autoCopyEncodedEmoji.addEventListener('change', (e) => {
            appSettings.autoCopyEncodedEmoji = e.target.checked;
            saveSettings();
        });
    }

    if (showNotifications) {
        showNotifications.addEventListener('change', (e) => {
            appSettings.showNotifications = e.target.checked;
            saveSettings();
        });
    }

    if (autoCopyDecodedText) {
        autoCopyDecodedText.addEventListener('change', (e) => {
            appSettings.autoCopyDecodedText = e.target.checked;
            saveSettings();
        });
    }

    // Theme and font settings
    const themeSelector = $('themeSelector');
    const fontSizeSelector = $('fontSizeSelector');

    if (themeSelector) {
        themeSelector.addEventListener('change', (e) => {
            changeColorTheme(e.target.value);
        });
    }

    if (fontSizeSelector) {
        fontSizeSelector.addEventListener('change', (e) => {
            changeFontSize(e.target.value);
        });
    }

    // Toggle switches
    const autoThemeToggle = $('autoThemeToggle');
    const darkThemeToggle = $('darkThemeToggle');

    if (autoThemeToggle) {
        autoThemeToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                appSettings.theme = 'auto';
                if (darkThemeToggle) darkThemeToggle.checked = false;
            } else {
                appSettings.theme = 'light';
            }
            applyTheme();
            saveSettings();
        });
    }

    if (darkThemeToggle) {
        darkThemeToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                appSettings.theme = 'dark';
                if (autoThemeToggle) autoThemeToggle.checked = false;
            } else {
                appSettings.theme = 'light';
            }
            applyTheme();
            saveSettings();
        });
    }

    // Slider controls
    const prevBtn = document.querySelector('.slider-control.prev');
    const nextBtn = document.querySelector('.slider-control.next');
    const emojiSlider = $('emojiSlider');

    if (prevBtn && emojiSlider) {
        prevBtn.addEventListener('click', () => {
            emojiSlider.scrollBy({ left: -200, behavior: 'smooth' });
        });
    }

    if (nextBtn && emojiSlider) {
        nextBtn.addEventListener('click', () => {
            emojiSlider.scrollBy({ left: 200, behavior: 'smooth' });
        });
    }

    // Enter key for emoji input
    const newEmojiInput = $('newEmoji');
    const customCharInput = $('customChar');

    if (newEmojiInput) {
        newEmojiInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const emoji = e.target.value.trim();
                if (emoji) addNewEmoji(emoji);
            }
        });
    }

    if (customCharInput) {
        customCharInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const emoji = e.target.value.trim();
                if (emoji) addNewEmoji(emoji);
            }
        });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const inputText = $('inputText');
            if (inputText && inputText.value.trim()) {
                encodeText();
            }
        }

        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Enter') {
            e.preventDefault();
            decodeText();
        }

        if (e.key === 'Escape') {
            closeSidebar();
        }

        if (e.key === 'F1') {
            e.preventDefault();
            switchTab('help');
            openSidebar();
        }
    });

    // Click outside to close sidebar
    document.addEventListener('click', (e) => {
        const sidebar = document.querySelector('.sidebar');
        const menuToggle = $('menuToggle');

        if (sidebar && sidebar.classList.contains('open')) {
            if (!sidebar.contains(e.target) &&
                e.target !== menuToggle &&
                !menuToggle?.contains(e.target)) {
                closeSidebar();
            }
        }
    });
}

// ========== Additional Functions ==========

function animateEmojiGrid() {
    const sliderContainer = document.querySelector('.emoji-slider-container');
    if (sliderContainer) {
        // Start the animation shortly after the app loads to ensure layout is complete
        setTimeout(() => {
            const scrollHeight = sliderContainer.scrollHeight;
            const clientHeight = sliderContainer.clientHeight;
            const maxScrollTop = scrollHeight - clientHeight;

            // Only animate if there's something to scroll
            if (maxScrollTop > 0) {
                // Define the animation sequence
                const animationSequence = [
                    { scrollTop: maxScrollTop, delay: 1200, behavior: 'smooth' }, // Scroll to bottom
                    { scrollTop: 0, delay: 2500, behavior: 'smooth' }             // Scroll back to top
                ];

                let promise = Promise.resolve();
                animationSequence.forEach(step => {
                    promise = promise.then(() => {
                        return new Promise(resolve => {
                            setTimeout(() => {
                                sliderContainer.scrollTo({ top: step.scrollTop, behavior: step.behavior });
                                // Resolve after the scroll animation is expected to finish
                                setTimeout(resolve, 1500);
                            }, step.delay);
                        });
                    });
                });
            }
        }, 800);
    }
}

function checkPasswordStrength() {
    const passwordInput = $('password');
    const strengthIndicator = $('passwordStrength');

    if (!passwordInput || !strengthIndicator) return;

    const password = passwordInput.value;
    let score = 0;
    let feedback = '';

    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    if (score === 0) {
        feedback = '<span style="color: #ef4444;">ضعيفة جداً</span>';
    } else if (score <= 2) {
        feedback = '<span style="color: #f59e0b;">ضعيفة</span>';
    } else if (score <= 4) {
        feedback = '<span style="color: #eab308;">متوسطة</span>';
    } else if (score <= 5) {
        feedback = '<span style="color: #22c55e;">قوية</span>';
    } else {
        feedback = '<span style="color: #16a34a;">قوية جداً</span>';
    }

    strengthIndicator.innerHTML = `قوة كلمة السر: ${feedback}`;
}

function getStrengthName(strength) {
    const names = {
        'low': 'منخفضة',
        'medium': 'متوسطة',
        'high': 'عالية'
    };
    return names[strength] || strength;
}

function resetApp() {
    if (confirm('هل أنت متأكد من رغبتك في إعادة تعيين التطبيق؟ سيتم حذف جميع البيانات المحفوظة.')) {
        localStorage.removeItem('emojiCipher_settings');
        localStorage.removeItem('emojiCipher_history');
        localStorage.removeItem('emojiCipher_emojis');
        location.reload();
    }
}

function clearInput() {
    const inputText = $('inputText');
    if (inputText) {
        inputText.value = '';
        updateCharCount();
        showResultCard(false); // Hide result card and show emoji card
        showToast('تم مسح حقل الإدخال', 'info');
    }
}

async function pasteFromClipboard() {
    const inputText = $('inputText');
    if (!inputText) return;

    if (!navigator.clipboard || !navigator.clipboard.readText) {
        showToast('متصفحك لا يدعم لصق النص تلقائياً.', 'warning');
        return;
    }

    try {
        const text = await navigator.clipboard.readText();
        const { selectionStart, selectionEnd } = inputText;

        inputText.value =
            inputText.value.substring(0, selectionStart) +
            text +
            inputText.value.substring(selectionEnd);

        inputText.selectionStart = inputText.selectionEnd = selectionStart + text.length;

        inputText.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));

        showToast('تم لصق النص من الحافظة', 'success');
        inputText.focus();
    } catch (err) {
        console.error('Failed to read clipboard contents: ', err);
        showToast(`فشل في قراءة الحافظة: ${err.message}`, 'error');
    }
}

function applySettings() {
    applyTheme();
    changeFontSize(appSettings.fontSize);
    document.body.classList.add(`theme-${appSettings.themeColor}`);

    const themeSelector = $('themeSelector');
    const fontSizeSelector = $('fontSizeSelector');
    const autoThemeToggle = $('autoThemeToggle');
    const darkThemeToggle = $('darkThemeToggle');
    const encryptionStrengthSelect = $('encryptionStrength');
    const autoCopyEncodedEmoji = $('autoCopyEncodedEmoji');
    const autoCopyDecodedText = $('autoCopyDecodedText');

    if (themeSelector) themeSelector.value = appSettings.themeColor;
    if (fontSizeSelector) fontSizeSelector.value = appSettings.fontSize;
    if (autoThemeToggle) autoThemeToggle.checked = appSettings.theme === 'auto';
    if (darkThemeToggle) darkThemeToggle.checked = appSettings.theme === 'dark';
    if (encryptionStrengthSelect) encryptionStrengthSelect.value = appSettings.encryptionStrength;
    if (autoCopyEncodedEmoji) autoCopyEncodedEmoji.checked = appSettings.autoCopyEncodedEmoji;
    if (autoCopyDecodedText) autoCopyDecodedText.checked = appSettings.autoCopyDecodedText;
}

// ========== App Initialization ==========

async function initApp() {
    try {
        console.log('Initializing Enhanced Emoji Cipher Pro with Multi-Emoji Support...');

        loadSettings();
        loadEmojis();
        loadHistory();

        applySettings();

        renderCharacterList();
        renderHistory();
        updateCharCount();

        setupEventListeners();

        switchTab('cipher');

        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            if (appSettings.theme === 'auto') {
                applyTheme();
            }
        });

        console.log('Enhanced Emoji Cipher Pro with Multi-Emoji Support initialized successfully!');
        showToast('تم تحميل التطبيق المحسن مع دعم عدّة إيموجي بنجاح', 'success');

        animateEmojiGrid();

    } catch (error) {
        console.error('Error initializing app:', error);
        showToast('حدث خطأ أثناء تحميل التطبيق', 'error');
    }
}

// Export functions for global use
window.EmojiCipherPro = {
    initApp,
    encodeText,
    decodeText,
    shareContent,
    showToast,
    updateCharCount,
    addNewEmoji,
    clearHistory,
    switchTab,
    toggleTheme,
    changeColorTheme,
    changeFontSize,
    copyToClipboard,
    resetApp,
    // Enhanced classes for external use
    AdvancedCompression,
    AdvancedEncryption,
    AdvancedCRC
};

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
