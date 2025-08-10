import { SessionNotebook } from './SessionNotebook';
import { SessionNotebookData } from './types';
import { IStorage } from '@/services/storage/IStorage';
import { ConversationMessage, TherapistNote, ConversationTopic } from '@/lib/types';
import { notebookAPI, APIError } from '@/lib/api-client';

export class NotebookManager {
  private currentNotebook: SessionNotebook | null = null;
  private storage: IStorage | null = null;
  private autoSaveInterval: NodeJS.Timeout | null = null;
  private readonly AUTO_SAVE_INTERVAL = 30000; // 30 seconds
  private isServer: boolean;

  constructor(storage?: IStorage) {
    this.storage = storage || null;
    this.isServer = typeof window === 'undefined';
  }

  /**
   * Check if localStorage is available (browser environment)
   */
  private get hasLocalStorage(): boolean {
    return !this.isServer && typeof localStorage !== 'undefined';
  }

  /**
   * Create a completely new notebook (bypassing restoration)
   */
  async createNew(therapistId: string, clientName?: string): Promise<SessionNotebook> {
    // Complete any existing session first
    if (this.currentNotebook && this.currentNotebook.getStatus() === 'active') {
      await this.completeSession();
    }

    // Create fresh notebook
    const notebook = new SessionNotebook(therapistId, clientName);
    console.log('Created fresh notebook:', notebook.getId());
    this.currentNotebook = notebook;
    this.startAutoSave();
    
    // Initial save
    await this.save();
    
    return notebook;
  }

  /**
   * Create a new notebook or restore the most recent active one
   */
  async createOrRestore(therapistId: string, clientName?: string): Promise<SessionNotebook> {
    // Try to restore active session from localStorage first (browser only)
    if (this.hasLocalStorage) {
      const localNotebook = this.restoreFromLocalStorage();
      if (localNotebook && localNotebook.getStatus() === 'active') {
        console.log('Restored notebook from localStorage:', localNotebook.getId());
        this.currentNotebook = localNotebook;
        this.startAutoSave();
        return localNotebook;
      }
    }

    // Try to restore from server storage if available
    if (this.storage) {
      const serverNotebook = await this.restoreFromServer();
      if (serverNotebook && serverNotebook.getStatus() === 'active') {
        console.log('Restored notebook from server:', serverNotebook.getId());
        this.currentNotebook = serverNotebook;
        this.startAutoSave();
        return serverNotebook;
      }
    }

    // Create new notebook
    const notebook = new SessionNotebook(therapistId, clientName);
    console.log('Created new notebook:', notebook.getId());
    this.currentNotebook = notebook;
    this.startAutoSave();
    
    // Initial save
    await this.save();
    
    return notebook;
  }

  /**
   * Get the current notebook
   */
  getCurrentNotebook(): SessionNotebook | null {
    return this.currentNotebook;
  }

  /**
   * Save the current notebook
   */
  async save(): Promise<void> {
    if (!this.currentNotebook) return;

    try {
      // Save to localStorage for quick recovery (browser only)
      if (this.hasLocalStorage) {
        this.saveToLocalStorage();
      }

      // Save to server if storage is available
      if (this.storage) {
        await this.saveToServer();
      } else {
        // Fallback to API endpoint
        await this.saveViaAPI();
      }

      this.currentNotebook.markSaved();
      console.log('Notebook saved:', this.currentNotebook.getId());
    } catch (error) {
      console.error('Failed to save notebook:', error);
      // Keep localStorage as backup even if server save fails
    }
  }

  /**
   * Load a specific notebook by ID
   */
  async load(notebookId: string): Promise<SessionNotebook | null> {
    try {
      // Try localStorage first (browser only)
      if (this.hasLocalStorage) {
        const localData = localStorage.getItem(`notebook_${notebookId}`);
        if (localData) {
          const data = JSON.parse(localData) as SessionNotebookData;
          return SessionNotebook.fromJSON(data);
        }
      }

      // Try server storage
      if (this.storage) {
        const data = await this.storage.load<SessionNotebookData>(`notebook_${notebookId}`);
        if (data) {
          return SessionNotebook.fromJSON(data);
        }
      }

      // Try API
      const response = await notebookAPI.getById(notebookId);
      return SessionNotebook.fromJSON(response.data as SessionNotebookData);

      return null;
    } catch (error) {
      console.error('Failed to load notebook:', error);
      return null;
    }
  }

