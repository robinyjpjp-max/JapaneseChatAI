import React from 'react';
import { Message, Sender } from '../types';
import { Volume2, RefreshCw, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ChatMessageProps {
  message: Message;
  onPlayAudio: (text: string, id: string) => void;
  isPlaying: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, onPlayAudio, isPlaying }) => {
  const isUser = message.sender === Sender.USER;

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] md:max-w-[70%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        
        {/* Message Bubble */}
        <div
          className={`relative px-5 py-4 rounded-2xl shadow-sm text-base tracking-wide font-jp
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
            <div className="mt-3 flex items-center gap-2 pt-2 border-t border-slate-100">
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
                <span className="text-xs text-slate-400 ml-2 italic">
                  {message.translation}
                </span>
              )}
            </div>
          )}
        </div>

        {/* User Feedback Card (Attached below user message) */}
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
            
            {/* 1. Explanation First */}
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

            {/* 2. Final Corrected Version Second */}
            <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                <div className="flex items-center gap-1 mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">最终优化</p>
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