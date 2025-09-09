// Crypto Worker for Emoji Cipher Pro
// This worker handles heavy encryption and decryption tasks off the main thread.

// ========== Helper Functions ==========
const encoder = new TextEncoder();

function bytesToBase64(bytes) {
    const binString = String.fromCodePoint(...bytes);
    return btoa(binString);
}

function base64ToBytes(base64) {
    const binString = atob(base64);
    return Uint8Array.from(binString, m => m.codePointAt(0));
}

// ========== Enhanced Encryption System ==========
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

    static async encrypt(data, password, strength = 'high', salt, iv, additionalData = new Uint8Array()) {
        const iterations = {
            'low': 50000,
            'medium': 100000,
            'high': 200000
        }[strength] || 100000;

        const key = await this.generateKey(password, salt, iterations);

        const encryptedData = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv, additionalData },
            key,
            data
        );

        return {
            encrypted: new Uint8Array(encryptedData),
            iterations: iterations
        };
    }

    static async decrypt(encryptedData, salt, iv, password, iterations = 100000, additionalData = new Uint8Array()) {
        const key = await this.generateKey(password, salt, iterations);

        const decryptedData = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv, additionalData },
            key,
            encryptedData
        );

        return new Uint8Array(decryptedData);
    }
}

// ========== Worker Message Handler ==========
self.onmessage = async (event) => {
    const { id, type, payload } = event.data;

    try {
        let result;
        if (type === 'encrypt') {
            result = await AdvancedEncryption.encrypt(
                payload.data,
                payload.password,
                payload.strength,
                payload.salt,
                payload.iv,
                payload.additionalData
            );
        } else if (type === 'decrypt') {
            result = await AdvancedEncryption.decrypt(
                payload.encryptedData,
                payload.salt,
                payload.iv,
                payload.password,
                payload.iterations,
                payload.additionalData
            );
        } else {
            throw new Error(`Unknown action type: ${type}`);
        }

        self.postMessage({ id, status: 'success', payload: result });

    } catch (error) {
        self.postMessage({ id, status: 'error', payload: error.message });
    }
};
