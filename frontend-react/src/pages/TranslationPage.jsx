// FILE: frontend-react/src/pages/TranslationPage.jsx
import React, { useState } from 'react';
import * as api from '../api.js';
import './TranslationPage.css'; // We'll create this CSS file

function TranslationPage() {
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [targetLang, setTargetLang] = useState('en');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTranslate = async () => {
    if (!sourceText.trim()) return;
    setIsLoading(true);
    setError('');
    setTranslatedText('');

    try {
      const result = await api.translateText(sourceText, targetLang);
      setTranslatedText(result.translated_text); // Assuming the backend returns this structure
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="translation-container">
      <h2>Translator</h2>
      <div className="translator-io">
        <textarea
          value={sourceText}
          onChange={(e) => setSourceText(e.target.value)}
          placeholder="Enter text to translate..."
        />
        <textarea
          value={translatedText}
          readOnly
          placeholder="Translation..."
        />
      </div>
      <div className="translator-controls">
        <select value={targetLang} onChange={(e) => setTargetLang(e.target.value)}>
          <option value="en">English</option>
          <option value="es">Spanish</option>
          <option value="fr">French</option>
          <option value="de">German</option>
          <option value="ja">Japanese</option>
        </select>
        <button onClick={handleTranslate} disabled={isLoading}>
          {isLoading ? 'Translating...' : 'Translate'}
        </button>
      </div>
      {error && <p className="error-message">Error: {error}</p>}
    </div>
  );
}

export default TranslationPage;