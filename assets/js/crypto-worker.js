// شفرينش - عامل التشفير
// This worker handles heavy cryptographic operations (Argon2) to avoid blocking the main UI thread.

// Since this is a worker, we need to import any scripts we need.
// The main app includes these in the HTML, but workers have their own scope.
try {
    self.importScripts(
        'https://cdnjs.cloudflare.com/ajax/libs/argon2-browser/1.18.0/argon2-browser.min.js'
    );
} catch (e) {
    console.error('Crypto Worker: Failed to import Argon2 script.', e);
    // We can't proceed without the library. Post an error back for any waiting calls.
    self.postMessage({ id: -1, status: 'error', payload: 'Argon2 library failed to load in worker.' });
}


// ========== Web Worker Event Listener ==========
self.onmessage = async (event) => {
    const { id, type, payload } = event.data;

    if (typeof argon2 === 'undefined') {
        self.postMessage({ id, status: 'error', payload: 'Argon2 is not available in the worker.' });
        return;
    }

    try {
        let result;
        if (type === 'encrypt') {
            result = await encrypt(payload);
        } else if (type === 'decrypt') {
            result = await decrypt(payload);
        } else {
            throw new Error(`Unknown worker command: ${type}`);
        }
        // Post the result back to the main thread.
        // The result's ArrayBuffer needs to be transferred for performance.
        const buffer = result.encrypted ? result.encrypted.buffer : result.decrypted.buffer;
        self.postMessage({ id, status: 'success', payload: result }, [buffer]);

    } catch (error) {
        console.error(`Error in crypto worker (${type}):`, error);
        self.postMessage({ id, status: 'error', payload: error.message });
    }
};

// ========== Argon2 Key Generation ==========
async function generateKey(password, salt, strength) {
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

    // Use the first 32 bytes of the hash for a 256-bit AES key.
    const keyBytes = argon2Result.hash.slice(0, 32);
    return crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

// ========== Encryption Logic ==========
async function encrypt({ data, password, strength, salt, iv, additionalData }) {
    if (!data || !password || !salt || !iv) {
        throw new Error('Encryption error: Missing required parameters in worker.');
    }
    const key = await generateKey(password, salt, strength);
    const encryptedData = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv, additionalData, tagLength: 128 },
        key,
        data
    );
    return { encrypted: new Uint8Array(encryptedData) };
}

// ========== Decryption Logic ==========
async function decrypt({ encryptedData, salt, iv, password, strength, additionalData }) {
    if (!encryptedData || !password || !salt || !iv) {
        throw new Error('Decryption error: Missing required parameters in worker.');
    }
    const key = await generateKey(password, salt, strength);
    const decryptedData = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv, additionalData, tagLength: 128 },
        key,
        encryptedData
    );
    return { decrypted: new Uint8Array(decryptedData) };
}
