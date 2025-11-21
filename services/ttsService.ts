
// Native Browser Text-to-Speech Service
// Much faster than Cloud TTS, zero latency, works offline.

export const speakJapanese = (text: string, onEnd?: () => void) => {
  // 1. Cancel any currently speaking audio
  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
  }

  const utterance = new SpeechSynthesisUtterance(text);
  
  // 2. Configure for Japanese
  utterance.lang = 'ja-JP';
  utterance.rate = 0.9; // Slightly slower for better clarity
  utterance.pitch = 1;
  utterance.volume = 1;

  // 3. Try to select a Japanese voice
  // Voices load asynchronously, but usually are available by the time user clicks
  const voices = window.speechSynthesis.getVoices();
  const jpVoice = voices.find(v => v.lang.includes('ja') || v.name.includes('Japan') || v.name.includes('Google 日本語'));
  if (jpVoice) {
    utterance.voice = jpVoice;
  }

  // 4. Handle events
  utterance.onend = () => {
    if (onEnd) onEnd();
  };

  utterance.onerror = (e) => {
    console.error("TTS Error", e);
    if (onEnd) onEnd();
  };

  // 5. Speak
  window.speechSynthesis.speak(utterance);
};

export const stopSpeech = () => {
  window.speechSynthesis.cancel();
};
