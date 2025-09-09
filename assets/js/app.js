// شفرينش - نظام تشفير متقدم
// تطبيق تشفير النصوص المتقدم

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
    showNotifications: false, // Default to false as per user request
    autoSave: true,
    saveHistory: true,
    autoCopyEncodedEmoji: true, // تفعيل النسخ التلقائي
    autoCopyDecodedText: true,
    encryptionStrength: 'high',
    compressionLevel: 'auto'
};

// Application Data
let emojiList = [...defaultEmojis];
let alphanumericChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.split('');
let historyItems = [];
let useAlphanumeric = false;
let managingAlphanumeric = false; // To track which list is being managed in the UI
let historyFilter = 'all'; // 'all', 'encode', 'decode'
let batchMode = false;
let currentActiveChar = defaultEmojis[0];

const HEADER_MARKER = '\u061C'; // Arabic letter mark
const SEPARATOR = '\u034F'; // Combining grapheme joiner

// UTF-8 compatible encoder/decoder
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: false, ignoreBOM: true });

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
            if (status === 'success') {
                // The worker sends back a plain object, so we need to reconstruct the Uint8Array
                if (payload.encrypted) {
                    payload.encrypted = new Uint8Array(payload.encrypted);
                }
                if (payload.decrypted) {
                    payload.decrypted = new Uint8Array(payload.decrypted);
                }
                promise.resolve(payload);
            } else {
                promise.reject(new Error(payload));
            }
            delete _workerPromises[id];
        }
    };

    cryptoWorker.onerror = (error) => {
        console.error('Crypto worker error:', error);
        workerInitialized = false; // Disable worker for future operations
        // Reject any pending promises
        for (const id in _workerPromises) {
            _workerPromises[id].reject(new Error('Crypto worker encountered a fatal error.'));
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
        if (!workerInitialized) {
            // This case should be handled by the calling function, which will use the fallback.
            return reject(new Error('Worker not initialized'));
        }
        const id = messageId++;
        _workerPromises[id] = { resolve, reject };

        // Transferable objects for performance
        const transferList = [];
        if (payload.data && payload.data.buffer) transferList.push(payload.data.buffer);
        if (payload.encryptedData && payload.encryptedData.buffer) transferList.push(payload.encryptedData.buffer);

        cryptoWorker.postMessage({ id, type, payload }, transferList);
    });
}

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
        if (!text) return new Uint8Array([]);
        try {
            // Ensure pako is available
            if (typeof pako === 'undefined') {
                console.warn('Pako library not found, falling back to raw bytes.');
                return encoder.encode(text);
            }
            return pako.deflate(text);
        } catch (error) {
            console.error('Pako compression error:', error);
            // Fallback to just encoding the text if compression fails
            return encoder.encode(text);
        }
    }

    static decompress(data) {
        if (!data || data.length === 0) return '';
        try {
            // Ensure pako is available
            if (typeof pako === 'undefined') {
                console.warn('Pako library not found, falling back to standard decoder.');
                return decoder.decode(data);
            }
            return pako.inflate(data, { to: 'string' });
        } catch (error) {
            console.error('Pako decompression error:', error);
            // Fallback to trying to decode the data directly
            try {
                return decoder.decode(data);
            } catch (e) {
                console.error('Final fallback decode error:', e);
                return ''; // Return empty string if all fails
            }
        }
    }
}

// ========== Enhanced Encryption System ==========

// Legacy PBKDF2 implementation for backwards compatibility
class PBKDF2Encryption {
    static async generateKey(password, salt, iterations) {
        const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']);
        return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    }

    static async decrypt(encryptedData, salt, iv, password, iterations, additionalData) {
        const key = await this.generateKey(password, salt, iterations);
        // The AAD for the old version was a static string
        const aad = encoder.encode('EmojiCipherPro-v2.1');
        const decryptedData = await crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: aad }, key, encryptedData);
        return new Uint8Array(decryptedData);
    }
}

