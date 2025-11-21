import { GoogleGenAI, Type, Modality } from "@google/genai";
import { TutorResponse } from '../types';
import { decode, decodeAudioData } from './audioUtils';

const API_KEY = process.env.API_KEY || '';

// Singleton instance
let ai: GoogleGenAI | null = null;

const getAI = () => {
  if (!ai) {
    ai = new GoogleGenAI({ apiKey: API_KEY });
  }
  return ai;
};

// System instruction for the Japanese Tutor
const SYSTEM_INSTRUCTION = `
You are "Sensei", an expert Japanese language tutor. 
Your goal is to have a natural spoken conversation with the user to improve their Japanese.
The user is a native Chinese speaker.

Rules:
1. Respond naturally to the user's message in Japanese.
2. If the user makes a mistake (grammar, unnatural phrasing, wrong vocabulary), you MUST provide a correction.
3. If the user's Japanese is perfect, suggest a more "native-like" or "advanced" alternative if possible, or just praise them.
4. Keep your replies concise (suitable for spoken dialogue).
5. Output strict JSON.

Your output must adhere to this specific JSON schema:
{
  "reply": "Your conversational response in Japanese",
  "replyTranslation": "Simplified Chinese translation of your reply",
  "feedback": {
    "correctedSentence": "The final natural and correct version of the user's input (or the same if perfect)",
    "explanation": "A brief explanation of the error or advice on naturalness (in Simplified Chinese)",
    "naturalnessScore": 0-100 integer representing how natural the user sounded
  }
}
`;

export const sendMessageToTutor = async (
  history: { role: 'user' | 'model'; parts: { text: string }[] }[],
  currentMessage: string
): Promise<TutorResponse> => {
  const client = getAI();

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        ...history,
        { role: 'user', parts: [{ text: currentMessage }] }
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: { type: Type.STRING },
            replyTranslation: { type: Type.STRING },
            feedback: {
              type: Type.OBJECT,
              properties: {
                correctedSentence: { type: Type.STRING },
                explanation: { type: Type.STRING },
                naturalnessScore: { type: Type.INTEGER },
              },
              required: ['correctedSentence', 'explanation', 'naturalnessScore']
            }
          },
          required: ['reply', 'replyTranslation', 'feedback']
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as TutorResponse;
    }
    throw new Error("Empty response from AI");
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    throw error;
  }
};

export const generateSpeech = async (text: string): Promise<AudioBuffer> => {
  const client = getAI();
  
  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash-preview-tts',
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' }, // Kore is a good Japanese-compatible voice usually
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    
    if (!base64Audio) {
        throw new Error("No audio data returned");
    }

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const audioBuffer = await decodeAudioData(decode(base64Audio), audioContext, 24000, 1);
    return audioBuffer;

  } catch (error) {
    console.error("Gemini TTS Error:", error);
    throw error;
  }
};