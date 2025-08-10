'use client';

import { useState, useCallback } from 'react';
import { SessionNotebook } from '@/core/notebook/SessionNotebook';
import { ConversationMessage, TherapistNote, ConversationTopic, UserProfile } from '@/lib/types';

interface UseNotebookContentState {
  lastUpdated: number;
}

interface UseNotebookContentActions {
  addMessage: (message: ConversationMessage) => void;
  addNote: (note: TherapistNote) => void;
  updateTopic: (topic: ConversationTopic) => void;
  updateProfile: (profileData: Partial<UserProfile>) => void;
  getMessages: () => ConversationMessage[];
  getNotes: () => TherapistNote[];
  getCurrentTopic: () => ConversationTopic;
  getUserProfile: () => any;
  triggerUpdate: () => void;
}

export function useNotebookContent(
  notebook: SessionNotebook | null
): UseNotebookContentState & UseNotebookContentActions {
  const [state, setState] = useState<UseNotebookContentState>({
    lastUpdated: 0
  });

  const triggerUpdate = useCallback(() => {
    setState(prev => ({
      ...prev,
      lastUpdated: Date.now()
    }));
  }, []);

  const addMessage = useCallback((message: ConversationMessage) => {
    if (!notebook) return;

    notebook.addMessage(message);
    triggerUpdate();
  }, [notebook, triggerUpdate]);

  const addNote = useCallback((note: TherapistNote) => {
    if (!notebook) return;

    notebook.addNote(note);
    triggerUpdate();
  }, [notebook, triggerUpdate]);

  const updateTopic = useCallback((topic: ConversationTopic) => {
    if (!notebook) return;

    notebook.updateTopic(topic);
    triggerUpdate();
  }, [notebook, triggerUpdate]);

  const updateProfile = useCallback((profileData: Partial<UserProfile>) => {
    if (!notebook) return;

    notebook.updateProfile(profileData);
    triggerUpdate();
  }, [notebook, triggerUpdate]);

  // Data access helpers - these depend on lastUpdated to force re-computation
  const getMessages = useCallback((): ConversationMessage[] => {
    return notebook?.getMessages() || [];
  }, [notebook, state.lastUpdated]);

  const getNotes = useCallback((): TherapistNote[] => {
    return notebook?.getNotes() || [];
  }, [notebook, state.lastUpdated]);

  const getCurrentTopic = useCallback((): ConversationTopic => {
    return notebook?.getCurrentTopic() || 'intro';
  }, [notebook, state.lastUpdated]);

  const getUserProfile = useCallback(() => {
    return notebook?.getUserProfile() || {};
  }, [notebook, state.lastUpdated]);

  return {
    // State
    ...state,
    
    // Actions
    addMessage,
    addNote,
    updateTopic,
    updateProfile,
    getMessages,
    getNotes,
    getCurrentTopic,
    getUserProfile,
    triggerUpdate
  };
}