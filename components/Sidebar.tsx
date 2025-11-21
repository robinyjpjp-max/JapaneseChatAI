import React, { useState, useEffect } from 'react';
import { MessageSquarePlus, MessageSquare, X, Trash2, AlertCircle, BookMarked } from 'lucide-react';
import { ChatSession } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  currentSessionId: string;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onClearAll: () => void;
  onOpenSaved: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  sessions,
  currentSessionId,
  onSelectSession,
  onNewChat,
  onClearAll,
  onOpenSaved,
}) => {
  // Sort sessions by date (newest first)
  const sortedSessions = [...sessions].sort((a, b) => b.createdAt - a.createdAt);

  // State for delete confirmation
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);

  // Auto-reset confirmation state after 3 seconds
  useEffect(() => {
    if (isConfirmingClear) {
      const timer = setTimeout(() => {
        setIsConfirmingClear(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isConfirmingClear]);

  const handleClearClick = () => {
    if (isConfirmingClear) {
      onClearAll();
      setIsConfirmingClear(false);
      if (window.innerWidth < 768) onClose();
    } else {
      setIsConfirmingClear(true);
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside 
        className={`fixed md:relative z-50 h-full bg-white border-r border-slate-200 flex flex-col transition-all duration-300 ease-in-out overflow-hidden
          ${/* Mobile: slide in/out */ ''}
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          
          ${/* Desktop: always visible via translate, toggle width */ ''}
          md:translate-x-0
          ${isOpen ? 'md:w-72 md:opacity-100' : 'md:w-0 md:opacity-0 md:border-r-0'}
        `}
      >
        {/* Inner Container: Fixed width ensures content doesn't wrap/squash during width transition */}
        <div className="w-72 flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
                <h2 className="font-bold text-slate-700">历史记录</h2>
                <button onClick={onClose} className="md:hidden p-1 text-slate-400 hover:text-slate-600">
                    <X size={20} />
                </button>
            </div>

            {/* Action Buttons */}
            <div className="p-4 flex-shrink-0 space-y-2">
              <button
                onClick={() => {
                    onNewChat();
                    if (window.innerWidth < 768) onClose();
                }}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-4 rounded-xl shadow-sm shadow-indigo-200 transition-all font-medium"
              >
                <MessageSquarePlus size={20} />
                新建对话
              </button>

              <button
                onClick={() => {
                    onOpenSaved();
                    if (window.innerWidth < 768) onClose();
                }}
                className="w-full flex items-center justify-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 py-2.5 px-4 rounded-xl transition-all font-medium text-sm"
              >
                <BookMarked size={18} className="text-indigo-500" />
                我的收藏本
              </button>
            </div>

            {/* Session List */}
            <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
              {sortedSessions.length === 0 && (
                 <div className="text-center text-slate-400 text-sm py-8">
                    暂无历史记录
                 </div>
              )}
              
              {sortedSessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => {
                      onSelectSession(session.id);
                      if (window.innerWidth < 768) onClose();
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all border text-left
                    ${currentSessionId === session.id 
                      ? 'bg-indigo-50 border-indigo-100' 
                      : 'hover:bg-slate-50 border-transparent'
                    }
                  `}
                >
                  <MessageSquare 
                    size={18} 
                    className={`flex-shrink-0 ${currentSessionId === session.id ? 'text-indigo-600' : 'text-slate-400'}`} 
                  />
                  <div className="flex flex-col overflow-hidden min-w-0">
                      <span className={`text-sm truncate font-medium ${currentSessionId === session.id ? 'text-slate-800' : 'text-slate-600'}`}>
                          {session.title}
                      </span>
                      <span className="text-[10px] text-slate-400 truncate">
                          {new Date(session.createdAt).toLocaleDateString()} {new Date(session.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                  </div>
                </button>
              ))}
            </div>
            
            {/* Footer info and Clear button */}
            <div className="p-4 border-t border-slate-100 flex flex-col gap-3 flex-shrink-0">
                <button
                    onClick={handleClearClick}
                    className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg transition-all duration-200 text-sm font-medium
                        ${isConfirmingClear 
                            ? 'bg-rose-600 text-white shadow-md hover:bg-rose-700' 
                            : 'text-rose-500 hover:bg-rose-50'
                        }
                    `}
                    title="清空所有数据"
                >
                    {isConfirmingClear ? (
                        <>
                            <AlertCircle size={16} className="animate-pulse" />
                            再次点击确认删除
                        </>
                    ) : (
                        <>
                            <Trash2 size={16} />
                            清空所有历史
                        </>
                    )}
                </button>
                <p className="text-xs text-center text-slate-400">数据保存在浏览器本地</p>
            </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;