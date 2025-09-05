import { $, showToast, updateCharCount, updateStats, showResultsSection, renderEmojis, renderHistory, applySettings, setupEventListeners, switchTab } from './ui.js';
import { appSettings, emojiList, historyItems, currentActiveEmoji, loadSettings, loadEmojis, loadHistory, addToHistory } from './state.js';
import { AdvancedCompression, AdvancedEncryption, AdvancedCRC, bytesToBase64, base64ToBytes, encode, decode, HEADER_MARKER, SEPARATOR, encoder, decoder } from './crypto.js';
import { copyToClipboard } from './clipboard.js';

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

    const encodeBtn = $('encodeBtn');
    const originalBtnContent = encodeBtn.innerHTML;
    encodeBtn.innerHTML = '<div class="spinner"></div> جاري التشفير...';
    encodeBtn.disabled = true;

    try {
        showToast('جاري التشفير...', 'info', 1000);

        const useCompression = $('useCompression')?.checked ?? true;
        const useEncryption = $('useEncrypt')?.checked ?? false;
        const password = $('password')?.value ?? '';

        let payloadBytes;
        if (useCompression) {
            payloadBytes = AdvancedCompression.compress(encoder.encode(text));
        } else {
            payloadBytes = encoder.encode(text);
        }

        let encryptionData = null;
        if (useEncryption && password) {
            encryptionData = await AdvancedEncryption.encrypt(
                payloadBytes,
                password,
                appSettings.encryptionStrength
            );
            payloadBytes = encryptionData.encrypted;
        }

        const header = {
            version: 2,
            timestamp: Date.now(),
            compression: useCompression ? 1 : 0,
            encryption: useEncryption && password ? 1 : 0,
            crc32: AdvancedCRC.calculate(text),
            originalSize: encoder.encode(text).length,
            compressedSize: payloadBytes.length,
            salt: encryptionData ? bytesToBase64(encryptionData.salt) : '',
            iv: encryptionData ? bytesToBase64(encryptionData.iv) : '',
            iterations: encryptionData ? encryptionData.iterations : 0,
            algorithm: 'AES-GCM-256',
            encoding: 'UTF-8'
        };

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

        const result = encode(currentActiveEmoji, combinedData);

        output.value = result;
        output.classList.add('has-content');

        updateStats(header.originalSize, header.compressedSize, text.length);
        addToHistory(text, result, 'encode');

        if (appSettings.autoCopyEncodedEmoji) {
            await copyToClipboard(result);
            showToast('تم التشفير ونسخ النتيجة تلقائياً', 'success');
        } else {
            showToast('تم تشفير النص بنجاح', 'success');
        }

        showResultsSection();

    } catch (error) {
        console.error('Encoding error:', error);
        showToast('حدث خطأ أثناء التشفير: ' + error.message, 'error');
    } finally {
        encodeBtn.innerHTML = originalBtnContent;
        encodeBtn.disabled = false;
    }
}

async function decodeSingleMessage(src, { showToasts = true } = {}) {
    try {
        const combinedData = decode(src);
        if (combinedData.length === 0) {
            if (showToasts) showToast('لم يتم العثور على بيانات مشفرة صالحة', 'error');
            return null;
        }

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

        const headerText = decoder.decode(headerBytes);
        let header;
        try {
            header = JSON.parse(headerText);
        } catch (e) {
            if (showToasts) showToast('البيانات الوصفية غير صالحة أو تالفة.', 'error');
            return null;
        }

        if (header.encryption) {
            const password = $('password')?.value ?? '';
            if (!password) {
                if (showToasts) showToast(`النص مشفر بكلمة سر، يرجى إدخال كلمة السر`, 'error');
                throw new Error("Password required");
            }

            try {
                const salt = base64ToBytes(header.salt);
                const iv = base64ToBytes(header.iv);
                const iterations = header.iterations || 100000;

                payloadBytes = await AdvancedEncryption.decrypt(payloadBytes, salt, iv, password, iterations);
            } catch (e) {
                console.error(`Decryption error:`, e);
                if (showToasts) showToast(`فشل في فك التشفير - قد تكون كلمة السر خاطئة`, 'error');
                return null;
            }
        }

        let finalText;
        if (header.compression) {
            finalText = decoder.decode(AdvancedCompression.decompress(payloadBytes));
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

    const decodeBtn = $('decodeBtn');
    const originalBtnContent = decodeBtn.innerHTML;
    decodeBtn.innerHTML = '<div class="spinner"></div> جاري فك التشفير...';
    decodeBtn.disabled = true;

    showToast('جاري فك التشفير...', 'info', 1000);

    try {
        const result = await decodeSingleMessage(src);

        if (result && result.text !== null) {
            output.value = result.text;
            output.classList.add('has-content');

            updateStats(result.stats.originalSize, result.stats.compressedSize, result.text.length);

            if (appSettings.autoCopyDecodedText) {
                await copyToClipboard(result.text);
                showToast(`تم فك تشفير النص ونسخ النتيجة تلقائياً`, 'success');
            } else {
                showToast(`تم فك تشفير النص بنجاح`, 'success');
            }

            showResultsSection();
        }
    } catch (error) {
        console.error('Decoding error:', error);
        showToast('حدث خطأ أثناء فك التشفير: ' + error.message, 'error');
    } finally {
        decodeBtn.innerHTML = originalBtnContent;
        decodeBtn.disabled = false;
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
        updateStats(totalOriginalSize, totalCompressedSize, output.value.length);
        showToast(`تم فك تشفير ${decodedCount} رسالة بنجاح.`, 'success');
        showResultsSection();
    } else {
        showToast('تم البحث ولكن لم يتم العثور على رسائل مشفرة صالحة.', 'warning');
    }
}

async function initApp() {
    try {
        console.log('Initializing Enhanced Emoji Cipher Pro with Multi-Emoji Support...');

        loadSettings();
        loadEmojis();
        loadHistory();

        applySettings();

        renderEmojis();
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
        showToast('تم تحميل التطبيق المحسن مع دعم عدة إيموجي بنجاح', 'success');

    } catch (error) {
        console.error('Error initializing app:', error);
        showToast('حدث خطأ أثناء تحميل التطبيق', 'error');
    }
}

window.EmojiCipherPro = {
    switchTab
};

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

export { encodeText, decodeText, decodeMultipleText, switchTab };
