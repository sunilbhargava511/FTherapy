import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// Store failures in a JSON file for analysis
const FAILURE_LOG_PATH = path.join(process.cwd(), 'api-failures.json');

interface FailureLog {
  timestamp: string;
  failureType: string;
  therapistId?: string;
  currentTopic?: string;
  errorMessage?: string;
  userAgent?: string;
}

async function readFailureLogs(): Promise<FailureLog[]> {
  try {
    const data = await fs.readFile(FAILURE_LOG_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // File doesn't exist yet
    return [];
  }
}

async function writeFailureLogs(logs: FailureLog[]): Promise<void> {
  await fs.writeFile(FAILURE_LOG_PATH, JSON.stringify(logs, null, 2));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { failureType, therapistId, currentTopic, errorMessage } = body;
    
    const newLog: FailureLog = {
      timestamp: new Date().toISOString(),
      failureType,
      therapistId,
      currentTopic,
      errorMessage,
      userAgent: request.headers.get('user-agent') || undefined
    };
    
    // Read existing logs
    const logs = await readFailureLogs();
    
    // Add new log
    logs.push(newLog);
    
    // Keep only last 1000 failures to prevent file from growing too large
    if (logs.length > 1000) {
      logs.splice(0, logs.length - 1000);
    }
    
    // Write back to file
    await writeFailureLogs(logs);
    
    console.log('[FAILURE_LOGGED]', newLog);
    
    return NextResponse.json({ 
      success: true,
      message: 'Failure logged successfully'
    });
  } catch (error) {
    console.error('Error logging failure:', error);
    return NextResponse.json(
      { error: 'Failed to log failure' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const logs = await readFailureLogs();
    
    // Calculate statistics
    const stats = {
      totalFailures: logs.length,
      failuresByType: {} as Record<string, number>,
      failuresByTherapist: {} as Record<string, number>,
      failuresByTopic: {} as Record<string, number>,
      last24Hours: 0,
      lastFailure: logs[logs.length - 1]?.timestamp || null
    };
    
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    logs.forEach(log => {
      // Count by type
      stats.failuresByType[log.failureType] = (stats.failuresByType[log.failureType] || 0) + 1;
      
      // Count by therapist
      if (log.therapistId) {
        stats.failuresByTherapist[log.therapistId] = (stats.failuresByTherapist[log.therapistId] || 0) + 1;
      }
      
      // Count by topic
      if (log.currentTopic) {
        stats.failuresByTopic[log.currentTopic] = (stats.failuresByTopic[log.currentTopic] || 0) + 1;
      }
      
      // Count last 24 hours
      if (new Date(log.timestamp) > oneDayAgo) {
        stats.last24Hours++;
      }
    });
    
    return NextResponse.json({
      stats,
      recentFailures: logs.slice(-10).reverse() // Last 10 failures, most recent first
    });
  } catch (error) {
    console.error('Error reading failure logs:', error);
    return NextResponse.json(
      { error: 'Failed to read failure logs' },
      { status: 500 }
    );
  }
}