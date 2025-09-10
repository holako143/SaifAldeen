// شفرينش - Cryptography
// This file contains all core cryptographic functions, including:
// - Setting up the crypto worker
// - The main encrypt/decrypt functions
// - Fallback classes for PBKDF2 (legacy) and Argon2 (modern)
// - Helper functions for encoding/decoding

// ========== Helper Functions ==========
function bytesToBase64(bytes) {
    const binString = String.fromCodePoint(...bytes);
    return btoa(binString);
}

function base64ToBytes(base64) {
    const binString = atob(base64);
    return Uint8Array.from(binString, m => m.codePointAt(0));
}

// ========== Crypto Worker Setup with Fallback ==========
try {
    cryptoWorker = new Worker('./assets/js/crypto-worker.js');
    workerInitialized = true;

    cryptoWorker.onmessage = (event) => {
        const { id, status, payload } = event.data;
        const promise = _workerPromises[id];
        if (promise) {
            if (status === 'success') {
                if (payload.encrypted) payload.encrypted = new Uint8Array(payload.encrypted);
                if (payload.decrypted) payload.decrypted = new Uint8Array(payload.decrypted);
                promise.resolve(payload);
            } else {
                promise.reject(new Error(payload));
            }
            delete _workerPromises[id];
        }
    };
    cryptoWorker.onerror = (error) => {
        console.error('Crypto worker error:', error);
        workerInitialized = false;
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
            return reject(new Error('Worker not initialized'));
        }
        const id = messageId++;
        _workerPromises[id] = { resolve, reject };
        const transferList = [];
        if (payload.data && payload.data.buffer) transferList.push(payload.data.buffer);
        if (payload.encryptedData && payload.encryptedData.buffer) transferList.push(payload.encryptedData.buffer);
        cryptoWorker.postMessage({ id, type, payload }, transferList);
    });
}

// ========== Unicode Variation Selector Encoding ==========
const VARIATION_SELECTOR_START = 0xfe00;
const VARIATION_SELECTOR_END = 0xfe0f;
const VARIATION_SELECTOR_SUPPLEMENT_START = 0xe0100;
const VARIATION_SELECTOR_SUPPLEMENT_END = 0xe01ef;

function toVariationSelector(byte) {
    if (byte >= 0 && byte < 16) return String.fromCodePoint(VARIATION_SELECTOR_START + byte);
    if (byte >= 16 && byte < 256) return String.fromCodePoint(VARIATION_SELECTOR_SUPPLEMENT_START + byte - 16);
    return null;
}
function fromVariationSelector(codePoint) {
    if (codePoint >= VARIATION_SELECTOR_START && codePoint <= VARIATION_SELECTOR_END) return codePoint - VARIATION_SELECTOR_START;
    if (codePoint >= VARIATION_SELECTOR_SUPPLEMENT_START && codePoint <= VARIATION_SELECTOR_SUPPLEMENT_END) return codePoint - VARIATION_SELECTOR_SUPPLEMENT_START + 16;
    return null;
}
function encode(emoji, bytes) {
    let encoded = emoji;
    for (const byte of bytes) encoded += toVariationSelector(byte);
    return encoded;
}
function decode(text) {
    let decoded = [];
    const chars = Array.from(text);
    let startIndex = 0;
    for (let i = 0; i < chars.length; i++) {
        if (fromVariationSelector(chars[i].codePointAt(0)) === null) {
            startIndex = i + 1;
            break;
        }
    }
    for (let i = startIndex; i < chars.length; i++) {
        const byte = fromVariationSelector(chars[i].codePointAt(0));
        if (byte !== null) decoded.push(byte);
        else break;
    }
    return new Uint8Array(decoded);
}

