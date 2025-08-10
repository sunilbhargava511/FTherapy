import { NextRequest, NextResponse } from 'next/server';
import { getSessionData } from '@/lib/session-storage';

export async function GET(request: NextRequest) {
  try {
    // Check what's in storage
    const latestSession = getSessionData('registry_latest');
    const debugInfo = {
      hasLatestSession: !!latestSession,
      latestSession: latestSession,
      timestamp: new Date().toISOString()
    };
    
    console.log('Debug session storage:', debugInfo);
    
    return NextResponse.json(debugInfo);
  } catch (error) {
    console.error('Debug sessions error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}