'use client';

import { useState, useCallback, useEffect } from 'react';
import { SessionNotebook } from '@/core/notebook/SessionNotebook';
import { QualitativeReport, QuantitativeReport } from '@/core/notebook/types';
import { notebookAPI } from '@/lib/api-client';

interface UseNotebookReportsState {
  isGeneratingReports: boolean;
  hasReports: boolean;
  error: string | null;
}

interface UseNotebookReportsActions {
  generateReports: () => Promise<{ qualitative: QualitativeReport; quantitative: QuantitativeReport } | null>;
  updateReportsStatus: (hasReports: boolean) => void;
}

export function useNotebookReports(
  notebook: SessionNotebook | null,
  onSaveNeeded?: () => Promise<void>
): UseNotebookReportsState & UseNotebookReportsActions {
  const [state, setState] = useState<UseNotebookReportsState>({
    isGeneratingReports: false,
    hasReports: notebook?.hasReports() || false,
    error: null
  });

  const updateReportsStatus = useCallback((hasReports: boolean) => {
    setState(prev => ({
      ...prev,
      hasReports
    }));
  }, []);

  const generateReports = useCallback(async () => {
    if (!notebook) return null;

    setState(prev => ({ ...prev, isGeneratingReports: true, error: null }));
    
    try {
      // Call the API endpoint to generate reports
      const result = await notebookAPI.generateReports(notebook.getId());
      
      // Update notebook with reports
      const reports = result.data as any;
      notebook.attachQualitativeReport(reports.reports.qualitative);
      notebook.attachQuantitativeReport(reports.reports.quantitative);
      
      setState(prev => ({
        ...prev,
        isGeneratingReports: false,
        hasReports: true,
        error: null
      }));

      // Auto-save after generating reports if callback provided
      if (onSaveNeeded) {
        await onSaveNeeded();
      }
      
      return reports.reports;
    } catch (error) {
      console.error('Failed to generate reports:', error);
      setState(prev => ({
        ...prev,
        isGeneratingReports: false,
        error: 'Failed to generate reports'
      }));
      return null;
    }
  }, [notebook, onSaveNeeded]);

  // Update hasReports when notebook changes
  useEffect(() => {
    if (notebook) {
      const currentHasReports = notebook.hasReports();
      if (currentHasReports !== state.hasReports) {
        updateReportsStatus(currentHasReports);
      }
    }
  }, [notebook, state.hasReports, updateReportsStatus]);

  return {
    // State
    ...state,
    
    // Actions
    generateReports,
    updateReportsStatus
  };
}