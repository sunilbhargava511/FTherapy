import { NextRequest, NextResponse } from 'next/server';
import { SessionNotebook } from '@/core/notebook/SessionNotebook';
import { NotebookManager } from '@/core/notebook/NotebookManager';
import { SessionNotebookData } from '@/core/notebook/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case 'create': {
        const { therapistId, clientName } = params;
        const manager = new NotebookManager();
        const notebook = await manager.createOrRestore(therapistId, clientName);
        
        return NextResponse.json({
          success: true,
          notebook: notebook.toJSON()
        });
      }

      case 'save': {
        const { notebook: notebookData } = params;
        // For now, just acknowledge - actual storage will be implemented
        // In production, this would save to database
        console.log('Saving notebook:', notebookData.id);
        
        return NextResponse.json({ 
          success: true,
          id: notebookData.id 
        });
      }

      case 'generateReports': {
        const { notebookId } = params;
        const manager = new NotebookManager();
        const notebook = await manager.load(notebookId);
        
        if (!notebook) {
          return NextResponse.json(
            { error: 'Notebook not found' },
            { status: 404 }
          );
        }

        // Import ReportGenerator only on server-side
        const { ReportGenerator } = await import('@/core/reporting/ReportGenerator');
        const generator = new ReportGenerator();
        const reports = await generator.generateReports(notebook);
        
        // Save the updated notebook with reports
        await manager.save();
        
        return NextResponse.json({
          success: true,
          reports
        });
      }

      case 'complete': {
        const { notebookId } = params;
        const manager = new NotebookManager();
        const notebook = await manager.load(notebookId);
        
        if (!notebook) {
          return NextResponse.json(
            { error: 'Notebook not found' },
            { status: 404 }
          );
        }

        await manager.completeSession();
        
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Notebook API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const notebookId = searchParams.get('id');
    
    if (!notebookId) {
      // List all notebooks
      const manager = new NotebookManager();
      const notebooks = await manager.listNotebooks();
      
      return NextResponse.json({
        notebooks,
        count: notebooks.length
      });
    }

    // Get specific notebook
    const manager = new NotebookManager();
    const notebook = await manager.load(notebookId);
    
    if (!notebook) {
      return NextResponse.json(
        { error: 'Notebook not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(notebook.toJSON());
  } catch (error) {
    console.error('Failed to get notebook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}