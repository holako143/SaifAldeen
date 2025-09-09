// ========== Main Action Controllers ==========

async function encodeText() {
    const inputText = $('inputText');
    const output = $('output');
    if (!inputText || !output) { showToast('عناصر الواجهة غير متوفرة', 'error'); return; }
    const fullInput = inputText.value.trim();
    if (!fullInput) { showToast('يرجى إدخال نص للتشفير', 'error'); return; }
    showToast('جاري التشفير...', 'info', 1000);
    output.innerHTML = '';
    if (batchMode) {
        const lines = fullInput.split('\n').filter(line => line.trim() !== '');
        if (lines.length === 0) { showToast('لم يتم العثور على نصوص صالحة للمعالجة', 'warning'); return; }
        showResultCard(true);
        let resultsHtml = '';
        let processedCount = 0;
        for (const line of lines) {
            try {
                const result = await encryptSingleText(line.trim());
                if (result) {
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
                output.textContent = result;
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

async function decodeText() {
    const inputText = $('inputText');
    const output = $('output');
    if (!inputText || !output) { showToast('عناصر الواجهة غير متوفرة', 'error'); return; }
    const src = inputText.value.trim();
    if (!src) { showToast('يرجى إدخال نص مشفر', 'error'); return; }
    output.innerHTML = '';
    if (batchMode) {
        await decodeBatchText(src, output);
    } else {
        showToast('جاري فك التشفير...', 'info', 1000);
        const result = await decodeSingleMessage(src);
        if (result && result.text !== null) {
            output.textContent = result.text;
            setTimeout(() => { updateStats(result.stats.originalSize, result.stats.compressedSize, result.text.length); }, 0);
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
    if (matches.length === 0) { showToast('لم يتم العثور على أي رموز معروفة للبدء بها.', 'error'); return; }
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
            if (e.message === "Password required") { showToast(`رسالة مشفرة بكلمة سر، يرجى إدخال كلمة السر ثم المحاولة مجدداً`, 'error'); return; }
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

async function shareContent() {
    const output = $('output');
    let content = batchMode ? Array.from(output.querySelectorAll('.batch-result-item span')).map(s => s.textContent).join('\n') : output.textContent;
    if (!content) { showToast('لا يوجد محتوى للمشاركة', 'warning'); return; }
    const title = 'شفرينش - نص مشفر';
    try {
        if (navigator.share) {
            await navigator.share({ title: title, text: content });
            showToast('تم فتح نافذة المشاركة', 'success');
        } else {
            showShareModal([
                { name: 'WhatsApp', icon: 'fab fa-whatsapp', color: '#25D366', url: `https://wa.me/?text=${encodeURIComponent(content)}` },
                { name: 'Telegram', icon: 'fab fa-telegram', color: '#0088cc', url: `https://t.me/share/url?text=${encodeURIComponent(content)}` },
                { name: 'Twitter', icon: 'fab fa-twitter', color: '#1DA1F2', url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(content)}` },
                { name: 'نسخ الرابط', icon: 'fas fa-link', color: '#6B7280', action: 'copy' }
            ], content);
        }
    } catch (error) {
        console.error('Share error:', error);
        showToast('حدث خطأ أثناء المشاركة', 'error');
    }
}
