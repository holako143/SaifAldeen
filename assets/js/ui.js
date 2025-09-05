import { appSettings, emojiList, historyItems, currentActiveEmoji, defaultEmojis, saveSettings, saveEmojis, saveHistory, addToHistory, clearHistory, resetEmojiList, addNewEmoji, removeEmoji, setActiveEmoji } from './state.js';
import { encodeText, decodeText, decodeMultipleText } from './main.js';
import { copyToClipboard } from './clipboard.js';

export const $ = (id) => document.getElementById(id);

export function showToast(message, type = 'success', duration = 3000) {
    if (!appSettings.showNotifications) return;

    const container = $('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let iconClass = 'fas fa-check-circle';
    if (type === 'error') iconClass = 'fas fa-exclamation-circle';
    if (type === 'info') iconClass = 'fas fa-info-circle';
    if (type === 'warning') iconClass = 'fas fa-exclamation-triangle';

    toast.innerHTML = `
        <div class="icon"><i class="${iconClass}"></i></div>
        <div class="message">${message}</div>
        <button class="close-btn" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px)';
            setTimeout(() => toast.remove(), 300);
        }
    }, duration);
}

export function updateCharCount() {
    const inputText = $('inputText');
    const charCount = $('charCount');
    const sizeEstimate = $('sizeEstimate');

    if (!inputText || !charCount) return;

    const text = inputText.value;
    charCount.textContent = text.length;

    if (sizeEstimate) {
        sizeEstimate.textContent = '';
    }
}

export function updateStats(originalSize, compressedSize, textLength) {
    const originalSizeEl = $('originalSize');
    const compressedSizeEl = $('compressedSize');

    if (originalSizeEl) originalSizeEl.textContent = `${originalSize} بايت`;
    if (compressedSizeEl) compressedSizeEl.textContent = `${compressedSize} بايت`;

    if (originalSize > 0 && compressedSize > 0) {
        const ratio = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
        if (compressedSizeEl) {
            compressedSizeEl.textContent += ` (${ratio}% توفير)`;
        }
    }
}

export function showResultsSection() {
    const resultsSection = $('resultsSection');
    if (resultsSection) {
        resultsSection.style.display = 'block';
        resultsSection.classList.remove('hidden');
        const statsSection = $('statsSection');
        if (statsSection) {
            statsSection.classList.add('fade-in');
        }

        setTimeout(() => {
            resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
    }
}

export function renderEmojis() {
    const emojiSlider = $('emojiSlider');
    if (!emojiSlider) return;

    emojiSlider.innerHTML = '';
    emojiList.forEach((emoji) => {
        const emojiEl = document.createElement('div');
        emojiEl.className = 'emoji-item';
        emojiEl.textContent = emoji;
        emojiEl.title = `استخدام ${emoji} كحاوية للتشفير`;

        if (emoji === currentActiveEmoji) {
            emojiEl.classList.add('active');
        }

        emojiEl.addEventListener('click', () => setActiveEmoji(emoji));
        emojiSlider.appendChild(emojiEl);
    });

    renderCustomEmojiList();
}

export function renderCustomEmojiList() {
    const customEmojiList = $('customEmojiList');
    if (!customEmojiList) return;

    customEmojiList.innerHTML = '';

    if (emojiList.length === 0) {
        customEmojiList.innerHTML = '<p style="text-align: center; color: #64748b; padding: 2rem;">لا توجد إيموجيات</p>';
        return;
    }

    emojiList.forEach(emoji => {
        const emojiRow = document.createElement('div');
        emojiRow.className = 'emoji-manage-item';

        emojiRow.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.75rem;">
                <span style="font-size: 1.5rem;">${emoji}</span>
            </div>
            <button style="color: #ef4444; background: none; border: none; padding: 0.5rem; border-radius: 0.5rem; cursor: pointer; transition: all 0.2s;" title="حذف الإيموجي">
                <i class="fas fa-trash"></i>
            </button>
        `;

        const deleteBtn = emojiRow.querySelector('button');
        deleteBtn.addEventListener('click', () => removeEmoji(emoji));
        deleteBtn.addEventListener('mouseenter', () => {
            deleteBtn.style.background = 'rgba(239, 68, 68, 0.1)';
        });
        deleteBtn.addEventListener('mouseleave', () => {
            deleteBtn.style.background = 'none';
        });

        customEmojiList.appendChild(emojiRow);
    });
}