// Current Argon2 implementation for the fallback (if worker fails)
class AdvancedEncryption {
    static async generateKey(password, salt, strength) {
        if (typeof argon2 === 'undefined') {
            console.error("Argon2 script not loaded. Cannot perform encryption fallback.");
            throw new Error("Argon2 library not available.");
        }
        const strengthSettings = {
            low: { time: 1, mem: 1024, hashLen: 32, parallelism: 1, type: argon2.ArgonType.Argon2id },
            medium: { time: 2, mem: 2048, hashLen: 32, parallelism: 1, type: argon2.ArgonType.Argon2id },
            high: { time: 3, mem: 4096, hashLen: 32, parallelism: 1, type: argon2.ArgonType.Argon2id }
        };
        const params = strengthSettings[strength] || strengthSettings.medium;

        const argon2Result = await argon2.hash({
            pass: password,
            salt: salt,
            time: params.time,
            mem: params.mem,
            hashLen: params.hashLen,
            parallelism: params.parallelism,
            type: params.type,
        });

        const keyBytes = argon2Result.hash.slice(0, 32);
        return crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
    }

    static async encrypt(data, password, strength, salt, iv, additionalData) {
        const key = await this.generateKey(password, salt, strength);
        const encryptedData = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv, additionalData, tagLength: 128 },
            key,
            data
        );
        return { encrypted: new Uint8Array(encryptedData) };
    }

    static async decrypt(encryptedData, salt, iv, password, strength, additionalData) {
        const key = await this.generateKey(password, salt, strength);
        const decryptedData = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv, additionalData, tagLength: 128 },
            key,
            encryptedData
        );
        // The worker returns a `decrypted` property, so we match that structure
        return { decrypted: new Uint8Array(decryptedData) };
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

