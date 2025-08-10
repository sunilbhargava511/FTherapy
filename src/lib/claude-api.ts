import Anthropic from '@anthropic-ai/sdk';
import { TherapistPersonality, UserProfile, ConversationMessage } from '@/lib/types';

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
  therapistPersonality: TherapistPersonality,
  userInput: string,
  conversationContext: string,
  currentTopic: string
): Promise<{ response: string; nextTopic: string; note: string; profileUpdate?: Partial<UserProfile> }> {
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
- If you're Anita Bhargava, use warm professional language with strategic financial focus (do NOT use "namaste" or Hindi greetings)
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
Ask a focused open-ended question with MAXIMUM 3 areas: "Now, I'd like you to describe your current lifestyle and any changes you're hoping to make. Let's start with three key areas: where you live, how you spend your free time, and your daily routine."

### Phase 4: Follow-up Questions
Generate QUALITATIVE follow-up questions to understand their lifestyle choices. DO NOT ask for numbers, budgets, or cost estimates. Instead, gather descriptive information that allows for web-based cost estimation:

IMPORTANT RULES:
- NEVER ask "how much" or "what's your budget"
- NEVER ask for dollar amounts or percentages
- NEVER ask them to estimate costs
- DO ask about preferences, habits, and lifestyle choices
- DO ask about frequency and types of activities
- DO gather location and quality preferences
- LIMIT TO MAXIMUM 3 QUESTIONS OR TOPICS per response to avoid overwhelming the user
- Keep questions focused and specific rather than broad or complex

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

## PROGRESS TRACKING:
Based on the progress data in the context, you can see which lifestyle areas have been completed (✓) and which still need attention (○). Use this information to:
- Guide the conversation toward incomplete areas
- Acknowledge completed areas briefly  
- Suggest moving to the next uncovered topic when appropriate
- Consider suggesting report generation when most/all areas are complete (6+ out of 8 completed)

Current progress from context: Look for the "progress" field in the conversation context above to see completion status of basics, housing, food, transport, fitness, entertainment, subscriptions, and travel.

## USER INPUT:
"${userInput}"

Based on the conversation flow and what information you still need to gather, generate an appropriate response that:
1. Acknowledges what they've shared IN YOUR UNIQUE STYLE
2. Asks clarifying QUALITATIVE questions (no numbers/budgets)
3. Guides toward gathering comprehensive lifestyle information
4. MUST maintain ${therapistPersonality.name}'s authentic voice, using your signature phrases and approach
5. Stay true to your personality - don't sound generic!

You MUST respond with ONLY a valid JSON object (no markdown, no extra text) in this exact format:
{
  "response": "Your response as the therapist",
  "nextTopic": "current phase or specific category being explored", 
  "note": "key lifestyle details gathered for expense calculation",
  "profileUpdate": {
    "name": "client's name if mentioned, null otherwise",
    "age": "client's age if mentioned, null otherwise", 
    "location": "client's location if mentioned, null otherwise",
    "lifestyle": {
      "housing": { "preference": "housing preference if discussed", "details": "housing details if discussed" },
      "food": { "preference": "food preference if discussed", "details": "food details if discussed" },
      "transport": { "preference": "transport preference if discussed", "details": "transport details if discussed" },
      "fitness": { "preference": "fitness preference if discussed", "details": "fitness details if discussed" },
      "entertainment": { "preference": "entertainment preference if discussed", "details": "entertainment details if discussed" },
      "subscriptions": { "preference": "subscriptions preference if discussed", "details": "subscriptions details if discussed" },
      "travel": { "preference": "travel preference if discussed", "details": "travel details if discussed" }
    }
  }
}

IMPORTANT: Only include profileUpdate fields that were actually mentioned or discussed in this conversation turn. Leave fields as null or empty strings if not discussed. The profileUpdate will be merged with existing data.

CRITICAL: Return ONLY the JSON object, nothing else. No markdown code blocks, no explanations.`;

  try {
    const response = await callClaude(
      [{ role: 'user', content: `User said: "${userInput}"` }],
      systemPrompt,
      800
    );
    
    // Parse the JSON response
    try {
      const parsed = JSON.parse(response.content);
      return {
        response: parsed.response,
        nextTopic: parsed.nextTopic,
        note: parsed.note,
        profileUpdate: parsed.profileUpdate
      };
    } catch (parseError) {
      // If parsing fails, return a simple response
      return {
        response: response.content,
        nextTopic: currentTopic,
        note: "Direct response without JSON structure",
        profileUpdate: undefined
      };
    }
  } catch (error) {
    console.error('Error generating therapist response:', error);
    
    // Fallback to a generic response
    return {
      response: "Thank you for sharing that. Could you tell me more about that?",
      nextTopic: currentTopic,
      note: "Fallback response used due to API error",
      profileUpdate: undefined
    };
  }
}

export async function generateTherapistReport(
  messages: ConversationMessage[],
  context: { therapistName: string; [key: string]: unknown },
  reportType: 'qualitative' | 'quantitative'
): Promise<string> {
  const systemPrompt = `You are ${context.therapistName}, a financial therapist generating a ${reportType} report for a client session.

## SESSION CONTEXT:
- Therapist: ${context.therapistName}
- Style: ${context.therapistStyle}
- Session Duration: ${context.sessionDuration} minutes
- Messages Exchanged: ${context.conversationLength}

## CLIENT PROFILE:
${JSON.stringify(context.userProfile, null, 2)}

## FINANCIAL DATA:
${JSON.stringify(context.financialData, null, 2)}

## CONVERSATION SUMMARY:
${messages.map(m => `${m.speaker}: ${m.text}`).join('\n')}

Generate a comprehensive ${reportType} report that includes:

${reportType === 'qualitative' ? `
**Summary**: 2-3 sentence overview of the session and key findings

**Key Insights**: 4-6 bullet points about the client's financial mindset, behaviors, and situation
- Focus on psychological aspects, patterns, and attitudes toward money
- Identify strengths and challenges
- Note emotional responses to financial topics

**Recommendations**: 3-5 specific, actionable recommendations in ${context.therapistName}'s voice
- Use ${context.therapistName}'s signature approach and language
- Make recommendations specific to the client's situation
- Include both immediate actions and longer-term strategies

**Action Items**: 3-5 specific next steps the client should take
- Make them concrete and measurable
- Prioritize by importance and feasibility
- Include timeframes where appropriate
` : `
**Monthly Budget Analysis**:
- Income: $${(context as any).financialData?.income?.monthly || 0}
- Expenses breakdown by category
- Surplus/deficit calculation
- Savings rate percentage

**Savings Opportunities**:
- Identify 3-4 areas where spending could be optimized
- Calculate potential monthly savings for each
- Provide specific suggestions for each category

**Financial Projections**:
- 3-month savings goal
- 6-month financial position  
- 1-year wealth building projection
`}

Format the response as clear, well-structured text with appropriate headings and bullet points.
Keep the tone consistent with ${context.therapistName}'s personality.`;

  try {
    const response = await callClaude(
      [{ role: 'user', content: 'Generate the report based on the provided context.' }],
      systemPrompt,
      1500
    );
    
    return response.content;
  } catch (error) {
    console.error('Error generating therapist report:', error);
    throw new Error(`Failed to generate ${reportType} report`);
  }
}