export function renderHistory() {
    const historyList = $('historyList');
    const emptyHistory = $('emptyHistory');
    const historyCount = $('historyCount');

    if (!historyList || !emptyHistory || !historyCount) return;

    historyList.innerHTML = '';

    if (historyItems.length === 0) {
        emptyHistory.classList.remove('hidden');
        historyCount.textContent = '0 عنصر محفوظ';
        return;
    }

    emptyHistory.classList.add('hidden');
    historyCount.textContent = `${historyItems.length} عنصر محفوظ`;

    historyItems.forEach(item => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';

        const date = new Date(item.timestamp).toLocaleString('ar-EG');
        historyItem.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <div style="flex: 1;">
                    <div style="font-size: 0.875rem; color: #64748b;">${date}</div>
                    <div style="font-weight: 500; margin: 0.25rem 0;">${item.text}${item.text.length >= 100 ? '...' : ''}</div>
                    <div style="font-size: 0.75rem; color: #64748b;">تشفير</div>
                </div>
                <div style="font-size: 1.5rem;">${item.result.substring(0, 1)}</div>
            </div>
        `;

        historyItem.addEventListener('click', () => {
            const inputText = $('inputText');
            if (inputText) {
                inputText.value = item.result;
                updateCharCount();
                switchTab('cipher');
                showToast('تم تحميل العنصر من السجل');
            }
        });

        historyItem.addEventListener('mouseenter', () => {
            historyItem.style.background = 'rgba(241,245,249,0.9)';
            historyItem.style.transform = 'translateX(-3px)';
        });

        historyItem.addEventListener('mouseleave', () => {
            historyItem.style.background = 'rgba(248,250,252,0.8)';
            historyItem.style.transform = 'translateX(0)';
        });

        historyList.appendChild(historyItem);
    });
}

export function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    const targetTab = $(`${tabName}Tab`);
    if (targetTab) {
        targetTab.classList.add('active');
    }

    document.querySelectorAll('.sidebar-tab').forEach(tab => {
        tab.classList.toggle('active', tab.getAttribute('data-tab') === tabName);
    });

    if (window.innerWidth <= 768) {
        closeSidebar();
    }
}

export function openSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        sidebar.classList.add('open');
        document.body.classList.add('sidebar-open');

        let overlay = document.querySelector('.sidebar-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'sidebar-overlay';
            document.body.appendChild(overlay);
            overlay.addEventListener('click', closeSidebar);
        }
        overlay.classList.add('active');
    }
}

export function closeSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');

    if (sidebar) {
        sidebar.classList.remove('open');
        document.body.classList.remove('sidebar-open');
    }

    if (overlay) {
        overlay.classList.remove('active');
    }
}

export function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar && sidebar.classList.contains('open')) {
        closeSidebar();
    } else {
        openSidebar();
    }
}

export function toggleTheme() {
    if (appSettings.theme === 'auto') {
        appSettings.theme = 'dark';
    } else if (appSettings.theme === 'dark') {
        appSettings.theme = 'light';
    } else {
        appSettings.theme = 'auto';
    }

    applyTheme();
    saveSettings();

    const themeNames = { 'auto': 'تلقائي', 'dark': 'داكن', 'light': 'فاتح' };
    showToast(`��م تغيير الثيم إلى: ${themeNames[appSettings.theme]}`);
}

export function applyTheme() {
    const toggleThemeBtn = $('toggleTheme');

    if (appSettings.theme === 'auto') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.body.classList.toggle('dark', prefersDark);
        if (toggleThemeBtn) {
            toggleThemeBtn.innerHTML = prefersDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        }
    } else {
        const isDark = appSettings.theme === 'dark';
        document.body.classList.toggle('dark', isDark);
        if (toggleThemeBtn) {
            toggleThemeBtn.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        }
    }
}

export function changeColorTheme(themeColor) {
    document.body.className = document.body.className.split(' ').filter(c => !c.startsWith('theme-')).join(' ');
    document.body.classList.add(`theme-${themeColor}`);

    appSettings.themeColor = themeColor;
    saveSettings();

    const themeNames = {
        'default': 'افتراضي',
        'blue-sky': 'سماء زرقاء',
        'green-forest': 'غابة خضراء',
        'purple-dream': 'حلم أرجواني',
        'sunset-glow': 'توهج الغروب',
        'cyber-pink': 'سايبر وردي',
        'elegant-night': 'ليل أنيق',
        'nature-calm': 'طبيعة هادئة'
    };

    showToast(`تم تغيير الثيم إلى: ${themeNames[themeColor] || themeColor}`);
}

export function changeFontSize(fontSize) {
    document.documentElement.style.fontSize = fontSize;
    appSettings.fontSize = fontSize;
    saveSettings();
    showToast(`تم تغيير حجم الخط إلى: ${fontSize}`);
}

export function checkPasswordStrength() {
    const passwordInput = $('password');
    const strengthIndicator = $('passwordStrength');

    if (!passwordInput || !strengthIndicator) return;

    const password = passwordInput.value;
    let score = 0;
    let feedback = '';

    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    if (score === 0) {
        feedback = '<span style="color: #ef4444;">ضعيفة جداً</span>';
    } else if (score <= 2) {
        feedback = '<span style="color: #f59e0b;">ضعيفة</span>';
    } else if (score <= 4) {
        feedback = '<span style="color: #eab308;">متوسطة</span>';
    } else if (score <= 5) {
        feedback = '<span style="color: #22c55e;">قوية</span>';
    } else {
        feedback = '<span style="color: #16a34a;">قوية جداً</span>';
    }

    strengthIndicator.innerHTML = `قوة كلمة السر: ${feedback}`;
}

export function getStrengthName(strength) {
    const names = {
        'low': 'منخفضة',
        'medium': 'متوسطة',
        'high': 'عالية'
    };
    return names[strength] || strength;
}

export function resetApp() {
    if (confirm('هل أنت متأكد من رغبتك في إعادة تعيين التطبيق؟ سيتم حذف جميع البيانات المحفوظة.')) {
        localStorage.removeItem('emojiCipher_settings');
        localStorage.removeItem('emojiCipher_history');
        localStorage.removeItem('emojiCipher_emojis');
        location.reload();
    }
}

export function clearInput() {
    const inputText = $('inputText');
    if (inputText) {
        inputText.value = '';
        updateCharCount();
        showToast('تم مسح حقل الإدخال', 'info');
    }
}

export async function pasteFromClipboard() {
    const inputText = $('inputText');
    if (!inputText) return;

    if (!navigator.clipboard || !navigator.clipboard.readText) {
        showToast('متصفحك لا يدعم لصق النص تلقائياً.', 'warning');
        return;
    }

    try {
        const text = await navigator.clipboard.readText();
        inputText.value += text;
        updateCharCount();
        showToast('تم لصق النص من الحافظة', 'success');
    } catch (err) {
        console.error('Failed to read clipboard contents: ', err);
        showToast('فشل في قراءة الحافظة. يرجى منح الإذن.', 'error');
    }
}

export function applySettings() {
    applyTheme();
    changeFontSize(appSettings.fontSize);
    document.body.classList.add(`theme-${appSettings.themeColor}`);

    const themeSelector = $('themeSelector');
    const fontSizeSelector = $('fontSizeSelector');
    const autoThemeToggle = $('autoThemeToggle');
    const darkThemeToggle = $('darkThemeToggle');
    const encryptionStrengthSelect = $('encryptionStrength');
    const autoCopyEncodedEmoji = $('autoCopyEncodedEmoji');
    const autoCopyDecodedText = $('autoCopyDecodedText');

    if (themeSelector) themeSelector.value = appSettings.themeColor;
    if (fontSizeSelector) fontSizeSelector.value = appSettings.fontSize;
    if (autoThemeToggle) autoThemeToggle.checked = appSettings.theme === 'auto';
    if (darkThemeToggle) darkThemeToggle.checked = appSettings.theme === 'dark';
    if (encryptionStrengthSelect) encryptionStrengthSelect.value = appSettings.encryptionStrength;
    if (autoCopyEncodedEmoji) autoCopyEncodedEmoji.checked = appSettings.autoCopyEncodedEmoji;
    if (autoCopyDecodedText) autoCopyDecodedText.checked = appSettings.autoCopyDecodedText;
}

export function setupEventListeners() {
    // Encode/Decode buttons
    const encodeBtn = $('encodeBtn');
    const decodeBtn = $('decodeBtn');
    const decodeMultipleBtn = $('decodeMultipleBtn');

    if (encodeBtn) encodeBtn.addEventListener('click', encodeText);
    if (decodeBtn) decodeBtn.addEventListener('click', decodeText);
    if (decodeMultipleBtn) decodeMultipleBtn.addEventListener('click', decodeMultipleText);

    // Input action buttons
    const deleteBtn = $('deleteBtn');
    const pasteBtn = $('pasteBtn');

    if (deleteBtn) deleteBtn.addEventListener('click', clearInput);
    if (pasteBtn) pasteBtn.addEventListener('click', pasteFromClipboard);

    // Text input monitoring
    const inputText = $('inputText');
    if (inputText) {
        inputText.addEventListener('input', updateCharCount);

        // Custom paste handler to prevent browser sanitization of invisible characters
        inputText.addEventListener('paste', (event) => {
            event.preventDefault();
            const text = (event.clipboardData || window.clipboardData).getData('text/plain');
            const { selectionStart, selectionEnd } = event.target;

            // Insert the raw text at the current cursor position
            event.target.value =
                event.target.value.substring(0, selectionStart) +
                text +
                event.target.value.substring(selectionEnd);

            // Move the cursor to the end of the pasted content
            event.target.selectionStart = event.target.selectionEnd = selectionStart + text.length;

            // Manually trigger an 'input' event to ensure other listeners, like char count, are updated
            const inputEvent = new Event('input', { bubbles: true, cancelable: true });
            event.target.dispatchEvent(inputEvent);
        });
    }

    // Navigation buttons
    const menuToggle = $('menuToggle');
    const closeSidebarBtn = $('closeSidebar');
    const resetBtn = $('resetBtn');
    const toggleThemeBtn = $('toggleTheme');

    if (menuToggle) menuToggle.addEventListener('click', toggleSidebar);
    if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', closeSidebar);
    if (resetBtn) resetBtn.addEventListener('click', resetApp);
    if (toggleThemeBtn) toggleThemeBtn.addEventListener('click', toggleTheme);

    // Sidebar tabs
    document.querySelectorAll('.sidebar-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.getAttribute('data-tab');
            switchTab(tabName);
        });
    });

    // Copy and Share buttons
    const copyBtn = $('copyBtn');
    const shareBtn = $('shareBtn');

    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const output = $('output');
            if (output && output.value) {
                copyToClipboard(output.value);
                const originalText = copyBtn.innerHTML;
                copyBtn.innerHTML = '<i class="fas fa-check"></i> تم النسخ';
                copyBtn.style.background = '#10b981';

                setTimeout(() => {
                    copyBtn.innerHTML = originalText;
                    copyBtn.style.background = '';
                }, 2000);
            } else {
                showToast('لا يوجد نص للنسخ', 'warning');
            }
        });
    }
    if (shareBtn) shareBtn.addEventListener('click', shareContent);

    // Emoji management
    const addCustomEmojiBtn = $('addCustomEmoji');
    const addEmojiBtnBtn = $('addEmojiBtn');
    const resetEmojiBtn = $('resetEmoji');
    const clearHistoryBtn = $('clearHistory');

    if (addCustomEmojiBtn) {
        addCustomEmojiBtn.addEventListener('click', () => {
            const emoji = $('customChar')?.value?.trim();
            if (emoji) addNewEmoji(emoji);
        });
    }

    if (addEmojiBtnBtn) {
        addEmojiBtnBtn.addEventListener('click', () => {
            const emoji = $('newEmoji')?.value?.trim();
            if (emoji) addNewEmoji(emoji);
        });
    }

    if (resetEmojiBtn) resetEmojiBtn.addEventListener('click', resetEmojiList);
    if (clearHistoryBtn) clearHistoryBtn.addEventListener('click', clearHistory);

    // Password settings
    const useEncrypt = $('useEncrypt');
    const passwordSection = $('passwordSection');
    const togglePasswordBtn = $('togglePassword');
    const passwordInput = $('password');
    const encryptionStrengthSelect = $('encryptionStrength');

    if (useEncrypt && passwordSection) {
        useEncrypt.addEventListener('change', (e) => {
            passwordSection.classList.toggle('hidden', !e.target.checked);
        });
    }

    if (togglePasswordBtn && passwordInput) {
        togglePasswordBtn.addEventListener('click', () => {
            const isPassword = passwordInput.type === 'password';
            passwordInput.type = isPassword ? 'text' : 'password';
            togglePasswordBtn.innerHTML = isPassword ? '<i class="far fa-eye-slash"></i>' : '<i class="far fa-eye"></i>';
        });
    }

    // Password strength checker
    if (passwordInput) {
        passwordInput.addEventListener('input', checkPasswordStrength);
    }

    // Encryption strength setting
    if (encryptionStrengthSelect) {
        encryptionStrengthSelect.addEventListener('change', (e) => {
            appSettings.encryptionStrength = e.target.value;
            saveSettings();
            showToast(`تم تغيير قوة التشفير إلى: ${getStrengthName(e.target.value)}`);
        });
    }

    // Auto copy and notification settings
    const autoCopyEncodedEmoji = $('autoCopyEncodedEmoji');
    const autoCopyDecodedText = $('autoCopyDecodedText');
    const showNotifications = $('showNotifications');

    if (autoCopyEncodedEmoji) {
        autoCopyEncodedEmoji.addEventListener('change', (e) => {
            appSettings.autoCopyEncodedEmoji = e.target.checked;
            saveSettings();
        });
    }

    if (showNotifications) {
        showNotifications.addEventListener('change', (e) => {
            appSettings.showNotifications = e.target.checked;
            saveSettings();
        });
    }

    if (autoCopyDecodedText) {
        autoCopyDecodedText.addEventListener('change', (e) => {
            appSettings.autoCopyDecodedText = e.target.checked;
            saveSettings();
        });
    }

    // Theme and font settings
    const themeSelector = $('themeSelector');
    const fontSizeSelector = $('fontSizeSelector');

    if (themeSelector) {
        themeSelector.addEventListener('change', (e) => {
            changeColorTheme(e.target.value);
        });
    }

    if (fontSizeSelector) {
        fontSizeSelector.addEventListener('change', (e) => {
            changeFontSize(e.target.value);
        });
    }

    // Toggle switches
    const autoThemeToggle = $('autoThemeToggle');
    const darkThemeToggle = $('darkThemeToggle');

    if (autoThemeToggle) {
        autoThemeToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                appSettings.theme = 'auto';
                if (darkThemeToggle) darkThemeToggle.checked = false;
            } else {
                appSettings.theme = 'light';
            }
            applyTheme();
            saveSettings();
        });
    }

    if (darkThemeToggle) {
        darkThemeToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                appSettings.theme = 'dark';
                if (autoThemeToggle) autoThemeToggle.checked = false;
            } else {
                appSettings.theme = 'light';
            }
            applyTheme();
            saveSettings();
        });
    }

    // Slider controls
    const prevBtn = document.querySelector('.slider-control.prev');
    const nextBtn = document.querySelector('.slider-control.next');
    const emojiSlider = $('emojiSlider');

    if (prevBtn && emojiSlider) {
        prevBtn.addEventListener('click', () => {
            emojiSlider.scrollBy({ left: -200, behavior: 'smooth' });
        });
    }

    if (nextBtn && emojiSlider) {
        nextBtn.addEventListener('click', () => {
            emojiSlider.scrollBy({ left: 200, behavior: 'smooth' });
        });
    }

    // Enter key for emoji input
    const newEmojiInput = $('newEmoji');
    const customCharInput = $('customChar');

    if (newEmojiInput) {
        newEmojiInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const emoji = e.target.value.trim();
                if (emoji) addNewEmoji(emoji);
            }
        });
    }

    if (customCharInput) {
        customCharInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const emoji = e.target.value.trim();
                if (emoji) addNewEmoji(emoji);
            }
        });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const inputText = $('inputText');
            if (inputText && inputText.value.trim()) {
                encodeText();
            }
        }

        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Enter') {
            e.preventDefault();
            decodeText();
        }

        if (e.key === 'Escape') {
            closeSidebar();
        }

        if (e.key === 'F1') {
            e.preventDefault();
            switchTab('help');
            openSidebar();
        }
    });

    // Click outside to close sidebar
    document.addEventListener('click', (e) => {
        const sidebar = document.querySelector('.sidebar');
        const menuToggle = $('menuToggle');

        if (sidebar && sidebar.classList.contains('open')) {
            if (!sidebar.contains(e.target) &&
                e.target !== menuToggle &&
                !menuToggle?.contains(e.target)) {
                closeSidebar();
            }
        }
    });
}

export async function shareContent() {
    const output = $('output');
    if (!output || !output.value) {
        showToast('لا يوجد محتوى للمشاركة', 'warning');
        return;
    }

    const content = output.value;
    const title = 'Emoji Cipher Pro - نص مشفر';

    try {
        if (navigator.share) {
            await navigator.share({
                title: title,
                text: content
            });
            showToast('تم فتح نافذة المشاركة', 'success');
        } else {
            const shareOptions = [
                {
                    name: 'WhatsApp',
                    icon: 'fab fa-whatsapp',
                    color: '#25D366',
                    url: `https://wa.me/?text=${encodeURIComponent(content)}`
                },
                {
                    name: 'Telegram',
                    icon: 'fab fa-telegram',
                    color: '#0088cc',
                    url: `https://t.me/share/url?text=${encodeURIComponent(content)}`
                },
                {
                    name: 'Twitter',
                    icon: 'fab fa-twitter',
                    color: '#1DA1F2',
                    url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(content)}`
                },
                {
                    name: 'Facebook',
                    icon: 'fab fa-facebook',
                    color: '#4267B2',
                    url: `https://www.facebook.com/sharer/sharer.php?quote=${encodeURIComponent(content)}`
                },
                {
                    name: 'نسخ الرابط',
                    icon: 'fas fa-link',
                    color: '#6B7280',
                    action: 'copy'
                }
            ];

            showShareModal(shareOptions, content);
        }
    } catch (error) {
        console.error('Share error:', error);
        showToast('حدث خطأ أثناء المشاركة', 'error');
    }
}