async function encryptSingleText(text) {
    if (!text) return null;

    const useCompression = $('useCompression')?.checked ?? true;
    const useEncryption = $('useEncrypt')?.checked ?? false;
    const password = $('password')?.value ?? '';

    let payloadBytes = useCompression ? AdvancedCompression.compress(text) : encoder.encode(text);

    const header = {
        v: 3,
        ts: Date.now(),
        cmp: useCompression ? 1 : 0,
        enc: useEncryption && password ? 1 : 0,
        oSize: encoder.encode(text).length,
        salt: '',
        iv: '',
        strength: ''
    };

    if (header.enc) {
        const salt = crypto.getRandomValues(new Uint8Array(32));
        const iv = crypto.getRandomValues(new Uint8Array(16));
        const strength = appSettings.encryptionStrength;

        header.salt = bytesToBase64(salt);
        header.iv = bytesToBase64(iv);
        header.strength = strength;

        const headerBytesForAAD = encoder.encode(JSON.stringify(header));

        let encryptionResult;
        try {
            encryptionResult = await callWorker('encrypt', { data: payloadBytes, password, strength, salt, iv, additionalData: headerBytesForAAD });
        } catch (workerError) {
            console.warn('Worker encryption failed, falling back to main thread.', workerError);
            encryptionResult = await AdvancedEncryption.encrypt(payloadBytes, password, strength, salt, iv, headerBytesForAAD);
        }

        payloadBytes = encryptionResult.encrypted;
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
    return encode(currentActiveChar, encoder.encode(base64Data));
}

async function encodeText() {
    const inputText = $('inputText');
    const output = $('output');

    if (!inputText || !output) {
        showToast('عناصر الواجهة غير متوفرة', 'error');
        return;
    }

    const fullInput = inputText.value.trim();
    if (!fullInput) {
        showToast('يرجى إدخال نص للتشفير', 'error');
        return;
    }

    showToast('جاري التشفير...', 'info', 1000);
    output.innerHTML = ''; // Clear previous results

    if (batchMode) {
        const lines = fullInput.split('\n').filter(line => line.trim() !== '');
        if (lines.length === 0) {
            showToast('لم يتم العثور على نصوص صالحة للمعالجة', 'warning');
            return;
        }

        showResultCard(true);
        let resultsHtml = '';
        let processedCount = 0;

        for (const line of lines) {
            try {
                const result = await encryptSingleText(line.trim());
                if (result) {
                    // Note: We'll need to add CSS and an event listener for this button
                    resultsHtml += `<div class="batch-result-item"><span>${result}</span> <button class="icon-btn-sm copy-batch-item" data-text="${result}"><i class="far fa-copy"></i></button></div>`;
                    addToHistory(line.trim(), result, 'encode');
                    processedCount++;
                }
            } catch (error) {
                console.error(`Error encoding line: "${line}"`, error);
                resultsHtml += `<div class="batch-result-item error">فشل تشفير هذا السطر: ${error.message}</div>`;
            }
        }
        output.innerHTML = resultsHtml;
        showToast(`تمت معالجة ${processedCount} من ${lines.length} نص بنجاح`, 'success');

    } else {
        try {
            const result = await encryptSingleText(fullInput);
            if (result) {
                output.textContent = result; // Use textContent for single result
                addToHistory(fullInput, result, 'encode');
                showResultCard(true);
                if (appSettings.autoCopyEncodedEmoji) {
                    await copyToClipboard(result);
                    showToast('تم التشفير ونسخ النتيجة تلقائياً', 'success');
                } else {
                    showToast('تم تشفير النص بنجاح', 'success');
                }
            }
        } catch (error) {
            console.error('Encoding error:', error);
            showToast('حدث خطأ أثناء التشفير: ' + error.message, 'error');
        }
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
            if (combinedData[j] === markerBytes[0]) { // Quick check
                let match = true;
                for (let k = 1; k < markerBytes.length; k++) {
                    if (combinedData[j + k] !== markerBytes[k]) {
                        match = false;
                        break;
                    }
                }
                if (match) {
                    headerStart = j + markerBytes.length;
                    break;
                }
            }
        }

        if (headerStart === -1) throw new Error("Invalid message format: Missing header marker");

        let separatorStart = -1;
        for (let j = headerStart; j <= combinedData.length - separatorBytes.length; j++) {
            if (combinedData[j] === separatorBytes[0]) { // Quick check
                 separatorStart = j;
                 break;
            }
        }

        if (separatorStart === -1) throw new Error("Invalid message format: Missing separator");

        const headerBytes = combinedData.slice(headerStart, separatorStart);
        let payloadBytes = combinedData.slice(separatorStart + separatorBytes.length);

        const header = JSON.parse(decoder.decode(headerBytes));

        if (header.enc || header.encryption) { // Support old `encryption` key
            const password = $('password')?.value ?? '';
            if (!password) {
                if (showToasts) showToast(`النص مشفر بكلمة سر، يرجى إدخال كلمة السر`, 'error');
                throw new Error("Password required");
            }
            const salt = base64ToBytes(header.salt);
            const iv = base64ToBytes(header.iv);

            // Check version to decide decryption method
            if (header.v === 3) { // New Argon2 version
                const strength = header.strength;
                if (!strength) throw new Error("Missing encryption strength parameter for decryption.");

                let decryptionResult;
                try {
                    decryptionResult = await callWorker('decrypt', { encryptedData: payloadBytes, salt, iv, password, strength, additionalData: headerBytes });
                } catch (workerError) {
                    console.warn('Worker decryption failed, falling back to main thread.', workerError);
                    decryptionResult = await AdvancedEncryption.decrypt(payloadBytes, salt, iv, password, strength, headerBytes);
                }
                payloadBytes = decryptionResult.decrypted;

            } else { // Fallback for older PBKDF2 versions
                console.warn("Decrypting a message with legacy PBKDF2 encryption.");
                const iterations = header.iterations;
                if (!iterations) throw new Error("Missing encryption iterations for older version.");

                // The worker doesn't support legacy decryption, so we do it on the main thread.
                payloadBytes = await PBKDF2Encryption.decrypt(payloadBytes, salt, iv, password, iterations, headerBytes);
            }
        }

        const finalText = (header.cmp || header.compression) ? AdvancedCompression.decompress(payloadBytes) : decoder.decode(payloadBytes);

        return {
            text: finalText,
            stats: {
                originalSize: header.oSize || header.originalSize,
                compressedSize: header.cSize || header.compressedSize
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

    output.innerHTML = ''; // Clear previous results

    if (batchMode) {
        await decodeBatchText(src, output);
    } else {
        showToast('جاري فك التشفير...', 'info', 1000);
        const result = await decodeSingleMessage(src);

        if (result && result.text !== null) {
            output.textContent = result.text;

            setTimeout(() => {
                updateStats(result.stats.originalSize, result.stats.compressedSize, result.text.length);
            }, 0);

            if (appSettings.autoCopyDecodedText) {
                await copyToClipboard(result.text);
                showToast(`تم فك تشفير النص ونسخ النتيجة تلقائياً`, 'success');
            } else {
                showToast(`تم فك تشفير النص بنجاح`, 'success');
            }

            addToHistory(result.text, src, 'decode');
            showResultCard(true);
        }
    }
}

async function decodeBatchText(src, output) {
    showToast('جاري البحث عن رسائل متعددة...', 'info');

    const allKnownChars = [...emojiList, ...alphanumericChars];
    const emojiRegex = new RegExp(`(${allKnownChars.map(e => e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g');

    const matches = [...src.matchAll(emojiRegex)];

    if (matches.length === 0) {
        showToast('لم يتم العثور على أي رموز معروفة للبدء بها.', 'error');
        return;
    }

    let resultsHtml = '';
    let decodedCount = 0;

    for (const match of matches) {
        const potentialMessage = src.substring(match.index);
        try {
            const result = await decodeSingleMessage(potentialMessage, { showToasts: false });
            if (result && result.text) {
                resultsHtml += `<div class="batch-result-item"><span>${result.text}</span> <button class="icon-btn-sm copy-batch-item" data-text="${result.text}"><i class="far fa-copy"></i></button></div>`;
                addToHistory(result.text, potentialMessage, 'decode');
                decodedCount++;
            }
        } catch (e) {
            if (e.message === "Password required") {
                showToast(`رسالة مشفرة بكلمة سر، يرجى إدخال كلمة السر ثم المحاولة مجدداً`, 'error');
                return; // Stop batch processing if a password is required
            }
            // Ignore errors for non-decodable parts
        }
    }

    if (decodedCount > 0) {
        output.innerHTML = resultsHtml;
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
    const title = 'شفرينش - نص مشفر';

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

let stream = null;
let animationFrameId = null;

async function startScanner() {
    const scannerModal = $('scannerModal');
    const video = $('scannerVideo');
    const scannerMessage = $('scannerMessage');

    if (!scannerModal || !video || !scannerMessage) {
        showToast('عناصر واجهة الماسح الضوئي غير موجودة', 'error');
        return;
    }

    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        video.srcObject = stream;
        video.setAttribute("playsinline", true); // required to tell iOS safari we don't want fullscreen
        await video.play();
        scannerModal.classList.remove('hidden');
        scannerMessage.textContent = 'وجّه الكاميرا نحو الرمز...';
        animationFrameId = requestAnimationFrame(tick);
    } catch (err) {
        console.error("Camera access error:", err);
        showToast(`فشل في الوصول إلى الكاميرا: ${err.message}`, 'error');
        scannerMessage.textContent = 'فشل الوصول إلى الكاميرا. يرجى السماح بالوصول والمحاولة مرة أخرى.';
    }
}

function stopScanner() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
    stream = null;
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    animationFrameId = null;
    $('scannerModal').classList.add('hidden');
}

function tick() {
    const video = $('scannerVideo');
    const scannerMessage = $('scannerMessage');

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
        const canvasElement = document.createElement('canvas');
        const canvas = canvasElement.getContext('2d');
        canvasElement.height = video.videoHeight;
        canvasElement.width = video.videoWidth;
        canvas.drawImage(video, 0, 0, canvasElement.width, canvasElement.height);
        const imageData = canvas.getImageData(0, 0, canvasElement.width, canvasElement.height);

        const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
        });

        if (code) {
            scannerMessage.textContent = `تم العثور على رمز! ${code.data.substring(0, 20)}...`;
            const inputText = $('inputText');
            inputText.value = code.data;
            updateCharCount();
            autoGrowTextarea(inputText);
            showToast('تم استيراد النص من QR Code بنجاح', 'success');
            stopScanner();
            return;
        } else {
            scannerMessage.textContent = 'جاري البحث عن رمز...';
        }
    }
    animationFrameId = requestAnimationFrame(tick);
}

function exportAsQR() {
    const output = $('output');
    if (!output || !output.value) {
        showToast('لا يوجد محتوى لتصديره كـ QR Code', 'warning');
        return;
    }

    const text = output.value;
    const qrContainer = $('qrcode-container');
    const qrModal = $('qrModal');

    if (!qrContainer || !qrModal) {
        showToast('عناصر واجهة QR Code غير موجودة', 'error');
        return;
    }

    // Clear previous QR code
    qrContainer.innerHTML = '';

    // Create new QR code
    try {
        new QRCode(qrContainer, {
            text: text,
            width: 256,
            height: 256,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H // High correction level for better scanning
        });
    } catch (e) {
        showToast('فشل في توليد QR Code. قد يكون النص طويلاً جداً.', 'error');
        console.error("QR Code generation error:", e);
        return;
    }


    // Show the modal
    qrModal.classList.remove('hidden');
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

// ========== Emoji Management ==========

function renderCharacterList() {
    const slider = $('emojiSlider');
    if (!slider) return;

    const list = useAlphanumeric ? alphanumericChars : emojiList;
    const itemClass = useAlphanumeric ? 'char-item' : 'emoji-item';
    slider.innerHTML = '';
    list.forEach(char => {
        const charEl = document.createElement('div');
        charEl.className = itemClass;
        charEl.textContent = char;
        if (char === currentActiveChar) charEl.classList.add('active');
        charEl.addEventListener('click', () => setActiveChar(char));
        slider.appendChild(charEl);
    });

    // If the current active character is not in the new list, set the first one as active.
    if (!list.includes(currentActiveChar)) {
        setActiveChar(list[0]);
    }

    // Toggle visibility of the custom emoji UI based on the character set
    const customEmojiUI = document.querySelector('.custom-emoji-container');
    if (customEmojiUI) {
        customEmojiUI.style.display = useAlphanumeric ? 'none' : 'flex';
    }
    const emojiTab = document.querySelector('.sidebar-tab[data-tab="emoji"]');
    if(emojiTab) {
        emojiTab.style.display = useAlphanumeric ? 'none' : 'flex';
    }
    const emojiManagementTab = $('emojiTab');
    if (emojiManagementTab) {
        const charSetSwitchInEmojiTab = emojiManagementTab.querySelector('#charSetSwitch');
        if (charSetSwitchInEmojiTab) {
            charSetSwitchInEmojiTab.parentElement.style.display = useAlphanumeric ? 'none' : 'block';
        }
    }


    // If we switch to alphanumeric and the emoji tab is active, switch to the cipher tab
    if (useAlphanumeric && document.querySelector('.sidebar-tab[data-tab="emoji"].active')) {
        switchTab('cipher');
    }

    renderManagedList();
}

function setActiveChar(char) {
    currentActiveChar = char;
    document.querySelectorAll('.emoji-item, .char-item').forEach(el => {
        el.classList.toggle('active', el.textContent === char);
    });
}

function addNewChar(char) {
    if (!char || char.trim() === '') {
        showToast('يرجى إدخال رمز صحيح', 'error');
        return;
    }
    char = char.trim();

    const list = managingAlphanumeric ? alphanumericChars : emojiList;
    const listName = managingAlphanumeric ? "الحروف والأرقام" : "الإيموجي";

    if (list.includes(char)) {
        showToast(`هذا الرمز موجود بالفعل في قائمة ${listName}`, 'error');
        return;
    }

    if (managingAlphanumeric) {
        alphanumericChars.unshift(char);
        saveAlphanumericChars();
    } else {
        emojiList.unshift(char);
        saveEmojis();
    }

    setActiveChar(char);
    renderManagedList();
    renderCharacterList(); // Re-render the main slider as well
    showToast('تم إضافة الرمز بنجاح');

    const newEmojiInput = $('newEmoji');
    if (newEmojiInput) newEmojiInput.value = '';
    const customCharInput = $('customChar');
    if (customCharInput) customCharInput.value = '';
}

function removeChar(char) {
    const list = managingAlphanumeric ? alphanumericChars : emojiList;
    if (list.length <= 1) {
        showToast('يجب أن تبقى رمز واحد على الأقل في القائمة', 'error');
        return;
    }

    if (managingAlphanumeric) {
        alphanumericChars = alphanumericChars.filter(c => c !== char);
        saveAlphanumericChars();
    } else {
        emojiList = emojiList.filter(e => e !== char);
        saveEmojis();
    }

    if (currentActiveChar === char) {
        const newList = managingAlphanumeric ? alphanumericChars : emojiList;
        setActiveChar(newList[0]);
    }

    renderManagedList();
    renderCharacterList(); // Also re-render the main slider
    showToast('تم حذف الرمز بنجاح');
}

function renderManagedList() {
    const customEmojiList = $('customEmojiList');
    if (!customEmojiList) return;

    const list = managingAlphanumeric ? alphanumericChars : emojiList;
    const listName = managingAlphanumeric ? "الحروف والأرقام" : "الإيموجي";
    const newCharLabel = $('newCharLabel');
    const newEmojiInput = $('newEmoji');
    const resetBtn = $('resetEmoji');

    if (newCharLabel) newCharLabel.textContent = `إضافة رمز جديد إلى قائمة ${listName}`;
    if (newEmojiInput) newEmojiInput.placeholder = `أدخل رمزاً جديداً...`;
    if (resetBtn) resetBtn.innerHTML = `<i class="fas fa-undo"></i> إعادة تعيين قائمة ${listName}`;

    customEmojiList.innerHTML = '';
    if (list.length === 0) {
        customEmojiList.innerHTML = `<p style="text-align: center; color: #64748b; padding: 2rem;">لا توجد رموز في قائمة ${listName}</p>`;
        return;
    }

    list.forEach((char, index) => {
        const charRow = document.createElement('div');
        charRow.className = 'emoji-manage-item'; // Keep class for styling
        charRow.setAttribute('draggable', 'true');
        charRow.setAttribute('data-index', index);

        charRow.innerHTML = `
            <div class="emoji-info">
                <i class="fas fa-grip-vertical drag-handle"></i>
                <span class="emoji-char">${char}</span>
            </div>
            <button class="delete-emoji-btn" title="حذف الرمز">
                <i class="fas fa-trash"></i>
            </button>
        `;

        const deleteBtn = charRow.querySelector('.delete-emoji-btn');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeChar(char);
        });

        customEmojiList.appendChild(charRow);
    });
}

function resetCharList() {
    const listName = managingAlphanumeric ? "الحروف والأرقام" : "الإيموجي";
    if (confirm(`هل أنت متأكد من رغبتك في إعادة تعيين قائمة ${listName}؟`)) {
        if (managingAlphanumeric) {
            alphanumericChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.split('');
            saveAlphanumericChars();
        } else {
            emojiList = [...defaultEmojis];
            saveEmojis();
        }
        renderManagedList();
        renderCharacterList();
        showToast(`تم إعادة تعيين قائمة ${listName}`);
    }
}

// ========== History Management ==========

function addToHistory(text, result, operation) {
    if (!appSettings.saveHistory) return;

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
    const title = 'شفرينش - نص مشفر';
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

    const filteredItems = historyItems.filter(item => {
        if (historyFilter === 'all') return true;
        return item.operation === historyFilter;
    });

    historyList.innerHTML = '';

    if (filteredItems.length === 0) {
        emptyHistory.classList.remove('hidden');
        emptyHistory.textContent = historyFilter === 'all' ? 'لا توجد عناصر في السجل بعد' : 'لا توجد عناصر تطابق هذا الفلتر';
        historyCount.textContent = '0 عنصر محفوظ';
        return;
    }

    emptyHistory.classList.add('hidden');
    historyCount.textContent = `${filteredItems.length} عنصر محفوظ`;

    filteredItems.forEach(item => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';

        const date = new Date(item.timestamp).toLocaleString('ar-EG');
        const opText = item.operation === 'encode' ? 'تشفير' : 'فك تشفير';
        const opIcon = item.operation === 'encode' ? 'fa-lock' : 'fa-unlock';
        const originalText = item.operation === 'encode' ? item.text : item.result;
        const resultText = item.operation === 'encode' ? item.result : item.text;

        historyItem.innerHTML = `
            <div class="history-item-main">
                <div class="history-item-info">
                    <div class="history-item-date">${date}</div>
                    <div class="history-item-text">${originalText}${originalText.length >= 100 ? '...' : ''}</div>
                    <div class="history-item-op"><i class="fas ${opIcon}"></i> ${opText}</div>
                </div>
                <div class="history-item-emoji">${resultText.substring(0, 1)}</div>
            </div>
            <div class="history-item-actions">
                <button class="icon-btn-sm copy-history-btn" title="نسخ النتيجة"><i class="far fa-copy"></i></button>
                <button class="icon-btn-sm share-history-btn" title="مشاركة النتيجة"><i class="fas fa-share-alt"></i></button>
                <button class="icon-btn-sm restore-history-btn" title="استعادة إلى الإدخال"><i class="fas fa-redo"></i></button>
            </div>
        `;

        historyItem.querySelector('.restore-history-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            const inputText = $('inputText');
            if (inputText) {
                inputText.value = resultText;
                updateCharCount();
                switchTab('cipher');
                showToast('تم تحميل العنصر من السجل');
            }
        });

        historyItem.querySelector('.copy-history-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            copyToClipboard(resultText);
        });

        historyItem.querySelector('.share-history-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            shareHistoryItem(resultText);
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

function exportHistory() {
    if (historyItems.length === 0) {
        showToast('لا يوجد شيء في السجل لتصديره', 'warning');
        return;
    }

    const jsonString = JSON.stringify(historyItems, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `shifrenish-history-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('تم بدء تصدير السجل بنجاح', 'success');
}

function importHistory(event) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const importedItems = JSON.parse(e.target.result);

            if (!Array.isArray(importedItems)) {
                throw new Error('الملف غير صالح، البيانات ليست مصفوفة.');
            }

            // Basic validation of items
            const validItems = importedItems.filter(item =>
                item && typeof item.text === 'string' && typeof item.result === 'string' && typeof item.timestamp === 'string'
            );

            if (validItems.length === 0) {
                showToast('لم يتم العثور على عناصر صالحة في الملف المستورد', 'warning');
                return;
            }

            // Merge and remove duplicates, keeping the imported one if conflict
            const historyMap = new Map();
            [...historyItems, ...validItems].forEach(item => historyMap.set(item.timestamp, item));

            historyItems = Array.from(historyMap.values());
            // Sort by timestamp descending to keep the newest items first
            historyItems.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            // Truncate if over limit
            if (historyItems.length > 50) {
                historyItems = historyItems.slice(0, 50);
            }

            saveHistory();
            renderHistory();
            showToast(`تم استيراد ${validItems.length} عنصر بنجاح`, 'success');

        } catch (error) {
            console.error('Import error:', error);
            showToast(`فشل استيراد الملف: ${error.message}`, 'error');
        } finally {
            // Reset file input to allow importing the same file again
            event.target.value = '';
        }
    };
    reader.onerror = () => {
        showToast('فشل في قراءة الملف', 'error');
    };
    reader.readAsText(file);
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
        'nature-calm': 'طبيعة هادئة'
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

function saveAlphanumericChars() {
    localStorage.setItem('shifrenish_alphanumeric', JSON.stringify(alphanumericChars));
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

function loadAlphanumericChars() {
    const saved = localStorage.getItem('shifrenish_alphanumeric');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
                alphanumericChars = parsed;
            }
        } catch (e) {
            console.error('Error loading alphanumeric chars:', e);
        }
    }
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

            const list = managingAlphanumeric ? alphanumericChars : emojiList;
            const [removed] = list.splice(srcIndex, 1);
            list.splice(dropIndex, 0, removed);

            if (managingAlphanumeric) {
                saveAlphanumericChars();
            } else {
                saveEmojis();
            }
            renderManagedList();
            renderCharacterList(); // Also update the main slider
            showToast('تم تحديث ترتيب الرموز', 'success');
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
    const swapBtn = $('swapBtn');

    if (encodeBtn) encodeBtn.addEventListener('click', encodeText);
    if (decodeBtn) decodeBtn.addEventListener('click', decodeText);
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
    const qrExportBtn = $('qrExportBtn');
    const closeQrModalBtn = $('closeQrModal');
    const qrModal = $('qrModal');

    if (copyBtn) copyBtn.addEventListener('click', () => copyToClipboard());
    if (shareBtn) shareBtn.addEventListener('click', shareContent);
    if (qrExportBtn) qrExportBtn.addEventListener('click', exportAsQR);

    if (closeQrModalBtn && qrModal) {
        closeQrModalBtn.addEventListener('click', () => qrModal.classList.add('hidden'));
        qrModal.addEventListener('click', (e) => {
            if (e.target === qrModal) {
                qrModal.classList.add('hidden');
            }
        });
    }

    // QR Code Import
    const qrImportBtn = $('qrImportBtn');
    const closeScannerModalBtn = $('closeScannerModal');

    if(qrImportBtn) {
        qrImportBtn.addEventListener('click', startScanner);
    }
    if(closeScannerModalBtn) {
        closeScannerModalBtn.addEventListener('click', stopScanner);
    }

    // Batch mode toggle
    const batchModeToggle = $('batchModeToggle');
    if (batchModeToggle) {
        batchModeToggle.addEventListener('change', (e) => {
            batchMode = e.target.checked;
            const inputLabel = document.querySelector('label[for="inputText"]');
            const outputLabel = $('outputLabel');
            if (batchMode) {
                if (inputLabel) inputLabel.textContent = 'النصوص المراد تشفيرها (كل نص في سطر)';
                if (outputLabel) outputLabel.textContent = 'النتائج';
            } else {
                if (inputLabel) inputLabel.textContent = 'النص المراد تشفيره أو فك تشفيره';
                if (outputLabel) outputLabel.textContent = 'النتيجة';
            }
        });
    }

    // Event delegation for batch copy buttons
    const outputArea = $('output');
    if (outputArea) {
        outputArea.addEventListener('click', (e) => {
            const target = e.target.closest('.copy-batch-item');
            if (target) {
                const textToCopy = target.dataset.text;
                copyToClipboard(textToCopy);
            }
        });
    }

    // Emoji management
    const addCustomEmojiBtn = $('addCustomEmoji');
    const addEmojiBtnBtn = $('addEmojiBtn');
    const resetEmojiBtn = $('resetEmoji');
    const clearHistoryBtn = $('clearHistory');

    if (addCustomEmojiBtn) {
        addCustomEmojiBtn.addEventListener('click', () => {
            const char = $('customChar')?.value?.trim();
            if (char) addNewChar(char);
        });
    }

    if (addEmojiBtnBtn) {
        addEmojiBtnBtn.addEventListener('click', () => {
            const char = $('newEmoji')?.value?.trim();
            if (char) addNewChar(char);
        });
    }

    if (resetEmojiBtn) resetEmojiBtn.addEventListener('click', resetCharList);
    if (clearHistoryBtn) clearHistoryBtn.addEventListener('click', clearHistory);

    // History import/export
    const importHistoryBtn = $('importHistoryBtn');
    const exportHistoryBtn = $('exportHistoryBtn');
    const historyFileInput = $('historyFileInput');

    if(importHistoryBtn && historyFileInput) {
        importHistoryBtn.addEventListener('click', () => historyFileInput.click());
        historyFileInput.addEventListener('change', importHistory);
    }

    if(exportHistoryBtn) {
        exportHistoryBtn.addEventListener('click', exportHistory);
    }

    // History filter buttons
    const filterButtons = document.querySelectorAll('.history-filter-container .btn-filter');
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            historyFilter = button.dataset.filter;
            renderHistory();
        });
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

    // Management character set switcher
    const manageCharSetSwitch = $('manageCharSetSwitch');
    if (manageCharSetSwitch) {
        manageCharSetSwitch.addEventListener('change', (e) => {
            managingAlphanumeric = e.target.checked;
            renderManagedList();
        });
    }

    // Character set switcher
    const charSetSwitch = $('charSetSwitch');
    if (charSetSwitch) {
        // Also find the other switch in the other tab and sync them
        const charSetSwitch2 = document.querySelector('#emoji-card #charSetSwitch');

        const syncSwitches = (e) => {
            const isChecked = e.target.checked;
            useAlphanumeric = isChecked;
            if (charSetSwitch) charSetSwitch.checked = isChecked;
            if (charSetSwitch2) charSetSwitch2.checked = isChecked;
            renderCharacterList();
        };

        charSetSwitch.addEventListener('change', syncSwitches);
        if (charSetSwitch2) {
            charSetSwitch2.addEventListener('change', syncSwitches);
        }
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
        console.log('Initializing شفرينش...');

        loadSettings();
        loadEmojis();
        loadAlphanumericChars();
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

        console.log('شفرينش initialized successfully!');
        showToast('تم تحميل تطبيق شفرينش بنجاح', 'success');

        animateEmojiGrid();

    } catch (error) {
        console.error('Error initializing app:', error);
        showToast('حدث خطأ أثناء تحميل التطبيق', 'error');
    }
}

// Export functions for global use
window.Shifrenish = {
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
