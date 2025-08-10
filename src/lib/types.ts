export interface TherapistStyle {
  id: string;
  name: string;
  tagline: string;
  icon: string;
  color: string;
  voiceId?: string; // For future ElevenLabs integration
}

export interface ConversationMessage {
  id: string;
  speaker: 'user' | 'therapist';
  text: string;
  timestamp: Date;
}

export interface UserProfile {
  name?: string;
  age?: string;
  location?: string;
  occupation?: string;
  income?: {
    amount?: number;
    frequency?: 'annual' | 'monthly' | 'biweekly' | 'weekly';
  };
  lifestyle?: {
    housing?: { preference: string; details: string; cost?: number; };
    food?: { preference: string; details: string; cost?: number; };
    transport?: { preference: string; details: string; cost?: number; };
    fitness?: { preference: string; details: string; cost?: number; };
    entertainment?: { preference: string; details: string; cost?: number; };
    subscriptions?: { preference: string; details: string; cost?: number; };
    travel?: { preference: string; details: string; cost?: number; };
    lifeEvents?: { preference: string; details: string; cost?: number; };
  };
}

export interface TherapistNote {
  time: string;
  note: string;
  topic: string;
}

export interface ExpenseCategory {
  category: string;
  expenses: string[];
}

export interface BudgetItem {
  category: string;
  monthly: number;
  annual: number;
  percentage: number;
  icon: string;
}

export type ConversationTopic = 
  | 'intro'
  | 'name'
  | 'age'
  | 'interests'
  | 'housing_location'
  | 'housing_preference'
  | 'food_preference'
  | 'transport_preference'
  | 'fitness_preference'
  | 'entertainment_preference'
  | 'subscriptions_preference'
  | 'travel_preference'
  | 'summary';

export interface TherapistPersonality {
  id: string;
  name: string;
  tagline: string;
  icon: string;
  color: string;
  biography: {
    background: string;
    expertise: string[];
    keyMessages: string[];
    podcastTopics: string[];
  };
  conversationStyle: {
    tone: string;
    approach: string;
    keyPhrases: string[];
  };
  responses: {
    [topic in ConversationTopic]?: ResponsePattern;
  };
}

export interface ResponsePattern {
  positive?: string | ((input: string) => string);
  negative?: string | ((input: string) => string);
  default?: string | ((input: string) => string);
  questions?: string[];
  followUp?: string;
}

export interface VoiceControlSettings {
  responseLength: number; // 1-5: Very Brief to Very Detailed
  speakingPace: number;   // 1-5: Very Slow to Very Fast
  engagement: number;     // 1-5: Mostly Humor to Mostly Stories
  style: number;          // 1-5: Always Asking to Always Telling
  sttProvider: 'elevenlabs' | 'browser'; // STT provider preference
}