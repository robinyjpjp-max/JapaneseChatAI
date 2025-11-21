import React, { useState, useRef, useEffect } from 'react';
import { Message, Sender, TutorResponse, ChatSession, SavedSentence } from './types';
import { sendMessageToTutor, generateSpeech } from './services/geminiService';
import { decode, decodeAudioData } from './services/audioUtils';
import ChatMessage from './components/ChatMessage';
import VoiceInput from './components/VoiceInput';
import Sidebar from './components/Sidebar';
import SavedSentencesView from './components/SavedSentencesView';
import { Languages, Sparkles, BookOpen, Menu, Check } from 'lucide-react';

const LOCAL_STORAGE_KEY = 'japanese-tutor-sessions';
const SAVED_SENTENCES_KEY = 'japanese-tutor-saved-sentences';

const createWelcomeMessage = (): Message => ({
  id: 'welcome',
  sender: Sender.AI,
  text: 'こんにちは！日本語の練習をしましょう。何でも話しかけてください。',
  timestamp: new Date(),
  translation: '你好！让我们来练习日语吧。你可以说任何你想说的话。',
});

const createNewSession = (): ChatSession => ({
  id: Date.now().toString(),
  title: '新对话',
  createdAt: Date.now(),
  messages: [createWelcomeMessage()]
});

