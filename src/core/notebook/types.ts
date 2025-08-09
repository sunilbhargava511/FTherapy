import { ConversationMessage, TherapistNote, ConversationTopic } from '@/lib/types';

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
  };
}

export interface ExtractedFinancialData {
  income: {
    monthly?: number;
    annual?: number;
    source?: string;
  };
  expenses: {
    housing?: number;
    food?: number;
    transport?: number;
    fitness?: number;
    entertainment?: number;
    subscriptions?: number;
    travel?: number;
    other?: number;
    total?: number;
  };
  goals: {
    shortTerm?: string[];
    longTerm?: string[];
    savings?: number;
  };
  debts?: {
    total?: number;
    items?: Array<{ type: string; amount: number; rate?: number; }>;
  };
}

export interface QualitativeReport {
  summary: string;
  keyInsights: string[];
  recommendations: string[];
  actionItems: string[];
  emotionalInsights?: string;
  behavioralPatterns?: string;
  generatedAt: Date;
}

export interface QuantitativeReport {
  monthlyBudget: {
    income: number;
    expenses: { [category: string]: number };
    surplus: number;
    savingsRate: number;
  };
  savingsOpportunities: Array<{
    category: string;
    currentSpend: number;
    recommendedSpend: number;
    potentialSaving: number;
    suggestion: string;
  }>;
  projections: {
    threeMonth: { savings: number; netWorth: number; };
    sixMonth: { savings: number; netWorth: number; };
    oneYear: { savings: number; netWorth: number; };
  };
  generatedAt: Date;
}

export interface SessionNotebookData {
  // Core identification
  id: string;
  therapistId: string;
  clientName: string;
  sessionDate: Date;
  
  // Conversation data
  messages: ConversationMessage[];
  notes: TherapistNote[];
  currentTopic: ConversationTopic;
  
  // Extracted profile
  userProfile: UserProfile;
  extractedData?: ExtractedFinancialData;
  
  // Generated reports
  qualitativeReport?: QualitativeReport;
  quantitativeReport?: QuantitativeReport;
  
  // Metadata
  duration?: number; // in minutes
  status: 'active' | 'completed' | 'abandoned';
  createdAt: Date;
  updatedAt: Date;
  
  // For future phases
  userId?: string; // Phase 2
  shareToken?: string; // Phase 2
}

export interface NotebookSummary {
  id: string;
  therapistId: string;
  clientName: string;
  sessionDate: Date;
  duration: number;
  status: string;
  hasReports: boolean;
}