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
      // Fallback to original static responses
      return NextResponse.json({
        response: "I appreciate you sharing that with me. Could you tell me a bit more?",
        nextTopic: currentTopic,
        note: "Fallback response - API not configured",
        source: "fallback"
      });
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
    console.error('Error generating therapist response:', error);
    
    // Fallback response
    return NextResponse.json({
      response: "Thank you for sharing. I'd love to hear more about that.",
      nextTopic: currentTopic,
      note: "Error fallback response",
      source: "error_fallback"
    });
  }
}