// =================================================================================================
//                                    MAIN APP CONTROLLER
// =================================================================================================
// This file initializes the application and sets up all the main event listeners.
// It acts as the central coordinator for all other modules.

/**
 * Sets up all the event listeners for the application's UI.
 */
function setupEventListeners() {
    // Main actions
    $('encodeBtn')?.addEventListener('click', encodeText);
    $('decodeBtn')?.addEventListener('click', decodeText);
    $('swapBtn')?.addEventListener('click', swapDynamicCards);
    $('pasteBtn')?.addEventListener('click', pasteFromClipboard);
    $('deleteBtn')?.addEventListener('click', clearInput);
    $('copyBtn')?.addEventListener('click', () => copyToClipboard());
    $('shareBtn')?.addEventListener('click', shareContent);

    // Sidebar & Navigation
    $('menuToggle')?.addEventListener('click', toggleSidebar);
    $('closeSidebar')?.addEventListener('click', closeSidebar);
    const overlay = document.querySelector('.sidebar-overlay');
    if (overlay) {
        overlay.addEventListener('click', closeSidebar);
    }
    $('resetBtn')?.addEventListener('click', resetApp);
    document.querySelectorAll('.sidebar-tab').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    // Text area auto-growth
    $('inputText')?.addEventListener('input', (e) => {
        autoGrowTextarea(e.target);
        updateCharCount();
    });

    // --- Settings Tab Event Listeners ---
    $('autoThemeToggle')?.addEventListener('change', (e) => {
        appSettings.autoTheme = e.target.checked;
        if (appSettings.autoTheme) {
            $('darkThemeToggle').checked = window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        applyTheme();
        saveSettings();
    });

    $('darkThemeToggle')?.addEventListener('change', (e) => {
        appSettings.darkMode = e.target.checked;
        appSettings.autoTheme = false;
        $('autoThemeToggle').checked = false;
        applyTheme();
        saveSettings();
    });

    $('fontSizeSelector')?.addEventListener('change', (e) => {
        appSettings.fontSize = e.target.value;
        changeFontSize(appSettings.fontSize);
        saveSettings();
    });

    $('themeSelector')?.addEventListener('change', (e) => {
        appSettings.theme = e.target.value;
        changeColorTheme(appSettings.theme);
        saveSettings();
    });

    // --- Cipher/Advanced Options Event Listeners ---
    $('useCompression')?.addEventListener('change', (e) => {
        appSettings.useCompression = e.target.checked;
        saveSettings();
        updateCharCount(); // Recalculate size estimate
    });
    $('autoCopyEncodedEmoji')?.addEventListener('change', e => { appSettings.autoCopyEncoded = e.target.checked; saveSettings(); });
    $('autoCopyDecodedText')?.addEventListener('change', e => { appSettings.autoCopyDecoded = e.target.checked; saveSettings(); });
    $('showNotifications')?.addEventListener('change', e => { appSettings.showNotifications = e.target.checked; saveSettings(); });
    $('useEncrypt')?.addEventListener('change', e => {
        appSettings.useEncryption = e.target.checked;
        $('passwordSection').classList.toggle('hidden', !appSettings.useEncryption);
        saveSettings();
    });
    $('togglePassword')?.addEventListener('click', togglePasswordVisibility);
    $('password')?.addEventListener('input', checkPasswordStrength);
    $('encryptionStrength')?.addEventListener('change', e => { appSettings.encryptionStrength = e.target.value; saveSettings(); });


    // --- Character Set Switch ---
    const charSetSwitches = [$('charSetSwitch'), $('manageCharSetSwitch')];
    charSetSwitches.forEach(s => {
        s?.addEventListener('change', (e) => {
            useAlphanumeric = e.target.checked;
            appSettings.charSet = useAlphanumeric ? 'alphanumeric' : 'emoji';
            // Sync the other switch
            charSetSwitches.forEach(sw => { if(sw) sw.checked = useAlphanumeric; });
            renderCharacterList();
            saveSettings();
        });
    });


    // --- Emoji Management Tab Event Listeners ---
    $('addEmojiBtn')?.addEventListener('click', () => addNewChar($('newEmoji').value));
    $('newEmoji')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') addNewChar(e.target.value); });
    $('resetEmoji')?.addEventListener('click', resetCharList);

    // --- History Tab Event Listeners ---
    $('importHistoryBtn')?.addEventListener('click', () => $('historyFileInput').click());
    $('historyFileInput')?.addEventListener('change', importHistory);
    $('exportHistoryBtn')?.addEventListener('click', exportHistory);
    $('clearHistory')?.addEventListener('click', clearHistory);
    document.querySelectorAll('.history-filter-container .btn-filter').forEach(button => {
        button.addEventListener('click', (e) => {
            document.querySelector('.history-filter-container .btn-filter.active').classList.remove('active');
            e.currentTarget.classList.add('active');
            historyFilter = e.currentTarget.dataset.filter;
            renderHistory();
        });
    });

    // --- Keyboard Shortcuts ---
    document.addEventListener('keydown', e => {
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            encodeText();
        }
        if (e.ctrlKey && e.shiftKey && e.key === 'Enter') {
            e.preventDefault();
            decodeText();
        }
        if (e.key === 'Escape') {
            if (isSidebarOpen) closeSidebar();
        }
    });
}

/**
 * Initializes the application.
 * This function is called when the DOM is fully loaded.
 */
async function initApp() {
    try {
        console.log('Initializing شفرينش v' + APP_VERSION);

        // 1. Load all data and settings from storage
        loadSettings();
        loadHistory();
        loadEmojiList();
        loadAlphanumericList();

        // 2. Apply settings to the UI
        applyTheme(); // Applies dark mode
        changeColorTheme(appSettings.theme);
        changeFontSize(appSettings.fontSize);

        // 3. Initialize UI components with loaded data
        updateCharCount();
        renderCharacterList();
        renderHistory();

        // 4. Set up the crypto worker
        initCryptoWorker();

        // 5. Set up all event listeners
        setupEventListeners();

        // 6. Final UI state setup
        switchTab('cipher');
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            if (appSettings.autoTheme) applyTheme();
        });

        console.log('شفرينش initialized successfully!');
        showToast('تم تحميل تطبيق شفرينش بنجاح', 'success');

    } catch (error) {
        console.error('Fatal error initializing application:', error);
        showToast(`حدث خطأ فادح أثناء تحميل التطبيق: ${error.message}`, 'error');
    }
}

// --- Start the application ---
document.addEventListener('DOMContentLoaded', initApp);
