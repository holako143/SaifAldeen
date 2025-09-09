// ========== Data Management ==========
function saveSettings() { if (appSettings.autoSave) localStorage.setItem('emojiCipher_settings', JSON.stringify(appSettings)); }
function loadSettings() { const saved = localStorage.getItem('emojiCipher_settings'); if (saved) try { appSettings = { ...appSettings, ...JSON.parse(saved) }; } catch (e) { console.error('Error loading settings:', e); } }
function saveEmojis() { localStorage.setItem('emojiCipher_emojis', JSON.stringify(emojiList)); }
function saveAlphanumericChars() { localStorage.setItem('shifrenish_alphanumeric', JSON.stringify(alphanumericChars)); }
function loadEmojis() { const saved = localStorage.getItem('emojiCipher_emojis'); if (saved) try { emojiList = JSON.parse(saved); if (emojiList.length === 0) emojiList = [...defaultEmojis]; } catch (e) { console.error('Error loading emojis:', e); emojiList = [...defaultEmojis]; } currentActiveChar = emojiList[0]; }
function loadAlphanumericChars() { const saved = localStorage.getItem('shifrenish_alphanumeric'); if (saved) try { const parsed = JSON.parse(saved); if (Array.isArray(parsed) && parsed.length > 0) alphanumericChars = parsed; } catch (e) { console.error('Error loading alphanumeric chars:', e); } }
function saveHistory() { if (appSettings.saveHistory) localStorage.setItem('emojiCipher_history', JSON.stringify(historyItems)); }
function loadHistory() { const saved = localStorage.getItem('emojiCipher_history'); if (saved) try { historyItems = JSON.parse(saved); } catch (e) { console.error('Error loading history:', e); historyItems = []; } }
