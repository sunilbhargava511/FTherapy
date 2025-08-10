import { NextRequest, NextResponse } from 'next/server';
import { setSessionData, getSessionData } from '@/lib/session-storage';

// Note: Using shared sessionStorage from session-storage.ts
// This ensures data persists across server instances in development
// For Vercel deployment: Update session-storage.ts to use Vercel KV or Redis

export async function POST(request: NextRequest) {
  try {
    const { conversationId, therapistId } = await request.json();
    
    if (!conversationId || !therapistId) {
      return NextResponse.json(
        { error: 'conversationId and therapistId are required' },
        { status: 400 }
      );
    }

    // Store session info in persistent storage that works across server instances
    const sessionInfo = {
      frontendSessionId: conversationId,
      therapistId: therapistId,
      registeredAt: new Date().toISOString()
    };
    
    // Store by conversation ID for direct lookup (await the async operation)
    await setSessionData(`registry_${conversationId}`, sessionInfo);
    
    // Also store as "latest" for webhook lookup (since webhook doesn't know conversation ID)
    await setSessionData('registry_latest', sessionInfo);

    console.log('🔗 Session registered successfully:', {
      conversationId,
      therapistId,
      timestamp: new Date().toISOString(),
      sessionInfo
    });
    
    // Immediately verify it was stored (await the async verification)
    const verification = await getSessionData('registry_latest');
    console.log('✅ Session storage verification:', verification);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error registering session:', error);
    return NextResponse.json(
      { error: 'Failed to register session' },
      { status: 500 }
    );
  }
}

