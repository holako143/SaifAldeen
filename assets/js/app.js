// شفرينش - Main Application Controller
// This file initializes the application and handles top-level event delegation.

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

// ========== Data Management ==========
function saveSettings() { if (appSettings.autoSave) localStorage.setItem('emojiCipher_settings', JSON.stringify(appSettings)); }
function loadSettings() { const saved = localStorage.getItem('emojiCipher_settings'); if (saved) try { appSettings = { ...appSettings, ...JSON.parse(saved) }; } catch (e) { console.error('Error loading settings:', e); } }
function saveEmojis() { localStorage.setItem('emojiCipher_emojis', JSON.stringify(emojiList)); }
function saveAlphanumericChars() { localStorage.setItem('shifrenish_alphanumeric', JSON.stringify(alphanumericChars)); }
function loadEmojis() { const saved = localStorage.getItem('emojiCipher_emojis'); if (saved) try { emojiList = JSON.parse(saved); if (emojiList.length === 0) emojiList = [...defaultEmojis]; } catch (e) { console.error('Error loading emojis:', e); emojiList = [...defaultEmojis]; } currentActiveChar = emojiList[0]; }
function loadAlphanumericChars() { const saved = localStorage.getItem('shifrenish_alphanumeric'); if (saved) try { const parsed = JSON.parse(saved); if (Array.isArray(parsed) && parsed.length > 0) alphanumericChars = parsed; } catch (e) { console.error('Error loading alphanumeric chars:', e); } }
function saveHistory() { if (appSettings.saveHistory) localStorage.setItem('emojiCipher_history', JSON.stringify(historyItems)); }
function loadHistory() { const saved = localStorage.getItem('emojiCipher_history'); if (saved) try { historyItems = JSON.parse(saved); } catch (e) { console.error('Error loading history:', e); historyItems = []; } }

// ========== App Lifecycle ==========
function applySettings() {
    applyTheme();
    changeFontSize(appSettings.fontSize);
    document.body.classList.add(`theme-${appSettings.themeColor}`);
    const themeSelector = $('themeSelector');
    if (themeSelector) themeSelector.value = appSettings.themeColor;
    // ... apply other settings ...
}

function resetApp() {
    if (confirm('هل أنت متأكد من رغبتك في إعادة تعيين التطبيق؟')) {
        localStorage.clear();
        location.reload();
    }
}

function setupEventListeners() {
    // Main actions
    $('encodeBtn')?.addEventListener('click', encodeText);
    $('decodeBtn')?.addEventListener('click', decodeText);
    $('swapBtn')?.addEventListener('click', swapDynamicCards);
    $('pasteBtn')?.addEventListener('click', pasteFromClipboard);
    $('deleteBtn')?.addEventListener('click', clearInput);
    $('copyBtn')?.addEventListener('click', () => copyToClipboard());
    $('shareBtn')?.addEventListener('click', shareContent);

    // QR Code
    $('qrExportBtn')?.addEventListener('click', exportAsQR);
    $('qrImportBtn')?.addEventListener('click', startScanner);
    $('closeQrModal')?.addEventListener('click', () => $('qrModal').classList.add('hidden'));
    $('closeScannerModal')?.addEventListener('click', stopScanner);

    // Sidebar & Navigation
    $('menuToggle')?.addEventListener('click', toggleSidebar);
    $('closeSidebar')?.addEventListener('click', closeSidebar);
    document.querySelector('.sidebar-overlay')?.addEventListener('click', closeSidebar);
    $('resetBtn')?.addEventListener('click', resetApp);
    document.querySelectorAll('.sidebar-tab').forEach(tab => tab.addEventListener('click', () => switchTab(tab.dataset.tab)));

    // Settings
    $('batchModeToggle')?.addEventListener('change', (e) => {
        batchMode = e.target.checked;
        const inputLabel = document.querySelector('label[for="inputText"]');
        const outputLabel = $('outputLabel');
        if (batchMode) {
            if (inputLabel) inputLabel.textContent = 'النصوص المراد معالجتها (كل نص في سطر)';
            if (outputLabel) outputLabel.textContent = 'النتائج';
        } else {
            if (inputLabel) inputLabel.textContent = 'النص المراد تشفيره أو فك تشفيره';
            if (outputLabel) outputLabel.textContent = 'النتيجة';
        }
    });
    // ... other settings listeners

    // Character Management
    $('manageCharSetSwitch')?.addEventListener('change', (e) => {
        managingAlphanumeric = e.target.checked;
        renderManagedList();
    });
    // ... other char management listeners

    // History
    $('importHistoryBtn')?.addEventListener('click', () => $('historyFileInput').click());
    $('historyFileInput')?.addEventListener('change', importHistory);
    $('exportHistoryBtn')?.addEventListener('click', exportHistory);
    $('clearHistory')?.addEventListener('click', clearHistory);
    document.querySelectorAll('.history-filter-container .btn-filter').forEach(button => {
        button.addEventListener('click', () => {
            historyFilter = button.dataset.filter;
            renderHistory();
        });
    });
}

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
            if (appSettings.theme === 'auto') applyTheme();
        });
        console.log('شفرينش initialized successfully!');
        showToast('تم تحميل تطبيق شفرينش بنجاح', 'success');
        animateEmojiGrid();
    } catch (error) {
        console.error('Error initializing app:', error);
        showToast('حدث خطأ أثناء تحميل التطبيق', 'error');
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