export default function App() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [savedSentences, setSavedSentences] = useState<SavedSentence[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSavedViewOpen, setIsSavedViewOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Audio Context Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  const initFirstSession = () => {
    const newSession = createNewSession();
    setSessions([newSession]);
    setCurrentSessionId(newSession.id);
  };

  // 1. Load Sessions from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        const parsedSessions: ChatSession[] = JSON.parse(saved);
        const hydratedSessions = parsedSessions.map(s => ({
            ...s,
            messages: s.messages.map(m => ({
                ...m,
                timestamp: new Date(m.timestamp)
            }))
        }));

        if (hydratedSessions.length > 0) {
          setSessions(hydratedSessions);
          setCurrentSessionId(hydratedSessions[0].id);
        } else {
          initFirstSession();
        }
      } catch (e) {
        console.error("Failed to load sessions", e);
        initFirstSession();
      }
    } else {
      initFirstSession();
    }
  }, []);

  // 2. Load Saved Sentences from LocalStorage
  useEffect(() => {
      const saved = localStorage.getItem(SAVED_SENTENCES_KEY);
      if (saved) {
          try {
              setSavedSentences(JSON.parse(saved));
          } catch (e) {
              console.error("Failed to load saved sentences", e);
          }
      }
  }, []);

  // 3. Save Sessions to LocalStorage
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sessions));
    }
  }, [sessions]);

  // 4. Save Sentences to LocalStorage
  useEffect(() => {
      localStorage.setItem(SAVED_SENTENCES_KEY, JSON.stringify(savedSentences));
  }, [savedSentences]);

  // Auto-scroll
  const currentSession = sessions.find(s => s.id === currentSessionId);
  const messages = currentSession?.messages || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentSessionId]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Toast
  const showToast = (msg: string) => {
      setToastMessage(msg);
      setTimeout(() => setToastMessage(null), 2000);
  };

  // Handlers
  const handleNewChat = () => {
    const newSession = createNewSession();
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
  };

  const handleClearAllSessions = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    initFirstSession();
  };

  const handleSaveSentence = (text: string, translation: string | undefined, source: 'AI回复' | 'AI修正' | '手动选择') => {
      const newSaved: SavedSentence = {
          id: Date.now().toString(),
          original: text,
          translation,
          source,
          timestamp: Date.now(),
      };
      setSavedSentences(prev => [newSaved, ...prev]);
      showToast('已加入收藏本');
  };

  const handleDeleteSentence = (id: string) => {
      setSavedSentences(prev => prev.filter(s => s.id !== id));
  };

  const stopAudio = () => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch (e) {
        // ignore
      }
      sourceNodeRef.current = null;
    }
    setCurrentlyPlayingId(null);
  };

  const handleSendMessage = async (text: string) => {
    if (!currentSessionId) return;

    stopAudio();

    const newMessageId = Date.now().toString();
    const userMessage: Message = {
      id: newMessageId,
      sender: Sender.USER,
      text: text,
      timestamp: new Date(),
    };

    setIsLoading(true);

    setSessions(prev => prev.map(session => {
      if (session.id === currentSessionId) {
        const isFirstUserMessage = session.messages.length <= 1;
        const newTitle = (session.title === '新对话' && isFirstUserMessage) 
          ? (text.slice(0, 10) + (text.length > 10 ? '...' : '')) 
          : session.title;

        return {
          ...session,
          title: newTitle,
          messages: [...session.messages, userMessage]
        };
      }
      return session;
    }));

    try {
      const allHistoryMessages = messages.filter(m => m.id !== 'welcome');
      const recentHistory = [...allHistoryMessages, userMessage].slice(-12); 
      const apiHistory = recentHistory.slice(0, -1).map(m => ({
          role: m.sender === Sender.USER ? 'user' as const : 'model' as const,
          parts: [{ text: m.text }]
        }));

      const tutorResponse: TutorResponse = await sendMessageToTutor(apiHistory, text);

      setSessions(prev => prev.map(session => {
        if (session.id === currentSessionId) {
          const updatedMessages = session.messages.map(m => 
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
          );

          const aiMessageId = (Date.now() + 1).toString();
          const aiMessage: Message = {
            id: aiMessageId,
            sender: Sender.AI,
            text: tutorResponse.reply,
            translation: tutorResponse.replyTranslation,
            timestamp: new Date(),
          };

          return {
            ...session,
            messages: [...updatedMessages, aiMessage]
          };
        }
        return session;
      }));

      const aiMsgId = (Date.now() + 1).toString();
      handlePlayAudio(tutorResponse.reply, aiMsgId);

    } catch (error) {
      console.error("Error processing message:", error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        sender: Sender.AI,
        text: "申し訳ありません。エラーが発生しました。(抱歉，发生了错误。)",
        timestamp: new Date(),
      };
      
      setSessions(prev => prev.map(session => {
        if (session.id === currentSessionId) {
          return { ...session, messages: [...session.messages, errorMessage] };
        }
        return session;
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayAudio = async (text: string, messageId: string) => {
    if (currentlyPlayingId === messageId) {
      stopAudio();
      return;
    }

    stopAudio();
    setCurrentlyPlayingId(messageId);

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
      }
      
      // Resume context if suspended (browser policy)
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      const base64Audio = await generateSpeech(text);
      const audioBuffer = await decodeAudioData(
        decode(base64Audio),
        audioContextRef.current,
        24000,
        1
      );

      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.onended = () => {
        setCurrentlyPlayingId(null);
        sourceNodeRef.current = null;
      };
      
      sourceNodeRef.current = source;
      source.start();

    } catch (error) {
      console.error("Audio Playback Error:", error);
      setCurrentlyPlayingId(null);
    }
  };

  return (
    <div className="flex h-full bg-slate-50 overflow-hidden relative">
      
      {/* Toast Notification */}
      {toastMessage && (
          <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] animate-fade-in-down">
              <div className="bg-slate-800 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium">
                  <Check size={16} className="text-green-400" />
                  {toastMessage}
              </div>
          </div>
      )}

      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={setCurrentSessionId}
        onNewChat={handleNewChat}
        onClearAll={handleClearAllSessions}
        onOpenSaved={() => setIsSavedViewOpen(true)}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full relative min-w-0">
        <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-indigo-100/50 to-transparent pointer-events-none" />

        <header className="flex-shrink-0 px-4 py-3 md:py-4 bg-white/80 backdrop-blur-md border-b border-indigo-50 sticky top-0 z-10 flex items-center gap-3">
          <button 
            onClick={() => setIsSidebarOpen(prev => !prev)}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title={isSidebarOpen ? "收起侧边栏" : "展开侧边栏"}
          >
            <Menu size={20} />
          </button>

          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-md shadow-indigo-200">
                <Languages size={24} />
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight truncate max-w-[150px] md:max-w-none">
                   {currentSession?.title || 'AI 日语口语私教'}
                </h1>
                <p className="hidden md:block text-xs text-slate-500 font-medium">实时语音对话与纠错</p>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-xs font-semibold border border-rose-100">
                <Sparkles size={14} />
                <span>AI 智能纠错</span>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-semibold border border-indigo-100">
                <BookOpen size={14} />
                <span>AI 原声发音</span>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-6 scroll-smooth">
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((msg) => (
              <ChatMessage 
                key={msg.id} 
                message={msg} 
                onPlayAudio={handlePlayAudio}
                isPlaying={currentlyPlayingId === msg.id}
                onSave={handleSaveSentence}
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

        <footer className="flex-shrink-0 z-20">
          <VoiceInput onSend={handleSendMessage} disabled={isLoading} />
        </footer>
      </div>

      {/* Saved Sentences Full Screen View */}
      <SavedSentencesView 
        isOpen={isSavedViewOpen} 
        onClose={() => setIsSavedViewOpen(false)}
        savedSentences={savedSentences}
        onDelete={handleDeleteSentence}
      />

    </div>
  );
}