// شفرينش - History Management
// This file contains all functions related to managing the operation history,
// including adding items, rendering the list, filtering, and import/export.

function addToHistory(text, result, operation) {
    if (!appSettings.saveHistory) return;
    const timestamp = new Date().toISOString();
    historyItems.unshift({
        text: text.substring(0, 100),
        result,
        timestamp,
        operation
    });
    if (historyItems.length > 50) historyItems = historyItems.slice(0, 50);
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
            <div class="history-item-header">
                <div class="history-item-op">
                    <i class="fas ${opIcon}"></i>
                    <span>${opText}</span>
                </div>
                <div class="history-item-date">${date}</div>
            </div>
            <div class="history-item-body">
                <p class="history-text">${originalText.replace(/</g, '&lt;')}</p>
                <p class="history-result-preview">النتيجة: <span>${resultText.substring(0, 20)}...</span></p>
            </div>
            <div class="history-item-actions">
                <button class="icon-btn-sm restore-history-btn" title="تحميل النص الأصلي إلى المحرر"><i class="fas fa-upload"></i></button>
                <button class="icon-btn-sm copy-history-btn" title="نسخ النتيجة"><i class="far fa-copy"></i></button>
                <button class="icon-btn-sm share-history-btn" title="مشاركة النتيجة"><i class="fas fa-share-alt"></i></button>
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
        historyItem.querySelector('.copy-history-btn').addEventListener('click', (e) => { e.stopPropagation(); copyToClipboard(resultText); });
        historyItem.querySelector('.share-history-btn').addEventListener('click', (e) => { e.stopPropagation(); shareHistoryItem(resultText); });
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
    if (historyItems.length === 0) { showToast('لا يوجد شيء في السجل لتصديره', 'warning'); return; }
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
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const importedItems = JSON.parse(e.target.result);
            if (!Array.isArray(importedItems)) throw new Error('الملف غير صالح، البيانات ليست مصفوفة.');
            const validItems = importedItems.filter(item => item && typeof item.text === 'string' && typeof item.result === 'string' && typeof item.timestamp === 'string');
            if (validItems.length === 0) { showToast('لم يتم العثور على عناصر صالحة في الملف المستورد', 'warning'); return; }
            const historyMap = new Map();
            [...historyItems, ...validItems].forEach(item => historyMap.set(item.timestamp, item));
            historyItems = Array.from(historyMap.values());
            historyItems.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            if (historyItems.length > 50) historyItems = historyItems.slice(0, 50);
            saveHistory();
            renderHistory();
            showToast(`تم استيراد ${validItems.length} عنصر بنجاح`, 'success');
        } catch (error) {
            console.error('Import error:', error);
            showToast(`فشل استيراد الملف: ${error.message}`, 'error');
        } finally {
            event.target.value = '';
        }
    };
    reader.onerror = () => { showToast('فشل في قراءة الملف', 'error'); };
    reader.readAsText(file);
}
