import React, { useState, useEffect, useRef } from 'react';
import { Message, Sender } from '../types';
import { Volume2, RefreshCw, CheckCircle2, AlertCircle, Bookmark, Copy } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ChatMessageProps {
  message: Message;
  onPlayAudio: (text: string, id: string) => void;
  isPlaying: boolean;
  onSave: (text: string, translation: string | undefined, source: 'AI回复' | 'AI修正' | '手动选择') => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, onPlayAudio, isPlaying, onSave }) => {
  const isUser = message.sender === Sender.USER;
  const messageRef = useRef<HTMLDivElement>(null);
  
  // Selection Popup State
  const [selectionRect, setSelectionRect] = useState<{top: number, left: number} | null>(null);
  const [selectedText, setSelectedText] = useState('');

  // Handle text selection
  useEffect(() => {
    const handleSelection = () => {
        const selection = window.getSelection();
        
        // Check if selection is valid and inside this message component
        if (!selection || selection.isCollapsed || !messageRef.current) {
            setSelectionRect(null);
            return;
        }

        if (!messageRef.current.contains(selection.anchorNode)) {
            return; // Selection started outside
        }

        const text = selection.toString().trim();
        if (text.length > 0) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            
            // Calculate relative position to the message container for absolute positioning
            // Or use fixed/absolute regarding the viewport? 
            // Let's use fixed to be safe across scroll containers, but requires z-index
            // Actually, let's calculate relative to viewport but render inside a Portal? 
            // Simpler: State holds viewport coordinates, render button with fixed position
            
            setSelectionRect({
                top: rect.top - 40, // Position above
                left: rect.left + (rect.width / 2) - 40 // Center horizontally
            });
            setSelectedText(text);
        } else {
            setSelectionRect(null);
        }
    };

    // Use mouseup for desktop and touchend for mobile selection end detection
    document.addEventListener('mouseup', handleSelection);
    document.addEventListener('touchend', handleSelection); // For mobile
    document.addEventListener('selectionchange', () => {
        // Close popup if selection is cleared
        if (!window.getSelection()?.toString()) {
            setSelectionRect(null);
        }
    });

    return () => {
        document.removeEventListener('mouseup', handleSelection);
        document.removeEventListener('touchend', handleSelection);
    };
  }, []);

  const handleSaveSelection = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (selectedText) {
          onSave(selectedText, undefined, '手动选择');
          setSelectionRect(null);
          window.getSelection()?.removeAllRanges();
      }
  };

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {/* Floating Selection Button (Rendered globally or fixed) */}
      {selectionRect && (
          <div 
            className="fixed z-50 animate-fade-in-up"
            style={{ top: selectionRect.top, left: selectionRect.left }}
          >
             <button
                onMouseDown={handleSaveSelection} // Use mouseDown to prevent clearing selection before click
                className="bg-slate-900 text-white text-xs px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-1.5 hover:bg-slate-800 transition-colors"
             >
                 <Bookmark size={12} />
                 收藏选区
             </button>
             {/* Little arrow pointer */}
             <div className="w-2 h-2 bg-slate-900 rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2"></div>
          </div>
      )}

      <div className={`max-w-[85%] md:max-w-[70%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        
        {/* Message Bubble */}
        <div
          ref={messageRef}
          className={`relative px-5 py-4 rounded-2xl shadow-sm text-base tracking-wide font-jp group
          ${isUser 
            ? 'bg-indigo-600 text-white rounded-br-none' 
            : 'bg-white border border-slate-100 text-slate-800 rounded-bl-none'
          }`}
        >
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="mb-1 last:mb-0 leading-relaxed">{children}</p>,
              ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-0.5">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-0.5">{children}</ol>,
              li: ({ children }) => <li className="pl-1">{children}</li>,
              strong: ({ children }) => <span className={`font-bold ${isUser ? 'text-white' : 'text-slate-900'}`}>{children}</span>,
              em: ({ children }) => <span className="italic opacity-90">{children}</span>,
              code: ({ children }) => (
                <code className={`px-1 py-0.5 rounded text-sm font-mono ${
                  isUser ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-100 text-slate-600'
                }`}>
                  {children}
                </code>
              ),
              pre: ({ children }) => (
                <pre className={`p-2 rounded-lg text-sm overflow-x-auto mb-2 ${
                   isUser ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-50 text-slate-600'
                }`}>
                  {children}
                </pre>
              ),
            }}
          >
            {message.text}
          </ReactMarkdown>
          
          {/* AI Controls */}
          {!isUser && (
            <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <button
                    onClick={() => onPlayAudio(message.text, message.id)}
                    disabled={isPlaying}
                    className={`p-1.5 rounded-full transition-colors flex items-center gap-1 text-xs font-medium
                    ${isPlaying 
                    ? 'text-indigo-400 bg-indigo-50 animate-pulse cursor-wait' 
                    : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
                    }`}
                >
                    <Volume2 size={16} />
                    {isPlaying ? '播放中...' : '听发音'}
                </button>
                {message.translation && (
                    <span className="text-xs text-slate-400 ml-2 italic max-w-[150px] truncate md:max-w-none">
                    {message.translation}
                    </span>
                )}
              </div>

              {/* Save Button for AI Message */}
              <button
                onClick={() => onSave(message.text, message.translation, 'AI回复')}
                className="p-1.5 text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
                title="收藏整句"
              >
                <Bookmark size={16} />
              </button>
            </div>
          )}
        </div>

        {/* User Feedback Card */}
        {isUser && message.feedback && (
          <div className="mt-2 mr-1 w-full max-w-md bg-white border border-rose-100 rounded-xl p-3 shadow-sm animate-fade-in-up">
            <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-rose-500 uppercase tracking-wider flex items-center gap-1">
                    <RefreshCw size={12} />
                    AI 修改建议
                </span>
                <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-400">自然度:</span>
                    <span className={`text-xs font-bold ${
                        message.feedback.score > 80 ? 'text-green-500' : 'text-amber-500'
                    }`}>
                        {message.feedback.score}/100
                    </span>
                </div>
            </div>
            
            {/* Explanation */}
            <div className="flex items-start gap-2 mb-3">
                {message.feedback.score > 90 ? (
                    <CheckCircle2 size={16} className="text-green-500 mt-0.5 shrink-0" />
                ) : (
                    <AlertCircle size={16} className="text-amber-500 mt-0.5 shrink-0" />
                )}
                <p className="text-xs text-slate-600 leading-snug">
                    {message.feedback.explanation}
                </p>
            </div>

            {/* Corrected Version */}
            <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100 group/correction relative">
                <div className="flex items-center gap-1 mb-1 justify-between">
                    <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">最终优化</p>
                    </div>
                    {/* Save Correction Button */}
                    <button
                        onClick={() => onSave(message.feedback!.corrected, undefined, 'AI修正')}
                        className="opacity-0 group-hover/correction:opacity-100 p-1 text-slate-400 hover:text-indigo-500 transition-all"
                        title="收藏修正句"
                    >
                        <Bookmark size={14} />
                    </button>
                </div>
                <p className="text-sm text-slate-800 font-jp font-medium">{message.feedback.corrected}</p>
            </div>
            
          </div>
        )}

      </div>
    </div>
  );
};

export default ChatMessage;