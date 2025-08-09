import { NextRequest, NextResponse } from 'next/server';
import { NotebookManager } from '@/core/notebook/NotebookManager';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const notebookId = searchParams.get('id');
    const format = searchParams.get('format') || 'json';

    if (!notebookId) {
      return NextResponse.json(
        { error: 'Notebook ID is required' },
        { status: 400 }
      );
    }

    const manager = new NotebookManager();
    const notebook = await manager.load(notebookId);

    if (!notebook) {
      return NextResponse.json(
        { error: 'Notebook not found' },
        { status: 404 }
      );
    }

    const data = notebook.getData();

    switch (format.toLowerCase()) {
      case 'json': {
        return NextResponse.json(data, {
          headers: {
            'Content-Disposition': `attachment; filename="session_${notebookId}.json"`,
            'Content-Type': 'application/json'
          }
        });
      }

      case 'csv': {
        const csvContent = generateCSV(data);
        return new NextResponse(csvContent, {
          headers: {
            'Content-Disposition': `attachment; filename="session_${notebookId}.csv"`,
            'Content-Type': 'text/csv'
          }
        });
      }

      case 'txt': {
        const txtContent = generateText(data);
        return new NextResponse(txtContent, {
          headers: {
            'Content-Disposition': `attachment; filename="session_${notebookId}.txt"`,
            'Content-Type': 'text/plain'
          }
        });
      }

      default:
        return NextResponse.json(
          { error: 'Unsupported format. Use json, csv, or txt' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to export notebook' },
      { status: 500 }
    );
  }
}

function generateCSV(data: any): string {
  const rows: string[] = [];
  
  // Header
  rows.push('Type,Timestamp,Speaker,Content,Topic');
  
  // Messages
  for (const message of data.messages || []) {
    const row = [
      'Message',
      new Date(message.timestamp).toISOString(),
      message.speaker,
      `"${message.text.replace(/"/g, '""')}"`, // Escape quotes
      data.currentTopic || ''
    ];
    rows.push(row.join(','));
  }
  
  // Notes
  for (const note of data.notes || []) {
    const row = [
      'Note',
      note.time || '',
      'therapist',
      `"${note.note.replace(/"/g, '""')}"`,
      note.topic || ''
    ];
    rows.push(row.join(','));
  }
  
  return rows.join('\n');
}

function generateText(data: any): string {
  const sections: string[] = [];
  
  // Header
  sections.push('='.repeat(50));
  sections.push(`SESSION NOTEBOOK: ${data.id}`);
  sections.push(`Therapist: ${data.therapistId}`);
  sections.push(`Client: ${data.clientName}`);
  sections.push(`Date: ${new Date(data.sessionDate).toLocaleDateString()}`);
  sections.push(`Duration: ${data.duration || 0} minutes`);
  sections.push(`Status: ${data.status}`);
  sections.push('='.repeat(50));
  sections.push('');

  // User Profile
  if (data.userProfile && Object.keys(data.userProfile).length > 0) {
    sections.push('USER PROFILE:');
    sections.push('-'.repeat(20));
    for (const [key, value] of Object.entries(data.userProfile)) {
      if (value) {
        sections.push(`${key}: ${JSON.stringify(value, null, 2)}`);
      }
    }
    sections.push('');
  }

  // Conversation
  if (data.messages && data.messages.length > 0) {
    sections.push('CONVERSATION:');
    sections.push('-'.repeat(20));
    for (const message of data.messages) {
      const timestamp = new Date(message.timestamp).toLocaleTimeString();
      const speaker = message.speaker.toUpperCase();
      sections.push(`[${timestamp}] ${speaker}: ${message.text}`);
    }
    sections.push('');
  }

  // Notes
  if (data.notes && data.notes.length > 0) {
    sections.push('THERAPIST NOTES:');
    sections.push('-'.repeat(20));
    for (const note of data.notes) {
      sections.push(`[${note.time}] ${note.topic}: ${note.note}`);
    }
    sections.push('');
  }

  // Qualitative Report
  if (data.qualitativeReport) {
    sections.push('QUALITATIVE REPORT:');
    sections.push('-'.repeat(20));
    sections.push(`Summary: ${data.qualitativeReport.summary}`);
    sections.push('');
    
    if (data.qualitativeReport.keyInsights?.length > 0) {
      sections.push('Key Insights:');
      for (const insight of data.qualitativeReport.keyInsights) {
        sections.push(`• ${insight}`);
      }
      sections.push('');
    }
    
    if (data.qualitativeReport.recommendations?.length > 0) {
      sections.push('Recommendations:');
      for (const rec of data.qualitativeReport.recommendations) {
        sections.push(`• ${rec}`);
      }
      sections.push('');
    }
    
    if (data.qualitativeReport.actionItems?.length > 0) {
      sections.push('Action Items:');
      for (const action of data.qualitativeReport.actionItems) {
        sections.push(`• ${action}`);
      }
      sections.push('');
    }
  }

  // Quantitative Report
  if (data.quantitativeReport) {
    sections.push('QUANTITATIVE REPORT:');
    sections.push('-'.repeat(20));
    
    const budget = data.quantitativeReport.monthlyBudget;
    if (budget) {
      sections.push(`Monthly Income: $${budget.income || 0}`);
      sections.push(`Monthly Expenses: $${Object.values(budget.expenses || {}).reduce((a: number, b: any) => a + (typeof b === 'number' ? b : 0), 0)}`);
      sections.push(`Monthly Surplus: $${budget.surplus || 0}`);
      sections.push(`Savings Rate: ${budget.savingsRate || 0}%`);
      sections.push('');
      
      if (budget.expenses) {
        sections.push('Expense Breakdown:');
        for (const [category, amount] of Object.entries(budget.expenses)) {
          sections.push(`  ${category}: $${amount}`);
        }
        sections.push('');
      }
    }
    
    if (data.quantitativeReport.savingsOpportunities?.length > 0) {
      sections.push('Savings Opportunities:');
      for (const opp of data.quantitativeReport.savingsOpportunities) {
        sections.push(`• ${opp.category}: Save $${opp.potentialSaving} - ${opp.suggestion}`);
      }
      sections.push('');
    }
  }

  // Extracted Financial Data
  if (data.extractedData) {
    sections.push('EXTRACTED FINANCIAL DATA:');
    sections.push('-'.repeat(20));
    sections.push(JSON.stringify(data.extractedData, null, 2));
    sections.push('');
  }

  sections.push('='.repeat(50));
  sections.push(`Generated: ${new Date().toISOString()}`);
  
  return sections.join('\n');
}