// ========== Helper Functions ==========
export function bytesToBase64(bytes) {
    const binString = String.fromCodePoint(...bytes);
    return btoa(binString);
}

export function base64ToBytes(base64) {
    const binString = atob(base64);
    return Uint8Array.from(binString, m => m.codePointAt(0));
}

// ========== Unicode Variation Selector Encoding ==========
const VARIATION_SELECTOR_START = 0xfe00;
const VARIATION_SELECTOR_END = 0xfe0f;
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

export function encode(emoji, bytes) {
    let encoded = emoji;
    for (const byte of bytes) {
        encoded += toVariationSelector(byte);
    }
    return encoded;
}

export function decode(text) {
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

// ========== LZW Compression System ==========
export class AdvancedCompression {
    static compress(data) {
        if (!data) return new Uint8Array([]);

        let dict = new Map();
        for (let i = 0; i < 256; i++) {
            dict.set(String.fromCharCode(i), i);
        }

        let p = "";
        let out = [];
        let code = 256;

        for (let i = 0; i < data.length; i++) {
            const c = String.fromCharCode(data[i]);
            const pc = p + c;
            if (dict.has(pc)) {
                p = pc;
            } else {
                out.push(dict.get(p));
                dict.set(pc, code);
                code++;
                p = c;
            }
        }
        out.push(dict.get(p));

        const result = new Uint16Array(out);
        return new Uint8Array(result.buffer);
    }

    static decompress(data) {
        if (!data || data.length === 0) return new Uint8Array([]);

        let dict = new Map();
        for (let i = 0; i < 256; i++) {
            dict.set(i, String.fromCharCode(i));
        }

        const codes = new Uint16Array(data.buffer);
        let p = String.fromCharCode(codes[0]);
        let out = [p];
        let code = 256;

        for (let i = 1; i < codes.length; i++) {
            const k = codes[i];
            let entry;
            if (dict.has(k)) {
                entry = dict.get(k);
            } else if (k === code) {
                entry = p + p.charAt(0);
            } else {
                return null; // Should not happen
            }

            out.push(entry);
            dict.set(code, p + entry.charAt(0));
            code++;
            p = entry;
        }

        const decodedString = out.join('');
        const bytes = new Uint8Array(decodedString.length);
        for (let i = 0; i < decodedString.length; i++) {
            bytes[i] = decodedString.charCodeAt(i);
        }
        return bytes;
    }
}

// ========== Enhanced Encryption System ==========
export class AdvancedEncryption {
    static async generateKey(password, salt, iterations = 100000) {
        const encoder = new TextEncoder();
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
        const encoder = new TextEncoder();
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
        const encoder = new TextEncoder();
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
export class AdvancedCRC {
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
        const encoder = new TextEncoder();
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

export const HEADER_MARKER = '\u061C';
export const SEPARATOR = '\u034F';
export const encoder = new TextEncoder();
export const decoder = new TextDecoder('utf-8', { fatal: false, ignoreBOM: true });
