// شفرينش - Main Application Controller
// This file initializes the application and handles top-level event delegation.

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
        showToast('حدث خطأ أثناء تحميل التطبيق: ' + error.message, 'error', 5000);
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
