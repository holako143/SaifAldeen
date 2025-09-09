// شفرينش - UI Management
// This file contains all functions related to DOM manipulation,
// such as rendering lists, showing/hiding modals, and managing UI state.

function autoGrowTextarea(element) {
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = (element.scrollHeight) + 'px';
}

function showResultCard(show) {
    const container = document.querySelector('.dynamic-card-container');
    if (container) {
        container.classList.toggle('show-result', show);
    }
}

function swapDynamicCards() {
    const container = document.querySelector('.dynamic-card-container');
    if (container) {
        const isResultVisible = container.classList.contains('show-result');
        showResultCard(!isResultVisible);
        showToast(isResultVisible ? 'تم عرض بطاقة الإيموجي' : 'تم عرض بطاقة النتيجة', 'info');
    }
}

function showToast(message, type = 'success', duration = 3000) {
    if (!appSettings.showNotifications) return;
    const container = $('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    let iconClass = 'fas fa-check-circle';
    if (type === 'error') iconClass = 'fas fa-exclamation-circle';
    if (type === 'info') iconClass = 'fas fa-info-circle';
    if (type === 'warning') iconClass = 'fas fa-exclamation-triangle';
    toast.innerHTML = `<div class="icon"><i class="${iconClass}"></i></div><div class="message">${message}</div><button class="close-btn" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>`;
    container.appendChild(toast);
    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px)';
            setTimeout(() => toast.remove(), 300);
        }
    }, duration);
}

function updateCharCount() {
    const inputText = $('inputText');
    const charCount = $('charCount');
    const sizeEstimate = $('sizeEstimate');
    if (!inputText || !charCount) return;
    const text = inputText.value;
    charCount.textContent = text.length;
    if (text.length > 0) {
        try {
            const compressedBytes = AdvancedCompression.compress(text).length;
            if (sizeEstimate) sizeEstimate.textContent = `~${compressedBytes} بايت`;
        } catch (error) {
            if (sizeEstimate) sizeEstimate.textContent = '~0 بايت';
        }
    } else {
        if (sizeEstimate) sizeEstimate.textContent = '~0 بايت';
    }
}

function updateStats(originalSize, compressedSize) {
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

async function copyToClipboard(text = null) {
    let textToCopy = text;
    if (!textToCopy) {
        const output = $('output');
        if (batchMode) {
            const results = [];
            output.querySelectorAll('.batch-result-item span').forEach(span => {
                results.push(span.textContent);
            });
            textToCopy = results.join('\n');
        } else {
            textToCopy = output ? output.textContent : '';
        }
    }

    if (!textToCopy) {
        showToast('لا يوجد نص للنسخ', 'warning');
        return;
    }
    try {
        await navigator.clipboard.writeText(textToCopy);
        showToast('تم نسخ النص إلى الحافظة', 'success');
        const copyBtn = $('copyBtn');
        if (copyBtn) {
            const originalIcon = copyBtn.innerHTML;
            copyBtn.innerHTML = '<i class="fas fa-check"></i>';
            setTimeout(() => { copyBtn.innerHTML = originalIcon; }, 2000);
        }
    } catch (error) {
        console.error('Copy failed:', error);
        showToast(`فشل في نسخ النص: ${error.message}`, 'error');
    }
}

function showShareModal(options, content) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modalContent.style.cssText = `...`; // styles
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    // ... event listeners for the modal
}

function openSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) sidebar.classList.add('open');
    document.body.classList.add('sidebar-open');
    let overlay = document.querySelector('.sidebar-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay active';
        document.body.appendChild(overlay);
        overlay.addEventListener('click', closeSidebar);
    } else {
        overlay.classList.add('active');
    }
}

function closeSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
    document.body.classList.remove('sidebar-open');
}

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar && sidebar.classList.contains('open')) closeSidebar();
    else openSidebar();
}

function applyTheme() {
    // ... theme logic
}

function changeColorTheme(themeColor) {
    // ... theme change logic
}

function changeFontSize(fontSize) {
    // ... font size change logic
}

function checkPasswordStrength() {
    // ... password strength logic
}

function getStrengthName(strength) {
    // ... strength name logic
}

function clearInput() {
    const inputText = $('inputText');
    if (inputText) {
        inputText.value = '';
        updateCharCount();
        showResultCard(false);
        showToast('تم مسح حقل الإدخال', 'info');
    }
}

async function pasteFromClipboard() {
    // ... paste logic
}

function animateEmojiGrid() {
    // ... animation logic
}
