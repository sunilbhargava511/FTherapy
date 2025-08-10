import { NextRequest, NextResponse } from 'next/server';
import { getTherapist } from '@/lib/therapist-loader';
import { generateTherapistResponse } from '@/lib/claude-api';
import { 
  addSessionUserMessage, 
  getSessionUserMessages, 
  getSessionData, 
  setSessionData,
  getSessionReport,
  setSessionReport,
  resolveSessionId
} from '@/lib/session-storage';

interface ElevenLabsWebhookRequest {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  agent_id?: string;
  session_id?: string;
  conversation_id?: string;
  therapist_id?: string;
  extra_body?: {
    therapist_id?: string;
    [key: string]: any;
  };
  // OpenAI API standard fields
  user?: string;
  safety_identifier?: string;
  prompt_cache_key?: string;
  variables?: {
    therapist_id?: string;
    current_topic?: string;
    report_generated?: boolean;
    agent_id?: string;
    session_id?: string;
    conversation_id?: string;
    [key: string]: any;
  };
  metadata?: {
    session_id?: string;
    conversation_id?: string;
    therapist_id?: string;
    [key: string]: any;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: ElevenLabsWebhookRequest = await request.json();
    console.log('🎤 ElevenLabs webhook received:', {
      messageCount: body.messages.length,
      hasUser: !!body.user,
      hasSafetyId: !!body.safety_identifier,
      hasCacheKey: !!body.prompt_cache_key,
      hasSessionId: !!body.session_id,
      hasConversationId: !!body.conversation_id,
      user: body.user,
      safety_identifier: body.safety_identifier,
      prompt_cache_key: body.prompt_cache_key,
      hasVariables: !!body.variables,
      hasMetadata: !!body.metadata
    });

    const {
      messages,
      variables = {}
    } = body;

    // Use session registry to get the correct session ID and therapist - NO FALLBACKS
    console.log('🔍 Looking for registered session...');
    const sessionInfo = await resolveSessionId();
    
    if (!sessionInfo) {
      console.error('❌ No registered session found - cannot determine therapist (webhook)');
      console.log('🔍 Available session data:', {
        hasVariables: !!body.variables,
        variables: body.variables,
        hasMetadata: !!body.metadata,
        metadata: body.metadata,
        conversationId: body.conversation_id,
        sessionId: body.session_id
      });
      
      return NextResponse.json({
        content: "I apologize, but I'm having trouble connecting to your selected therapist. Please try refreshing the page and starting a new conversation.",
        variables
      });
    }
    
    const session_id = sessionInfo.sessionId;
    const therapistId = sessionInfo.therapistId;
    console.log('🎯 Using registered session (webhook):', { session_id, therapistId });

    // Get the latest user message
    const userMessage = messages[messages.length - 1];
    if (!userMessage || userMessage.role !== 'user') {
      return NextResponse.json({
        content: "I didn't catch that. Could you please repeat?",
        variables
      });
    }

    const userInput = userMessage.content;
    const currentTopic = variables.current_topic || 'intro';

    // Store user message for client-side profile building (await async operation)
    console.log('🗄️ Storing user message for session:', session_id, 'Message:', userInput.substring(0, 50) + '...');
    await addSessionUserMessage(session_id, userInput);
    
    // Immediately verify the message was stored
    const storedMessages = await getSessionUserMessages(session_id);
    console.log('✅ Verification - Total messages stored for session:', session_id, 'Count:', storedMessages.length);
    console.log('✅ Latest stored message:', storedMessages[storedMessages.length - 1]?.message?.substring(0, 50) + '...');

    // Get therapist data
    const therapist = getTherapist(therapistId);
    if (!therapist) {
      return NextResponse.json({
        content: "I'm having trouble accessing my configuration. Let me try again.",
        variables
      });
    }

    // Store session data for later retrieval (await async operation)
    await setSessionData(session_id, {
      therapistId,
      messages,
      variables,
      lastUpdated: new Date().toISOString()
    });

    // Determine next topic based on conversation flow
    const nextTopic = determineNextTopic(currentTopic, userInput, messages);
    console.log(`Topic progression: ${currentTopic} → ${nextTopic}`);

    // Check if we've reached the summary stage
    if (nextTopic === 'summary' && currentTopic !== 'summary') {
      console.log('Triggering report generation for session:', session_id);
      
      try {
        // Generate the full report (we'll implement this next)
        const report = await generateFinancialReport({
          therapistId,
          messages
        });
        
        // Store report for client retrieval (await async operation)
        await setSessionReport(session_id, report);
        
        // Generate verbal summary
        const verbalSummary = generateVerbalSummary(report, therapist);
        
        // Update variables
        const updatedVariables = {
          ...variables,
          current_topic: 'summary',
          report_generated: true,
          report_id: report.id
        };

        return NextResponse.json({
          content: verbalSummary,
          variables: updatedVariables
        });
      } catch (error) {
        console.error('Report generation failed:', error);
        
        // Instead of generating a report, acknowledge the attempt and continue the conversation
        const fallbackResponse = `I'd like to create a comprehensive financial analysis for you, but I need a bit more information about your lifestyle and spending preferences first. Let's continue our conversation - could you tell me more about your housing situation and daily spending habits?`;
        
        return NextResponse.json({
          content: fallbackResponse,
          variables: {
            ...variables,
            current_topic: 'housing_preference' // Go back to collecting more data
          }
        });
      }
    }

    // If already in summary, handle Q&A about the report
    if (currentTopic === 'summary' && variables.report_generated) {
      console.log('Handling report Q&A for session:', session_id);
      
      const reportData = await getSessionReport(session_id);
      
      const response = await generateTherapistResponse(
        therapist,
        userInput,
        buildConversationContext(messages),
        'report_discussion'
      );

      return NextResponse.json({
        content: response.response,
        variables: {
          ...variables,
          current_topic: 'summary'
        }
      });
    }

    // Normal conversation flow
    const response = await generateTherapistResponse(
      therapist,
      userInput,
      buildConversationContext(messages),
      currentTopic
    );

    return NextResponse.json({
      content: response.response,
      variables: {
        ...variables,
        current_topic: nextTopic
      }
    });

  } catch (error) {
    console.error('ElevenLabs webhook error:', error);
    return NextResponse.json({
      content: "I apologize, but I'm having a technical difficulty. Could you please try again?",
      variables: {}
    }, { status: 500 });
  }
}

