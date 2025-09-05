import { showToast } from './ui.js';

export async function copyToClipboard(text) {
    if (!text) {
        showToast('لا يوجد نص للنسخ', 'warning');
        return;
    }

    try {
        await navigator.clipboard.writeText(text);
        showToast('تم نسخ النص إلى الحافظة', 'success');
    } catch (error) {
        console.error('Copy failed:', error);
        showToast('فشل في نسخ النص', 'error');
    }
}