  /**
   * List all notebooks
   */
  async listNotebooks(): Promise<SessionNotebookData[]> {
    const notebooks: SessionNotebookData[] = [];

    // Get from localStorage (browser only)
    if (this.hasLocalStorage) {
      const localKeys = Object.keys(localStorage).filter(key => key.startsWith('notebook_'));
      for (const key of localKeys) {
        try {
          const data = JSON.parse(localStorage.getItem(key)!);
          notebooks.push(data);
        } catch (error) {
          console.error('Failed to parse notebook from localStorage:', key);
        }
      }
    }

    // Get from server if available
    if (this.storage) {
      const serverKeys = await this.storage.list('notebook_');
      for (const key of serverKeys) {
        try {
          const data = await this.storage.load<SessionNotebookData>(key);
          // Avoid duplicates
          if (data && !notebooks.find(n => n.id === data.id)) {
            notebooks.push(data);
          }
        } catch (error) {
          console.error('Failed to load notebook from server:', key);
        }
      }
    }

    // Sort by date, most recent first
    return notebooks.sort((a, b) => 
      new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime()
    );
  }

  /**
   * Complete the current session
   */
  async completeSession(): Promise<void> {
    if (!this.currentNotebook) return;

    this.currentNotebook.markCompleted();
    await this.save();
    this.stopAutoSave();
    this.currentNotebook = null;
  }

  /**
   * Abandon the current session
   */
  async abandonSession(): Promise<void> {
    if (!this.currentNotebook) return;

    this.currentNotebook.markAbandoned();
    await this.save();
    this.stopAutoSave();
    this.currentNotebook = null;
  }

  // Private helper methods

  private saveToLocalStorage(): void {
    if (!this.currentNotebook || !this.hasLocalStorage) return;
    
    const key = `notebook_${this.currentNotebook.getId()}`;
    const data = JSON.stringify(this.currentNotebook.toJSON());
    localStorage.setItem(key, data);
    
    // Also save as "current" for quick access
    localStorage.setItem('notebook_current', data);
  }

  private restoreFromLocalStorage(): SessionNotebook | null {
    if (!this.hasLocalStorage) return null;
    
    try {
      const data = localStorage.getItem('notebook_current');
      if (data) {
        const notebookData = JSON.parse(data) as SessionNotebookData;
        return SessionNotebook.fromJSON(notebookData);
      }
    } catch (error) {
      console.error('Failed to restore from localStorage:', error);
    }
    return null;
  }

  private async saveToServer(): Promise<void> {
    if (!this.storage || !this.currentNotebook) return;
    
    const key = `notebook_${this.currentNotebook.getId()}`;
    await this.storage.save(key, this.currentNotebook.toJSON());
    
    // Also save as latest
    await this.storage.save('notebook_latest', this.currentNotebook.toJSON());
  }

  private async restoreFromServer(): Promise<SessionNotebook | null> {
    if (!this.storage) return null;
    
    try {
      const data = await this.storage.load<SessionNotebookData>('notebook_latest');
      if (data) {
        return SessionNotebook.fromJSON(data);
      }
    } catch (error) {
      console.error('Failed to restore from server:', error);
    }
    return null;
  }

  private async saveViaAPI(): Promise<void> {
    if (!this.currentNotebook) return;

    const response = await notebookAPI.save(this.currentNotebook.toJSON());

    if (response.status !== 200) {
      throw new Error('Failed to save notebook via API');
    }
  }

  private startAutoSave(): void {
    this.stopAutoSave(); // Clear any existing interval
    
    this.autoSaveInterval = setInterval(async () => {
      if (this.currentNotebook?.hasChanges()) {
        console.log('Auto-saving notebook...');
        await this.save();
      }
    }, this.AUTO_SAVE_INTERVAL);
  }

  private stopAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    if (this.currentNotebook?.hasChanges()) {
      await this.save();
    }
    this.stopAutoSave();
    this.currentNotebook = null;
  }
}