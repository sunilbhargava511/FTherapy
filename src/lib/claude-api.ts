import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface ClaudeResponse {
  content: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

export async function callClaude(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  systemPrompt?: string,
  maxTokens: number = 1000
): Promise<ClaudeResponse> {
  try {
    const response = await anthropic.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: messages,
    });

    const content = response.content[0];
    if (content.type === 'text') {
      return {
        content: content.text,
        usage: {
          input_tokens: response.usage.input_tokens,
          output_tokens: response.usage.output_tokens,
        },
      };
    }

    throw new Error('Unexpected response format from Claude API');
  } catch (error) {
    console.error('Claude API Error:', error);
    throw new Error(`Claude API call failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function cleanupTextWithClaude(rawText: string): Promise<string> {
  const systemPrompt = `You are a text cleanup assistant. Your job is to reorganize and reword stream of consciousness capture of thoughts into clear, coherent responses.

Rules:
1. Remove filler words (um, uh, like, you know, etc.)
2. Fix repetitions and redundancies
3. Maintain the original meaning and intent
4. Keep the response natural and conversational
5. Ensure proper grammar and punctuation
6. Keep it concise but complete
7. If the input is already clean, make minimal changes

Return only the cleaned text, nothing else.`;

  try {
    const response = await callClaude(
      [{ role: 'user', content: rawText }],
      systemPrompt,
      500
    );
    
    return response.content.trim();
  } catch (error) {
    console.error('Error cleaning text with Claude:', error);
    // Fallback to original text if Claude fails
    return rawText;
  }
}

export async function generateTherapistResponse(
  therapistPersonality: any,
  userInput: string,
  conversationContext: string,
  currentTopic: string
): Promise<{ response: string; nextTopic: string; note: string }> {
  const systemPrompt = `You are ${therapistPersonality.name}, a financial therapy coach. 

PERSONALITY & APPROACH:
${therapistPersonality.conversationStyle.tone}
${therapistPersonality.conversationStyle.approach}

EXPERTISE:
${therapistPersonality.biography.expertise.join(', ')}

KEY MESSAGES:
${therapistPersonality.biography.keyMessages.join('\n')}

CURRENT CONVERSATION TOPIC: ${currentTopic}

CONVERSATION FLOW:
intro → name → age → interests → housing_location → housing_preference → food_preference → transport_preference → fitness_preference → entertainment_preference → subscriptions_preference → travel_preference → summary

Your job is to:
1. Respond authentically as ${therapistPersonality.name}
2. Guide the conversation naturally to the next topic
3. Ask one clear question to move forward
4. Stay true to your personality and communication style
5. Be encouraging and supportive

CONTEXT: ${conversationContext}

Respond in JSON format:
{
  "response": "Your response as the therapist",
  "nextTopic": "the next conversation topic",
  "note": "brief note for session tracking"
}`;

  try {
    const response = await callClaude(
      [{ role: 'user', content: `User said: "${userInput}"` }],
      systemPrompt,
      800
    );
    
    // Parse the JSON response
    const parsed = JSON.parse(response.content);
    return {
      response: parsed.response,
      nextTopic: parsed.nextTopic,
      note: parsed.note
    };
  } catch (error) {
    console.error('Error generating therapist response:', error);
    
    // Fallback to a generic response
    return {
      response: "Thank you for sharing that. Could you tell me more about that?",
      nextTopic: currentTopic,
      note: "Fallback response used due to API error"
    };
  }
}