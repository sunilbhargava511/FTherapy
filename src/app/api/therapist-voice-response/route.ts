import { NextRequest, NextResponse } from 'next/server';
import { getTherapist } from '@/lib/therapist-loader';
import type { VoiceControlSettings } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { 
      therapistId, 
      userInput, 
      conversationContext, 
      currentTopic,
      voiceSettings 
    } = await request.json();

    const therapist = getTherapist(therapistId);
    
    // Build style modifiers based on voice control settings
    const styleModifiers = buildStyleModifiers(voiceSettings);
    
    const systemPrompt = `You are ${therapist.name}, a financial therapy coach. 
    
Background: ${therapist.biography.background}

Your conversation style: ${therapist.conversationStyle.tone} and ${therapist.conversationStyle.approach}

Key phrases you use: ${therapist.conversationStyle.keyPhrases.join(', ')}

IMPORTANT STYLE MODIFIERS:
${styleModifiers}

Current conversation context:
${conversationContext}

Current topic: ${currentTopic}

The user just said: "${userInput}"

Respond as ${therapist.name} would, following the style modifiers above. Keep the response natural and conversational while maintaining your coaching expertise.

Your response should be just the text you would say - no meta commentary.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 300,
        messages: [
          {
            role: 'user',
            content: systemPrompt
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error('Claude API request failed');
    }

    const result = await response.json();
    const therapistResponse = result.content[0].text;
    
    // Determine next topic based on response
    const nextTopic = determineNextTopic(currentTopic, userInput);
    
    return NextResponse.json({
      response: therapistResponse,
      nextTopic: nextTopic
    });
    
  } catch (error) {
    console.error('Voice response API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 }
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