function determineNextTopic(currentTopic: string, userInput: string, messages: any[]): string {
  const topics = [
    'intro', 'name', 'age', 'interests',
    'housing_location', 'housing_preference',
    'food_preference', 'transport_preference',
    'fitness_preference', 'entertainment_preference',
    'subscriptions_preference', 'travel_preference',
    'summary'
  ];

  console.log('🔄 Topic progression check:', { currentTopic, userInputLength: userInput.trim().length });

  // Only progress if user provides a substantive answer (>10 chars)
  if (userInput.trim().length > 10) {
    const currentIndex = topics.indexOf(currentTopic);
    
    // Special handling: Don't automatically jump to summary
    // Only go to summary if we're already past travel_preference AND have collected enough data
    if (currentTopic === 'travel_preference') {
      // Check if we have enough lifestyle data from the conversation
      const lifestyleTopics = ['housing_preference', 'food_preference', 'transport_preference', 
                              'fitness_preference', 'entertainment_preference', 'subscriptions_preference', 
                              'travel_preference'];
      
      // Count how many lifestyle topics have been addressed in the messages
      const lifestyleDataCount = lifestyleTopics.filter(topic => 
        messages.some(msg => msg.content && msg.content.length > 20) // Has substantial content
      ).length;
      
      console.log('🔍 Lifestyle data assessment:', { 
        lifestyleDataCount, 
        required: 6, 
        shouldGenerateReport: lifestyleDataCount >= 6 
      });
      
      if (lifestyleDataCount >= 6) {
        console.log('✅ Sufficient lifestyle data collected, moving to summary');
        return 'summary';
      } else {
        console.log('⚠️ Insufficient lifestyle data, staying at travel_preference');
        return 'travel_preference'; // Stay here until more data is collected
      }
    }
    
    // Normal progression for other topics
    if (currentIndex >= 0 && currentIndex < topics.length - 1) {
      const nextTopic = topics[currentIndex + 1];
      console.log('➡️ Normal topic progression:', currentTopic, '→', nextTopic);
      return nextTopic;
    }
  }

  console.log('⏸️ Staying at current topic:', currentTopic);
  return currentTopic;
}

function buildConversationContext(messages: any[]): string {
  // Convert ElevenLabs message format to conversation context
  return messages
    .filter(msg => msg.role !== 'system')
    .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
    .join('\n');
}

async function generateFinancialReport(params: { therapistId: string; messages: any[] }) {
  try {
    // Use your existing report generation API
    const reportResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/generate-financial-report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        therapistId: params.therapistId,
        messages: params.messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      })
    });

    if (!reportResponse.ok) {
      throw new Error(`Report generation failed: ${reportResponse.status}`);
    }

    const report = await reportResponse.json();
    
    // Add metadata for session tracking
    return {
      ...report,
      id: `report_${Date.now()}`,
      timestamp: new Date().toISOString(),
      therapistId: params.therapistId
    };
  } catch (error) {
    console.error('Failed to generate financial report:', error);
    
    // Don't return a fallback report - let it fail so we don't show fake data
    throw error;
  }
}

function generateVerbalSummary(report: any, therapist: any): string {
  const { quantitative, qualitative } = report;
  
  return `I've completed your comprehensive financial analysis, which is now being displayed on your screen.

On the quantitative side, here are your key metrics: You're allocating ${quantitative.housing.percentage}% to housing, ${quantitative.food.percentage}% to food, and ${quantitative.transportation.percentage}% to transportation. ${quantitative.savings > 0 
    ? `Great news - you're saving ${quantitative.savings}% of your income!`
    : `We should work on building your savings buffer.`}

From a qualitative perspective, ${qualitative.strengthsSummary}. ${qualitative.opportunitiesSummary}.

Your complete report is now ready for review on screen. Would you like to discuss any specific aspects of your financial picture, or shall we wrap up so you can download your detailed report?`;
}

// Utility functions are now imported from @/lib/session-storage