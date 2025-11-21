import React, { useState } from 'react';
import { X, Trash2, Download, BookOpen, List, ChevronLeft, ChevronRight, RotateCw } from 'lucide-react';
import { SavedSentence } from '../types';

interface SavedSentencesViewProps {
  isOpen: boolean;
  onClose: () => void;
  savedSentences: SavedSentence[];
  onDelete: (id: string) => void;
}

const SavedSentencesView: React.FC<SavedSentencesViewProps> = ({
  isOpen,
  onClose,
  savedSentences,
  onDelete,
}) => {
  const [mode, setMode] = useState<'list' | 'review'>('list');
  const [reviewIndex, setReviewIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  if (!isOpen) return null;

  const handleExportMarkdown = () => {
    let mdContent = "# 日语学习收藏本\n\n";
    mdContent += `导出时间: ${new Date().toLocaleString()}\n\n`;
    
    savedSentences.forEach((item, index) => {
      mdContent += `### ${index + 1}. ${item.source}\n`;
      mdContent += `**原文**: ${item.original}\n\n`;
      if (item.translation) {
        mdContent += `**翻译**: ${item.translation}\n\n`;
      }
      if (item.note) {
        mdContent += `> 备注: ${item.note}\n\n`;
      }
      mdContent += `---\n\n`;
    });

    const blob = new Blob([mdContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `japanese-notes-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Review Navigation
  const handleNext = () => {
    setIsFlipped(false);
    setReviewIndex((prev) => (prev + 1) % savedSentences.length);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setReviewIndex((prev) => (prev - 1 + savedSentences.length) % savedSentences.length);
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col animate-fade-in">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={24} className="text-slate-500" />
          </button>
          <h2 className="text-lg font-bold text-slate-800">我的收藏本 ({savedSentences.length})</h2>
        </div>
        
        <div className="flex bg-slate-100 rounded-lg p-1">
            <button 
                onClick={() => setMode('list')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                    mode === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
            >
                <List size={16} />
                列表
            </button>
            <button 
                onClick={() => {
                    setMode('review');
                    setReviewIndex(0);
                    setIsFlipped(false);
                }}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                    mode === 'review' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
            >
                <BookOpen size={16} />
                复习
            </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-6">
        <div className="max-w-3xl mx-auto h-full flex flex-col">
            
            {savedSentences.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                    <BookOpen size={48} className="mb-4 opacity-20" />
                    <p>还没有收藏任何句子</p>
                    <p className="text-sm mt-2">在聊天中点击书签图标或选中文字进行收藏</p>
                </div>
            ) : mode === 'list' ? (
                // LIST MODE
                <>
                    <div className="flex justify-end mb-4">
                        <button 
                            onClick={handleExportMarkdown}
                            className="flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 transition-colors bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm hover:border-indigo-200"
                        >
                            <Download size={16} />
                            导出 Markdown
                        </button>
                    </div>
                    <div className="space-y-3">
                        {savedSentences.map((item) => (
                            <div key={item.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                                                item.source === 'AI修正' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                                item.source === 'AI回复' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                                                'bg-slate-100 text-slate-600 border-slate-200'
                                            }`}>
                                                {item.source}
                                            </span>
                                            <span className="text-xs text-slate-400">
                                                {new Date(item.timestamp).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className="text-lg font-jp font-medium text-slate-800 mb-1 leading-relaxed">
                                            {item.original}
                                        </p>
                                        {item.translation && (
                                            <p className="text-sm text-slate-500">{item.translation}</p>
                                        )}
                                        {item.note && (
                                            <p className="text-xs text-slate-400 mt-2 italic bg-slate-50 p-2 rounded">
                                                注: {item.note}
                                            </p>
                                        )}
                                    </div>
                                    <button 
                                        onClick={() => onDelete(item.id)}
                                        className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                        title="删除"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                // REVIEW MODE
                <div className="flex flex-col items-center justify-center h-full py-10">
                    <div className="w-full max-w-xl perspective-1000 h-80 cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
                        <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                            
                            {/* Front */}
                            <div className="absolute w-full h-full backface-hidden bg-white rounded-3xl shadow-xl border border-slate-100 flex flex-col items-center justify-center p-8 text-center">
                                <span className="absolute top-6 left-6 text-xs font-bold text-slate-300 uppercase tracking-wider">JAPANESE</span>
                                <h3 className="text-2xl md:text-3xl font-jp font-medium text-slate-800 leading-relaxed">
                                    {savedSentences[reviewIndex].original}
                                </h3>
                                <p className="absolute bottom-6 text-xs text-slate-400 flex items-center gap-1">
                                    <RotateCw size={12} /> 点击翻转
                                </p>
                            </div>

                            {/* Back */}
                            <div className="absolute w-full h-full backface-hidden bg-indigo-600 rounded-3xl shadow-xl rotate-y-180 flex flex-col items-center justify-center p-8 text-center text-white">
                                <span className="absolute top-6 left-6 text-xs font-bold text-indigo-300 uppercase tracking-wider">MEANING</span>
                                {savedSentences[reviewIndex].translation ? (
                                     <p className="text-xl font-medium mb-4">
                                        {savedSentences[reviewIndex].translation}
                                     </p>
                                ) : (
                                    <p className="text-indigo-200 italic">无翻译</p>
                                )}
                                <div className="mt-4 pt-4 border-t border-indigo-500/30 w-full max-w-[200px]">
                                    <span className="text-xs text-indigo-300 block mb-1">来源</span>
                                    <span className="text-sm font-medium">{savedSentences[reviewIndex].source}</span>
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-8 mt-10">
                        <button onClick={handlePrev} className="p-4 rounded-full bg-white shadow-md hover:bg-slate-50 text-slate-600 transition-all border border-slate-100">
                            <ChevronLeft size={24} />
                        </button>
                        <span className="text-slate-400 font-mono font-medium">
                            {reviewIndex + 1} / {savedSentences.length}
                        </span>
                        <button onClick={handleNext} className="p-4 rounded-full bg-white shadow-md hover:bg-slate-50 text-slate-600 transition-all border border-slate-100">
                            <ChevronRight size={24} />
                        </button>
                    </div>
                </div>
            )}
        </div>
      </div>
      
      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .transform-style-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}</style>
    </div>
  );
};

export default SavedSentencesView;