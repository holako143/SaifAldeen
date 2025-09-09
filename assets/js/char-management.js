// شفرينش - Character Set Management
// This file contains all functions related to managing the custom character sets (emojis and alphanumeric),
// including adding, removing, reordering, and rendering the lists.

function renderCharacterList() {
    const slider = $('emojiSlider');
    if (!slider) return;
    const list = useAlphanumeric ? alphanumericChars : emojiList;
    const itemClass = useAlphanumeric ? 'char-item' : 'emoji-item';
    slider.innerHTML = '';
    list.forEach(char => {
        const charEl = document.createElement('div');
        charEl.className = itemClass;
        charEl.textContent = char;
        if (char === currentActiveChar) charEl.classList.add('active');
        charEl.addEventListener('click', () => setActiveChar(char));
        slider.appendChild(charEl);
    });
    if (!list.includes(currentActiveChar)) setActiveChar(list[0]);
    const customEmojiUI = document.querySelector('.custom-emoji-container');
    if (customEmojiUI) customEmojiUI.style.display = useAlphanumeric ? 'none' : 'flex';
    const emojiTab = document.querySelector('.sidebar-tab[data-tab="emoji"]');
    if(emojiTab) emojiTab.style.display = useAlphanumeric ? 'none' : 'flex';
    const emojiManagementTab = $('emojiTab');
    if (emojiManagementTab) {
        const charSetSwitchInEmojiTab = emojiManagementTab.querySelector('#charSetSwitch');
        if (charSetSwitchInEmojiTab) charSetSwitchInEmojiTab.parentElement.style.display = useAlphanumeric ? 'none' : 'block';
    }
    if (useAlphanumeric && document.querySelector('.sidebar-tab[data-tab="emoji"].active')) switchTab('cipher');
    renderManagedList();
}

function setActiveChar(char) {
    currentActiveChar = char;
    document.querySelectorAll('.emoji-item, .char-item').forEach(el => {
        el.classList.toggle('active', el.textContent === char);
    });
}

function addNewChar(char) {
    if (!char || char.trim() === '') { showToast('يرجى إدخال رمز صحيح', 'error'); return; }
    char = char.trim();
    const list = managingAlphanumeric ? alphanumericChars : emojiList;
    const listName = managingAlphanumeric ? "الحروف والأرقام" : "الإيموجي";
    if (list.includes(char)) { showToast(`هذا الرمز موجود بالفعل في قائمة ${listName}`, 'error'); return; }
    if (managingAlphanumeric) {
        alphanumericChars.unshift(char);
        saveAlphanumericChars();
    } else {
        emojiList.unshift(char);
        saveEmojis();
    }
    setActiveChar(char);
    renderManagedList();
    renderCharacterList();
    showToast('تم إضافة الرمز بنجاح');
    const newEmojiInput = $('newEmoji');
    if (newEmojiInput) newEmojiInput.value = '';
    const customCharInput = $('customChar');
    if (customCharInput) customCharInput.value = '';
}

function removeChar(char) {
    const list = managingAlphanumeric ? alphanumericChars : emojiList;
    if (list.length <= 1) { showToast('يجب أن تبقى رمز واحد على الأقل في القائمة', 'error'); return; }
    if (managingAlphanumeric) {
        alphanumericChars = alphanumericChars.filter(c => c !== char);
        saveAlphanumericChars();
    } else {
        emojiList = emojiList.filter(e => e !== char);
        saveEmojis();
    }
    if (currentActiveChar === char) {
        const newList = managingAlphanumeric ? alphanumericChars : emojiList;
        setActiveChar(newList[0]);
    }
    renderManagedList();
    renderCharacterList();
    showToast('تم حذف الرمز بنجاح');
}

function renderManagedList() {
    const customEmojiList = $('customEmojiList');
    if (!customEmojiList) return;
    const list = managingAlphanumeric ? alphanumericChars : emojiList;
    const listName = managingAlphanumeric ? "الحروف والأرقام" : "الإيموجي";
    const newCharLabel = $('newCharLabel');
    const newEmojiInput = $('newEmoji');
    const resetBtn = $('resetEmoji');
    if (newCharLabel) newCharLabel.textContent = `إضافة رمز جديد إلى قائمة ${listName}`;
    if (newEmojiInput) newEmojiInput.placeholder = `أدخل رمزاً جديداً...`;
    if (resetBtn) resetBtn.innerHTML = `<i class="fas fa-undo"></i> إعادة تعيين قائمة ${listName}`;
    customEmojiList.innerHTML = '';
    if (list.length === 0) {
        customEmojiList.innerHTML = `<p style="text-align: center; color: #64748b; padding: 2rem;">لا توجد رموز في قائمة ${listName}</p>`;
        return;
    }
    list.forEach((char, index) => {
        const charRow = document.createElement('div');
        charRow.className = 'emoji-manage-item';
        charRow.setAttribute('draggable', 'true');
        charRow.setAttribute('data-index', index);
        charRow.innerHTML = `<div class="emoji-info"><i class="fas fa-grip-vertical drag-handle"></i><span class="emoji-char">${char}</span></div><button class="delete-emoji-btn" title="حذف الرمز"><i class="fas fa-trash"></i></button>`;
        const deleteBtn = charRow.querySelector('.delete-emoji-btn');
        deleteBtn.addEventListener('click', (e) => { e.stopPropagation(); removeChar(char); });
        customEmojiList.appendChild(charRow);
    });
}

function resetCharList() {
    const listName = managingAlphanumeric ? "الحروف والأرقام" : "الإيموجي";
    if (confirm(`هل أنت متأكد من رغبتك في إعادة تعيين قائمة ${listName}؟`)) {
        if (managingAlphanumeric) {
            alphanumericChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.split('');
            saveAlphanumericChars();
        } else {
            emojiList = [...defaultEmojis];
            saveEmojis();
        }
        renderManagedList();
        renderCharacterList();
        showToast(`تم إعادة تعيين قائمة ${listName}`);
    }
}

function setupDragAndDrop() {
    // ... drag and drop logic ...
}

function setupSliderDrag() {
    // ... slider drag logic ...
}
