
import React, { useState, useEffect, useRef } from 'react';
import { Mic, Send, Square, Loader2, AlertCircle } from 'lucide-react';
import { IWindow } from '../types';

interface VoiceInputProps {
  onSend: (text: string) => void;
  disabled: boolean;
}

const VoiceInput: React.FC<VoiceInputProps> = ({ onSend, disabled }) => {
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  // Stores the text that was present BEFORE the current recording session started
  const baseTextRef = useRef('');

  useEffect(() => {
    const win = window as unknown as IWindow;
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true; // Keep listening even if user pauses
      recognition.lang = 'ja-JP';
      recognition.interimResults = true; // Show results while speaking

      recognition.onresult = (event: any) => {
        let newVoiceTranscript = '';
        
        // Iterate through ALL results, not just the last one
        for (let i = 0; i < event.results.length; i++) {
          // Add a space between distinct segments (pauses) to act as pseudo-punctuation
          if (i > 0) {
            newVoiceTranscript += ' ';
          }
          newVoiceTranscript += event.results[i][0].transcript;
        }

        // Combine the text that was there before recording + space + the new voice text
        const prefix = baseTextRef.current;
        // Check if we need to insert a separator space
        const needsSpace = prefix.length > 0 && !prefix.endsWith(' ') && !prefix.endsWith('　');
        
        setInputText(prefix + (needsSpace ? ' ' : '') + newVoiceTranscript);
        setErrorMessage(null); // Clear error if we got results
      };

      recognition.onend = () => {
        // Only set listening to false, don't clear errors here as they might have caused the end
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);

        // Map error codes to user-friendly Chinese messages
        switch (event.error) {
          case 'audio-capture':
            setErrorMessage('未检测到麦克风或麦克风被占用。请检查设备连接。');
            break;
          case 'not-allowed':
            setErrorMessage('麦克风权限被拒绝。请点击浏览器地址栏的锁图标允许访问麦克风。');
            break;
          case 'no-speech':
            // Ignore no-speech errors (silence), just stop listening silently
            return; 
          case 'service-not-allowed':
            setErrorMessage('语音识别服务不可用，请尝试使用 Chrome 浏览器。');
            break;
          case 'network':
            setErrorMessage('网络连接问题，语音识别需要联网。');
            break;
          default:
            setErrorMessage(`语音识别错误: ${event.error}`);
        }
      };

      recognitionRef.current = recognition;
    } else {
      setErrorMessage('您的浏览器不支持语音识别，请使用 Chrome 或 Safari。');
    }
  }, []);

  const toggleListening = () => {
    setErrorMessage(null); // Clear previous errors on new attempt

    if (disabled || !recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        // 1. Save what's currently in the box so we don't overwrite it
        baseTextRef.current = inputText;
        
        // 2. Start listening
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error("Start error:", e);
        setErrorMessage('启动录音失败，请刷新页面重试。');
        setIsListening(false);
      }
    }
  };

  const handleSend = () => {
    if (isListening && recognitionRef.current) {
        recognitionRef.current.stop();
        setIsListening(false);
    }

    if (inputText.trim() && !disabled) {
      onSend(inputText);
      setInputText('');
      baseTextRef.current = ''; // Reset base text after send
      setErrorMessage(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 bg-white/80 backdrop-blur-md border-t border-slate-200 shadow-lg pb-8 md:pb-6 relative">
      
      {/* Error Message Toast */}
      {errorMessage && (
        <div className="absolute -top-10 left-0 w-full flex justify-center px-4">
          <div className="bg-rose-50 text-rose-600 text-xs md:text-sm px-4 py-2 rounded-full border border-rose-100 shadow-sm flex items-center gap-2 animate-fade-in-up">
            <AlertCircle size={14} />
            {errorMessage}
          </div>
        </div>
      )}

      <div className="flex items-end gap-3">
        <button
          onClick={toggleListening}
          disabled={disabled || !recognitionRef.current}
          className={`flex-shrink-0 p-4 rounded-2xl transition-all duration-300 shadow-sm flex items-center justify-center
            ${isListening 
              ? 'bg-rose-500 text-white shadow-rose-200 animate-pulse' 
              : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 hover:text-indigo-500'
            }
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
          title={isListening ? "点击停止录音" : "点击开始说话"}
        >
          {isListening ? (
            <Square fill="currentColor" size={24} />
          ) : (
            <Mic size={24} />
          )}
        </button>

        <div className="flex-1 relative">
          <textarea
            value={inputText}
            onChange={(e) => {
               setInputText(e.target.value);
               // If user types manually while not listening, update the base ref
               if (!isListening) {
                   baseTextRef.current = e.target.value;
               }
            }}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? "正在聆听..." : "输入或点击麦克风说日语... (Shift+Enter 发送)"}
            disabled={disabled}
            className={`w-full border-0 rounded-2xl px-5 py-4 pr-12 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 transition-all resize-none shadow-inner
              ${isListening ? 'bg-slate-50' : 'bg-slate-50 focus:bg-white'}
            `}
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
