// شفرينش - QR Code Management
// This file contains all functions related to QR code generation and scanning.

async function startScanner() {
    const scannerModal = $('scannerModal');
    const video = $('scannerVideo');
    const scannerMessage = $('scannerMessage');
    if (!scannerModal || !video || !scannerMessage) {
        showToast('عناصر واجهة الماسح الضوئي غير موجودة', 'error');
        return;
    }
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        video.srcObject = stream;
        video.setAttribute("playsinline", true);
        await video.play();
        scannerModal.classList.remove('hidden');
        scannerMessage.textContent = 'وجّه الكاميرا نحو الرمز...';
        animationFrameId = requestAnimationFrame(tick);
    } catch (err) {
        console.error("Camera access error:", err);
        showToast(`فشل في الوصول إلى الكاميرا: ${err.message}`, 'error');
        scannerMessage.textContent = 'فشل الوصول إلى الكاميرا. يرجى السماح بالوصول والمحاولة مرة أخرى.';
    }
}

function stopScanner() {
    if (stream) stream.getTracks().forEach(track => track.stop());
    stream = null;
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
    $('scannerModal').classList.add('hidden');
}

function tick() {
    const video = $('scannerVideo');
    const scannerMessage = $('scannerMessage');
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
        const canvasElement = document.createElement('canvas');
        const canvas = canvasElement.getContext('2d');
        canvasElement.height = video.videoHeight;
        canvasElement.width = video.videoWidth;
        canvas.drawImage(video, 0, 0, canvasElement.width, canvasElement.height);
        const imageData = canvas.getImageData(0, 0, canvasElement.width, canvasElement.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });
        if (code) {
            scannerMessage.textContent = `تم العثور على رمز! ${code.data.substring(0, 20)}...`;
            const inputText = $('inputText');
            inputText.value = code.data;
            updateCharCount();
            autoGrowTextarea(inputText);
            showToast('تم استيراد النص من QR Code بنجاح', 'success');
            stopScanner();
            return;
        } else {
            scannerMessage.textContent = 'جاري البحث عن رمز...';
        }
    }
    animationFrameId = requestAnimationFrame(tick);
}

function exportAsQR() {
    const output = $('output');
    if (!output || !output.textContent) {
        showToast('لا يوجد محتوى لتصديره كـ QR Code', 'warning');
        return;
    }
    const text = batchMode ? Array.from(output.querySelectorAll('.batch-result-item span')).map(s => s.textContent).join('\n') : output.textContent;
    if (!text) {
        showToast('لا يوجد محتوى لتصديره كـ QR Code', 'warning');
        return;
    }
    const qrContainer = $('qrcode-container');
    const qrModal = $('qrModal');
    if (!qrContainer || !qrModal) {
        showToast('عناصر واجهة QR Code غير موجودة', 'error');
        return;
    }
    qrContainer.innerHTML = '';
    try {
        new QRCode(qrContainer, {
            text: text,
            width: 256,
            height: 256,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
    } catch (e) {
        showToast('فشل في توليد QR Code. قد يكون النص طويلاً جداً.', 'error');
        console.error("QR Code generation error:", e);
        return;
    }
    qrModal.classList.remove('hidden');
}
