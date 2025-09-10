// =================================================================================================
//                                    USER ACTIONS
// =================================================================================================
// This file contains the core logic for user-initiated actions like encoding and decoding text.

/**
 * Encodes the text from the input area.
 * It handles both standard and encrypted encoding.
 */
async function encodeText() {
    if (isProcessing) {
        showToast("عملية أخرى قيد التنفيذ، يرجى الانتظار.", "warning");
        return;
    }

    const text = document.getElementById('inputText').value;
    const selectedChar = getSelectedChar(); // from char-management.js

    if (!text) {
        showToast("الرجاء إدخال نص لتشفيره.", "error");
        return;
    }
    if (!selectedChar) {
        showToast("الرجاء اختيار رمز حاوية.", "error");
        return;
    }

    isProcessing = true;
    showLoading(true); // from ui.js

    try {
        const result = await cryptoEncode(text, selectedChar); // from crypto.js
        displayResult(result.encoded, result.stats); // from ui.js
        addHistoryItem('encode', text, result.encoded); // from storage.js
        if (appSettings.autoCopyEncoded) {
            copyToClipboard(result.encoded, "تم نسخ النص المشفر بنجاح!");
        }
    } catch (error) {
        console.error("Encoding failed:", error);
        showToast(`فشل التشفير: ${error.message}`, "error");
        displayResult("", {}); // Clear previous results
    } finally {
        isProcessing = false;
        showLoading(false);
    }
}

/**
 * Decodes the text from the input area.
 * It handles both standard and encrypted decoding.
 */
async function decodeText() {
    if (isProcessing) {
        showToast("عملية أخرى قيد التنفيذ، يرجى الانتظار.", "warning");
        return;
    }

    const encodedText = document.getElementById('inputText').value;
    if (!encodedText) {
        showToast("الرجاء إدخال نص لفك تشفيره.", "error");
        return;
    }

    isProcessing = true;
    showLoading(true);

    try {
        const result = await cryptoDecode(encodedText); // from crypto.js
        displayResult(result.decoded, result.stats, true); // from ui.js
        addHistoryItem('decode', encodedText, result.decoded); // from storage.js
        if (appSettings.autoCopyDecoded) {
            copyToClipboard(result.decoded, "تم نسخ النص المفكوك بنجاح!");
        }
    } catch (error) {
        console.error("Decoding failed:", error);
        showToast(`فشل فك التشفير: ${error.message}`, "error");
        displayResult("", {}); // Clear previous results
    } finally {
        isProcessing = false;
        showLoading(false);
    }
}
