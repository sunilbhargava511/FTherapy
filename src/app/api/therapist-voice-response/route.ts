import { NextRequest, NextResponse } from 'next/server';
import { getTherapist } from '@/lib/therapist-loader';
import { generateTherapistResponse } from '@/lib/claude-api';
import type { VoiceControlSettings } from '@/lib/types';

export async function POST(request: NextRequest) {
  let currentTopic = 'intro'; // Default value
  let therapistId = 'unknown';
  
  try {
    const body = await request.json();
    therapistId = body.therapistId;
    const { 
      userInput, 
      conversationContext,
      voiceSettings 
    } = body;
    currentTopic = body.currentTopic || 'intro';

    const therapist = getTherapist(therapistId);
    
    // Check if Claude API is configured
    if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your_api_key_here') {
      console.error('[API_KEY_MISSING_VOICE]', new Date().toISOString(), {
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
    
    // Use the existing generateTherapistResponse function which has the proper prompt
    const result = await generateTherapistResponse(
      therapist,
      userInput,
      conversationContext || '',
      currentTopic
    );
    
    // TODO: In the future, we can modify the response based on voiceSettings
    // For now, just return the standard response
    
    return NextResponse.json({
      ...result,
      source: "claude_voice"
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const failureType = errorMessage.includes('rate limit') ? 'RATE_LIMIT' : 
                       errorMessage.includes('timeout') ? 'TIMEOUT' :
                       errorMessage.includes('network') ? 'NETWORK_ERROR' : 
                       'API_ERROR';
    
    console.error('[API_FAILURE_VOICE]', new Date().toISOString(), {
      therapistId,
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

function buildStyleModifiers(settings: VoiceControlSettings): string {
  const modifiers = [];
  
  // Response Length
  const lengthMap = {
    1: "Keep responses to 1-2 sentences maximum. Be extremely concise.",
    2: "Keep responses brief - 2-3 sentences. Be concise but complete.",
    3: "Use standard response length - 3-5 sentences with balanced detail.",
    4: "Provide detailed responses - 5-7 sentences with examples and context.",
    5: "Give very detailed responses - 7+ sentences with comprehensive explanations, examples, and context."
  };
  modifiers.push(lengthMap[settings.responseLength as keyof typeof lengthMap]);
  
  // Engagement Style
  const engagementMap = {
    1: "Use mostly humor - include light jokes, puns, and playful language.",
    2: "Use more humor than stories - frequent humor with some anecdotes.", 
    3: "Balance humor and stories equally - mix jokes with brief examples.",
    4: "Use more stories than humor - emphasize narratives and examples over jokes.",
    5: "Use mostly stories - focus on rich storytelling, detailed anecdotes, and case studies."
  };
  modifiers.push(engagementMap[settings.engagement as keyof typeof engagementMap]);
  
  // Conversation Style
  const styleMap = {
    1: "Always end with questions. Use Socratic method - guide discovery through questioning.",
    2: "Mostly ask questions with some explanations. Be question-driven.",
    3: "Balance questions and statements. Use interactive Q&A approach.",
    4: "Mostly provide information with occasional questions. Be informative.",
    5: "Focus on telling/explaining. Provide direct information delivery, lecture-style."
  };
  modifiers.push(styleMap[settings.style as keyof typeof styleMap]);
  
  return modifiers.join('\n');
}

function determineNextTopic(currentTopic: string, userInput: string): string {
  const topicFlow = [
    'intro', 'name', 'age', 'interests', 'housing_location', 'housing_preference',
    'food_preference', 'transport_preference', 'fitness_preference', 
    'entertainment_preference', 'subscriptions_preference', 'travel_preference', 'summary'
  ];
  
  const currentIndex = topicFlow.indexOf(currentTopic);
  if (currentIndex >= 0 && currentIndex < topicFlow.length - 1) {
    return topicFlow[currentIndex + 1];
  }
  
  return currentTopic;
}