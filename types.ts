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
  timestamp: Date;
  feedback?: FeedbackData; // Only for User messages
  translation?: string; // For AI messages
  isAudioPlaying?: boolean;
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

// Web Speech API types
export interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}