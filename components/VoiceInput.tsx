import React, { useState, useEffect, useRef } from 'react';
import { Mic, Send, MicOff, Loader2 } from 'lucide-react';
import { IWindow } from '../types';

interface VoiceInputProps {
  onSend: (text: string) => void;
  disabled: boolean;
}

const VoiceInput: React.FC<VoiceInputProps> = ({ onSend, disabled }) => {
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Initialize Speech Recognition
    const win = window as unknown as IWindow;
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.lang = 'ja-JP'; // Target language is Japanese
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        // Optional: Auto-send on voice end? Let's verify first.
        // onSend(transcript); 
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (disabled || !recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
      setIsListening(true);
      setInputText('');
    }
  };

  const handleSend = () => {
    if (inputText.trim() && !disabled) {
      onSend(inputText);
      setInputText('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 bg-white/80 backdrop-blur-md border-t border-slate-200 shadow-lg pb-8 md:pb-6">
      <div className="flex items-end gap-3">
        <button
          onClick={toggleListening}
          disabled={disabled || !recognitionRef.current}
          className={`flex-shrink-0 p-4 rounded-full transition-all duration-300 shadow-sm
            ${isListening 
              ? 'bg-rose-500 text-white animate-pulse shadow-rose-200' 
              : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 hover:text-rose-500'
            }
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
          title={isListening ? "停止录音" : "点击说话"}
        >
          {isListening ? <MicOff size={24} /> : <Mic size={24} />}
        </button>

        <div className="flex-1 relative">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? "正在听..." : "输入或点击麦克风说日语... (Shift+Enter 发送)"}
            disabled={disabled}
            className="w-full bg-slate-50 border-0 rounded-2xl px-5 py-4 pr-12 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all resize-none shadow-inner"
            rows={1}
            style={{ minHeight: '56px', maxHeight: '120px' }}
          />
          <button
            onClick={handleSend}
            disabled={!inputText.trim() || disabled}
            className="absolute right-2 bottom-2 p-2 rounded-full text-indigo-600 hover:bg-indigo-50 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="发送 (Shift+Enter)"
          >
            {disabled && inputText.trim() ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoiceInput;