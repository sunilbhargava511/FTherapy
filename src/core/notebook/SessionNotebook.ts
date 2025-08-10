import { ConversationMessage, TherapistNote, ConversationTopic, UserProfile } from '@/lib/types';
import { 
  SessionNotebookData, 
  ExtractedFinancialData,
  QualitativeReport,
  QuantitativeReport 
} from './types';

export class SessionNotebook {
  private data: SessionNotebookData;
  private hasUnsavedChanges: boolean = false;
  private lastAutoSave: Date;

  constructor(therapistId: string, clientName: string = 'Anonymous', existingData?: SessionNotebookData) {
    if (existingData) {
      this.data = existingData;
    } else {
      this.data = {
        id: this.generateId(),
        therapistId,
        clientName,
        sessionDate: new Date(),
        messages: [],
        notes: [],
        currentTopic: 'intro' as ConversationTopic,
        userProfile: {},
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }
    this.lastAutoSave = new Date();
  }

  private generateId(): string {
    return `notebook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Getters
  getId(): string {
    return this.data.id;
  }

  getTherapistId(): string {
    return this.data.therapistId;
  }

  getMessages(): ConversationMessage[] {
    return this.data.messages;
  }

  getNotes(): TherapistNote[] {
    return this.data.notes;
  }

  getCurrentTopic(): ConversationTopic {
    return this.data.currentTopic;
  }

  getUserProfile(): UserProfile {
    return this.data.userProfile;
  }

  getStatus(): string {
    return this.data.status;
  }

  getData(): SessionNotebookData {
    return { ...this.data };
  }

  hasChanges(): boolean {
    return this.hasUnsavedChanges;
  }

  // Message management
  addMessage(message: ConversationMessage): void {
    this.data.messages.push(message);
    this.data.updatedAt = new Date();
    this.hasUnsavedChanges = true;
    
    // Update duration
    if (this.data.messages.length > 0) {
      const firstMessage = this.data.messages[0];
      const duration = Math.round(
        (new Date().getTime() - new Date(firstMessage.timestamp).getTime()) / 60000
      );
      this.data.duration = duration;
    }
  }

  // Note management
  addNote(note: TherapistNote): void {
    this.data.notes.push(note);
    this.data.updatedAt = new Date();
    this.hasUnsavedChanges = true;
  }

  // Topic management
  updateTopic(topic: ConversationTopic): void {
    this.data.currentTopic = topic;
    this.data.updatedAt = new Date();
    this.hasUnsavedChanges = true;
  }

  // Profile management
  updateProfile(updates: Partial<UserProfile>): void {
    this.data.userProfile = {
      ...this.data.userProfile,
      ...updates
    };
    this.data.updatedAt = new Date();
    this.hasUnsavedChanges = true;
  }

  // Financial data management
  setExtractedData(data: ExtractedFinancialData): void {
    this.data.extractedData = data;
    this.data.updatedAt = new Date();
    this.hasUnsavedChanges = true;
  }

  // Report management
  attachQualitativeReport(report: QualitativeReport): void {
    this.data.qualitativeReport = report;
    this.data.updatedAt = new Date();
    this.hasUnsavedChanges = true;
  }

  attachQuantitativeReport(report: QuantitativeReport): void {
    this.data.quantitativeReport = report;
    this.data.updatedAt = new Date();
    this.hasUnsavedChanges = true;
  }

  hasReports(): boolean {
    return !!(this.data.qualitativeReport && this.data.quantitativeReport);
  }

  // Session lifecycle
  markCompleted(): void {
    this.data.status = 'completed';
    this.data.updatedAt = new Date();
    this.hasUnsavedChanges = true;
  }

  markAbandoned(): void {
    this.data.status = 'abandoned';
    this.data.updatedAt = new Date();
    this.hasUnsavedChanges = true;
  }

  // Persistence helpers
  markSaved(): void {
    this.hasUnsavedChanges = false;
    this.lastAutoSave = new Date();
  }

  getLastAutoSave(): Date {
    return this.lastAutoSave;
  }

  // Serialization
  toJSON(): SessionNotebookData {
    return this.data;
  }

  static fromJSON(data: SessionNotebookData): SessionNotebook {
    return new SessionNotebook(data.therapistId, data.clientName, data);
  }

  // Summary for listing
  getSummary(): {
    id: string;
    therapistId: string;
    clientName: string;
    sessionDate: Date;
    duration: number;
    status: string;
    hasReports: boolean;
    messageCount: number;
    noteCount: number;
  } {
    return {
      id: this.data.id,
      therapistId: this.data.therapistId,
      clientName: this.data.clientName,
      sessionDate: this.data.sessionDate,
      duration: this.data.duration || 0,
      status: this.data.status,
      hasReports: this.hasReports(),
      messageCount: this.data.messages.length,
      noteCount: this.data.notes.length
    };
  }
}