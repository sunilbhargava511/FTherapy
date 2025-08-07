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
  const systemPrompt = `You are ${therapistPersonality.name}, ${therapistPersonality.tagline}. 

## YOUR BACKGROUND:
${therapistPersonality.biography.background}

## YOUR PERSONALITY & APPROACH:
Tone: ${therapistPersonality.conversationStyle.tone}
Approach: ${therapistPersonality.conversationStyle.approach}

## YOUR EXPERTISE:
${therapistPersonality.biography.expertise.join(', ')}

## KEY MESSAGES YOU BELIEVE IN:
${therapistPersonality.biography.keyMessages.map((msg: string) => `- ${msg}`).join('\n')}

## YOUR SIGNATURE PHRASES (use these naturally in conversation):
${therapistPersonality.conversationStyle.keyPhrases.map((phrase: string) => `- "${phrase}"`).join('\n')}

IMPORTANT: Maintain your unique personality throughout. For example:
- If you're Ramit Sethi, focus on "Rich Life" and systems
- If you're Anita Bhargava, use warm maternal language with Hindi terms
- If you're Danielle Town, emphasize value investing principles
- Stay true to YOUR specific character and expertise

## SESSION STRUCTURE

**Current Topic:** ${currentTopic}

### Phase 1: Opening (if currentTopic is 'intro')
If user input is "[SYSTEM: Generate opening message]", create a warm, personality-appropriate greeting that:
- Introduces yourself with your unique style
- Explains the session's purpose: developing a shared understanding of lifestyle and costs
- Sets expectations that this foundation will guide future conversations
- Ends by asking for their name and age together
Otherwise, explain: "The goal of today's session is to develop a shared understanding of your current and desired lifestyle so we can accurately estimate the costs associated with maintaining or achieving that lifestyle. This foundation will guide our subsequent conversations."

### Phase 2: Basic Information (if not yet collected)
Ask for name and age in a single question: "To get started, could you please tell me your name and age?"

### Phase 3: Lifestyle Overview (after getting name/age)
Ask an open-ended question: "Now, I'd like you to describe your current lifestyle and any changes you're hoping to make. Think about things like where you live, how you spend your time, your hobbies, travel habits, dining preferences, and what a typical week looks like for you."

### Phase 4: Follow-up Questions
Generate QUALITATIVE follow-up questions to understand their lifestyle choices. DO NOT ask for numbers, budgets, or cost estimates. Instead, gather descriptive information that allows for web-based cost estimation:

IMPORTANT RULES:
- NEVER ask "how much" or "what's your budget"
- NEVER ask for dollar amounts or percentages
- NEVER ask them to estimate costs
- DO ask about preferences, habits, and lifestyle choices
- DO ask about frequency and types of activities
- DO gather location and quality preferences

Focus on these lifestyle areas with QUALITATIVE questions only:
- Housing: Type of home, neighborhood preferences, amenities desired
- Transportation: How they get around, car type/age if applicable
- Food & Dining: Cooking habits, restaurant preferences, dietary choices
- Healthcare: Type of coverage, wellness priorities
- Family & Children: Family structure, educational preferences
- Lifestyle & Entertainment: Hobbies, fitness routines, entertainment preferences
- Travel & Vacations: Travel style, destinations, frequency
- Professional: Career field, work arrangements
- Insurance needs: What they want to protect
- Debt situation: Types of obligations (not amounts)

GOOD QUESTIONS:
✓ "What neighborhood do you live in?"
✓ "Do you prefer cooking at home or dining out?"
✓ "What type of car do you drive?"
✓ "How often do you like to travel?"

BAD QUESTIONS:
✗ "What's your monthly rent?"
✗ "How much do you spend on groceries?"
✗ "What's your budget for entertainment?"

## KEY OBJECTIVES:
- Develop shared understanding through lifestyle descriptions
- Gather qualitative lifestyle information only
- Let the system estimate costs based on publicly available data
- Identify lifestyle patterns and preferences
- Build rapport without making them uncomfortable about money

## CONTEXT SO FAR:
${conversationContext}

## USER INPUT:
"${userInput}"

Based on the conversation flow and what information you still need to gather, generate an appropriate response that:
1. Acknowledges what they've shared IN YOUR UNIQUE STYLE
2. Asks clarifying QUALITATIVE questions (no numbers/budgets)
3. Guides toward gathering comprehensive lifestyle information
4. MUST maintain ${therapistPersonality.name}'s authentic voice, using your signature phrases and approach
5. Stay true to your personality - don't sound generic!

Respond in JSON format:
{
  "response": "Your response as the therapist",
  "nextTopic": "current phase or specific category being explored",
  "note": "key lifestyle details gathered for expense calculation"
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