import { NextRequest, NextResponse } from 'next/server';
import { generateTherapistReport } from '@/lib/claude-api';
import { getTherapist } from '@/lib/therapist-loader';
import { SessionNotebookData, ExtractedFinancialData, QualitativeReport } from '@/core/notebook/types';

export async function POST(request: NextRequest) {
  try {
    const { notebookData, financialData }: { 
      notebookData: SessionNotebookData, 
      financialData: ExtractedFinancialData 
    } = await request.json();

    const therapist = getTherapist(notebookData.therapistId);
    if (!therapist) {
      return NextResponse.json(
        { error: 'Therapist not found' },
        { status: 404 }
      );
    }

    // Prepare context for AI
    const context = {
      therapistName: therapist.name,
      therapistStyle: therapist.conversationStyle.tone,
      userProfile: notebookData.userProfile,
      financialData: financialData,
      conversationLength: notebookData.messages.length,
      sessionDuration: notebookData.duration || 0
    };

    // Generate report via Claude API
    const aiReport = await generateTherapistReport(
      notebookData.messages,
      context,
      'qualitative'
    );

    // Parse AI response into structured report
    const report = parseQualitativeReport(aiReport);

    return NextResponse.json(report);
  } catch (error) {
    console.error('Error generating qualitative report:', error);
    return NextResponse.json(
      { error: 'Failed to generate qualitative report' },
      { status: 500 }
    );
  }
}

/**
 * Parse AI-generated text into structured qualitative report
 */
function parseQualitativeReport(aiResponse: string): QualitativeReport {
  // This is a simplified parser - can be enhanced with better structure
  const sections = aiResponse.split('\n\n');
  
  const report: QualitativeReport = {
    summary: '',
    keyInsights: [],
    recommendations: [],
    actionItems: [],
    generatedAt: new Date()
  };

  // Extract summary (usually first paragraph)
  report.summary = sections[0] || 'Financial coaching session completed.';

  // Extract insights, recommendations, and action items
  for (const section of sections) {
    if (section.toLowerCase().includes('insight')) {
      const insights = section.split('\n').filter(line => line.trim().startsWith('-') || line.trim().startsWith('•'));
      report.keyInsights = insights.map(i => i.replace(/^[-•]\s*/, '').trim());
    }
    if (section.toLowerCase().includes('recommend')) {
      const recommendations = section.split('\n').filter(line => line.trim().startsWith('-') || line.trim().startsWith('•'));
      report.recommendations = recommendations.map(r => r.replace(/^[-•]\s*/, '').trim());
    }
    if (section.toLowerCase().includes('action') || section.toLowerCase().includes('next step')) {
      const actions = section.split('\n').filter(line => line.trim().startsWith('-') || line.trim().startsWith('•') || line.match(/^\d+\./));
      report.actionItems = actions.map(a => a.replace(/^[-•]\s*/, '').replace(/^\d+\.\s*/, '').trim());
    }
  }

  // Ensure we have at least some content
  if (report.keyInsights.length === 0) {
    report.keyInsights = ['Session data has been recorded for analysis'];
  }
  if (report.recommendations.length === 0) {
    report.recommendations = ['Continue tracking expenses and income'];
  }
  if (report.actionItems.length === 0) {
    report.actionItems = ['Review monthly budget', 'Set savings goals'];
  }

  return report;
}