// ========== Compression & Encryption Classes ==========
class AdvancedCompression {
    static compress(text) {
        if (!text) return new Uint8Array([]);
        try {
            if (typeof pako === 'undefined') {
                console.warn('Pako library not found, falling back to raw bytes.');
                return encoder.encode(text);
            }
            return pako.deflate(text);
        } catch (error) {
            console.error('Pako compression error:', error);
            return encoder.encode(text);
        }
    }
    static decompress(data) {
        if (!data || data.length === 0) return '';
        try {
            if (typeof pako === 'undefined') {
                console.warn('Pako library not found, falling back to standard decoder.');
                return decoder.decode(data);
            }
            return pako.inflate(data, { to: 'string' });
        } catch (error) {
            console.error('Pako decompression error:', error);
            try { return decoder.decode(data); } catch (e) { console.error('Final fallback decode error:', e); return ''; }
        }
    }
}
class PBKDF2Encryption {
    static async generateKey(password, salt, iterations) {
        const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']);
        return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    }
    static async decrypt(encryptedData, salt, iv, password, iterations) {
        const key = await this.generateKey(password, salt, iterations);
        const aad = encoder.encode('EmojiCipherPro-v2.1');
        const decryptedData = await crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: aad }, key, encryptedData);
        return new Uint8Array(decryptedData);
    }
}
class AdvancedEncryption {
    static async generateKey(password, salt, strength) {
        if (typeof argon2 === 'undefined') throw new Error("Argon2 library not available.");
        const params = {
            low: { time: 1, mem: 1024, hashLen: 32, parallelism: 1, type: argon2.ArgonType.Argon2id },
            medium: { time: 2, mem: 2048, hashLen: 32, parallelism: 1, type: argon2.ArgonType.Argon2id },
            high: { time: 3, mem: 4096, hashLen: 32, parallelism: 1, type: argon2.ArgonType.Argon2id }
        }[strength] || strengthSettings.medium;
        const argon2Result = await argon2.hash({ pass: password, salt, ...params });
        return crypto.subtle.importKey('raw', argon2Result.hash.slice(0, 32), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
    }
    static async encrypt(data, password, strength, salt, iv, additionalData) {
        const key = await this.generateKey(password, salt, strength);
        const encryptedData = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData, tagLength: 128 }, key, data);
        return { encrypted: new Uint8Array(encryptedData) };
    }
    static async decrypt(encryptedData, salt, iv, password, strength, additionalData) {
        const key = await this.generateKey(password, salt, strength);
        const decryptedData = await crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData, tagLength: 128 }, key, encryptedData);
        return { decrypted: new Uint8Array(decryptedData) };
    }
}

// ========== Core Crypto Operations ==========
async function encryptSingleText(text) {
    if (!text) return null;
    const useCompression = $('useCompression')?.checked ?? true;
    const useEncryption = $('useEncrypt')?.checked ?? false;
    const password = $('password')?.value ?? '';
    let payloadBytes = useCompression ? AdvancedCompression.compress(text) : encoder.encode(text);
    const header = { v: 3, ts: Date.now(), cmp: useCompression ? 1 : 0, enc: useEncryption && password ? 1 : 0, oSize: encoder.encode(text).length, salt: '', iv: '', strength: '' };
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
    combinedData.set(markerBytes, offset); offset += markerBytes.length;
    combinedData.set(headerBytes, offset); offset += headerBytes.length;
    combinedData.set(separatorBytes, offset); offset += separatorBytes.length;
    combinedData.set(payloadBytes, offset);
    const base64Data = bytesToBase64(combinedData);
    return encode(currentActiveChar, encoder.encode(base64Data));
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
            if (combinedData[j] === markerBytes[0]) {
                let match = true;
                for (let k = 1; k < markerBytes.length; k++) {
                    if (combinedData[j + k] !== markerBytes[k]) { match = false; break; }
                }
                if (match) { headerStart = j + markerBytes.length; break; }
            }
        }
        if (headerStart === -1) throw new Error("Invalid message format: Missing header marker");
        let separatorStart = -1;
        for (let j = headerStart; j <= combinedData.length - separatorBytes.length; j++) {
            if (combinedData[j] === separatorBytes[0]) { separatorStart = j; break; }
        }
        if (separatorStart === -1) throw new Error("Invalid message format: Missing separator");
        const headerBytes = combinedData.slice(headerStart, separatorStart);
        let payloadBytes = combinedData.slice(separatorStart + separatorBytes.length);
        let header;
        try {
            header = JSON.parse(decoder.decode(headerBytes));
        } catch (e) {
            throw new Error("تنسيق البيانات غير صالح. لا يمكن قراءة الـ header.");
        }
        if (header.enc || header.encryption) {
            const password = $('password')?.value ?? '';
            if (!password) {
                if (showToasts) showToast(`النص مشفر بكلمة سر، يرجى إدخال كلمة السر`, 'error');
                throw new Error("Password required");
            }
            const salt = base64ToBytes(header.salt);
            const iv = base64ToBytes(header.iv);
            if (header.v === 3) {
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
            } else {
                console.warn("Decrypting a message with legacy PBKDF2 encryption.");
                const iterations = header.iterations;
                if (!iterations) throw new Error("Missing encryption iterations for older version.");
                payloadBytes = await PBKDF2Encryption.decrypt(payloadBytes, salt, iv, password, iterations, headerBytes);
            }
        }
        const finalText = (header.cmp || header.compression) ? AdvancedCompression.decompress(payloadBytes) : decoder.decode(payloadBytes);
        return { text: finalText, stats: { originalSize: header.oSize || header.originalSize, compressedSize: header.cSize || header.compressedSize } };
    } catch (error) {
        console.error('Single message decoding error:', error);
        if (showToasts && error.message !== "Password required") showToast('حدث خطأ أثناء فك التشفير: ' + error.message, 'error');
        if (error.message === "Password required") throw error;
        return null;
    }
}
