export enum Sender {
  USER = 'USER',
  AI = 'AI'
}

export interface FeedbackData {
  original: string;
  corrected: string;
  explanation: string;
  score: number; // 0-100
}

export interface Message {
  id: string;
  sender: Sender;
  text: string;
  timestamp: Date; // string in JSON, Date in runtime
  feedback?: FeedbackData; // Only for User messages
  translation?: string; // For AI messages
  isAudioPlaying?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number; // timestamp
  messages: Message[];
}

export interface TutorResponse {
  reply: string;
  replyTranslation: string;
  feedback: {
    correctedSentence: string;
    explanation: string;
    naturalnessScore: number;
  }
}

export interface SavedSentence {
  id: string;
  original: string;
  translation?: string;
  source: 'AI回复' | 'AI修正' | '手动选择';
  timestamp: number;
  note?: string; // Optional user note or context
}

// Web Speech API types
export interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}