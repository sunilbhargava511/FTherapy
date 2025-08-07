import { NextRequest, NextResponse } from 'next/server';
import { generateTherapistResponse } from '@/lib/claude-api';
import { getTherapist } from '@/lib/therapist-loader';

export async function POST(request: NextRequest) {
  let currentTopic = 'intro'; // Default value
  
  try {
    const body = await request.json();
    const { 
      therapistId, 
      userInput, 
      conversationContext
    } = body;
    currentTopic = body.currentTopic || 'intro';
    
    if (!therapistId || !userInput || !currentTopic) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get therapist personality
    const therapist = getTherapist(therapistId);
    
    // Check if Claude API is configured
    if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your_api_key_here') {
      console.error('[API_KEY_MISSING]', new Date().toISOString(), {
        therapistId,
        currentTopic
      });
      return NextResponse.json(
        { 
          error: 'Claude API key not configured',
          failureType: 'API_KEY_MISSING',
          timestamp: new Date().toISOString()
        },
        { status: 503 }
      );
    }

    // Generate dynamic response using Claude
    const result = await generateTherapistResponse(
      therapist,
      userInput,
      conversationContext || '',
      currentTopic
    );
    
    return NextResponse.json({
      ...result,
      source: "claude"
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const failureType = errorMessage.includes('rate limit') ? 'RATE_LIMIT' : 
                       errorMessage.includes('timeout') ? 'TIMEOUT' :
                       errorMessage.includes('network') ? 'NETWORK_ERROR' : 
                       'API_ERROR';
    
    console.error('[API_FAILURE]', new Date().toISOString(), {
      therapistId: 'unknown',
      currentTopic,
      errorMessage,
      failureType,
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to generate therapist response',
        failureType,
        errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    );
  }
}