export function showShareModal(options, content) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        backdrop-filter: blur(4px);
    `;

    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        border-radius: 1rem;
        padding: 1.5rem;
        max-width: 400px;
        width: 90%;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    `;

    modalContent.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <h3 style="margin: 0; color: #1f2937;">مشاركة المحتوى</h3>
            <button id="closeShareModal" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #6b7280;">×</button>
        </div>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem;">
            ${options.map(option => `
                <button class="share-option" data-url="${option.url || ''}" data-action="${option.action || 'open'}"
                        style="display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 0.5rem; background: white; cursor: pointer; transition: all 0.2s; text-decoration: none; color: ${option.color};">
                    <i class="${option.icon}" style="font-size: 1.25rem;"></i>
                    <span style="font-size: 0.875rem; font-weight: 500;">${option.name}</span>
                </button>
            `).join('')}
        </div>
    `;

    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    modal.querySelector('#closeShareModal').addEventListener('click', () => {
        document.body.removeChild(modal);
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });

    modal.querySelectorAll('.share-option').forEach(button => {
        button.addEventListener('click', async (e) => {
            const action = button.dataset.action;
            const url = button.dataset.url;

            if (action === 'copy') {
                const output = $('output');
                if(output && output.value) {
                    await copyToClipboard(output.value);
                }
            } else if (url) {
                window.open(url, '_blank', 'width=600,height=400');
                showToast('تم فتح نافذة المشاركة', 'success');
            }

            document.body.removeChild(modal);
        });

        button.addEventListener('mouseenter', () => {
            button.style.transform = 'translateY(-2px)';
            button.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
        });

        button.addEventListener('mouseleave', () => {
            button.style.transform = 'translateY(0)';
            button.style.boxShadow = 'none';
        });
    });
}
