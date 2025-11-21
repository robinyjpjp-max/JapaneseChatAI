import React, { useState, useRef, useEffect } from 'react';
import { Message, Sender, TutorResponse } from './types';
import { sendMessageToTutor, generateSpeech } from './services/geminiService';
import ChatMessage from './components/ChatMessage';
import VoiceInput from './components/VoiceInput';
import { Languages, Sparkles, BookOpen } from 'lucide-react';

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: Sender.AI,
      text: 'こんにちは！日本語の練習をしましょう。何でも話しかけてください。\n(你好！让我们来练习日语吧。你可以说任何你想说的话。)',
      timestamp: new Date(),
      translation: '你好！让我们来练习日语吧。你可以说任何你想说的话。',
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (text: string) => {
    const newMessageId = Date.now().toString();
    const userMessage: Message = {
      id: newMessageId,
      sender: Sender.USER,
      text: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Prepare history for API
      // Filter out welcome message and implement sliding window
      // We keep only the last 12 messages (approx 6 conversation turns) to maintain context without bloating tokens
      const allHistoryMessages = messages.filter(m => m.id !== 'welcome');
      const recentHistory = allHistoryMessages.slice(-12);

      const history = recentHistory.map(m => ({
          role: m.sender === Sender.USER ? 'user' as const : 'model' as const,
          parts: [{ text: m.text }]
        }));

      // Call Gemini
      const tutorResponse: TutorResponse = await sendMessageToTutor(history, text);

      // Update User message with feedback
      setMessages((prev) => 
        prev.map(m => 
          m.id === newMessageId 
            ? { 
                ...m, 
                feedback: {
                  original: text,
                  corrected: tutorResponse.feedback.correctedSentence,
                  explanation: tutorResponse.feedback.explanation,
                  score: tutorResponse.feedback.naturalnessScore
                } 
              }
            : m
        )
      );

      // Add AI response
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: Sender.AI,
        text: tutorResponse.reply,
        translation: tutorResponse.replyTranslation,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);

      // Auto-play AI response (Optional, improved UX)
      await handlePlayAudio(tutorResponse.reply, aiMessage.id);

    } catch (error) {
      console.error("Error processing message:", error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        sender: Sender.AI,
        text: "申し訳ありません。エラーが発生しました。(抱歉，发生了错误。)",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayAudio = async (text: string, messageId: string) => {
    if (currentlyPlayingId) return; // Prevent overlapping playback

    try {
      setCurrentlyPlayingId(messageId);
      
      // Initialize AudioContext if needed
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }

      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      // Generate speech
      const audioBuffer = await generateSpeech(text);
      
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      
      source.onended = () => {
        setCurrentlyPlayingId(null);
      };
      
      source.start();

    } catch (error) {
      console.error("Audio Playback Error:", error);
      setCurrentlyPlayingId(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-indigo-100/50 to-transparent pointer-events-none" />

      {/* Header */}
      <header className="flex-shrink-0 px-6 py-4 bg-white/80 backdrop-blur-md border-b border-indigo-50 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-md shadow-indigo-200">
              <Languages size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">AI 日语口语私教</h1>
              <p className="text-xs text-slate-500 font-medium">实时语音对话与纠错</p>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-xs font-semibold border border-rose-100">
              <Sparkles size={14} />
              <span>AI 智能纠错</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-semibold border border-indigo-100">
              <BookOpen size={14} />
              <span>原声发音</span>
            </div>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto px-4 py-6 scroll-smooth">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.map((msg) => (
            <ChatMessage 
              key={msg.id} 
              message={msg} 
              onPlayAudio={handlePlayAudio}
              isPlaying={currentlyPlayingId === msg.id}
            />
          ))}
          {isLoading && (
            <div className="flex justify-start w-full">
              <div className="bg-white border border-slate-100 px-4 py-3 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
                <span className="text-xs text-slate-400 font-medium ml-1">AI 正在思考与纠错...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </main>

      {/* Input Area */}
      <footer className="flex-shrink-0 z-20">
        <VoiceInput onSend={handleSendMessage} disabled={isLoading} />
      </footer>
    </div>
  );
}