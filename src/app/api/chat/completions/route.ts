import { NextRequest } from 'next/server';
import { getTherapist } from '@/lib/therapist-loader';
import { generateTherapistResponse } from '@/lib/claude-api';
import { addSessionUserMessage, resolveSessionId } from '@/lib/session-storage';

// OpenAI-compatible STREAMING endpoint for ElevenLabs
export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  
  // Create a streaming response
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const body = await request.json();
        
        // Log essential webhook info for debugging (including OpenAI standard fields)
        console.log('📞 Chat completions webhook called:', {
          messages: body.messages?.length || 0,
          hasUser: !!body.user,
          hasSafetyId: !!body.safety_identifier, 
          hasCacheKey: !!body.prompt_cache_key,
          hasSessionId: !!body.session_id,
          hasConversationId: !!body.conversation_id,
          user: body.user,
          safety_identifier: body.safety_identifier,
          prompt_cache_key: body.prompt_cache_key
        });
        
        // Check if streaming is requested (ElevenLabs should send stream: true)
        const isStreaming = body.stream !== false;
        
        // Get the last user message
        const messages = body.messages || [];
        const lastMessage = messages[messages.length - 1];
        
        // Default response
        let responseContent = "Hello! I'm here to help you with your financial journey. What's on your mind today?";
        
        if (lastMessage && lastMessage.role === 'user') {
          const userInput = lastMessage.content;
          
          // Use session registry to get the correct session ID and therapist - NO FALLBACKS
          const sessionInfo = await resolveSessionId();
          
          if (!sessionInfo) {
            console.error('❌ No registered session found - cannot determine therapist');
            // Return error instead of using fallback therapist
            const errorChunk = {
              id: `chatcmpl-${Date.now()}`,
              object: 'chat.completion.chunk',
              created: Math.floor(Date.now() / 1000),
              model: body.model || 'gpt-3.5-turbo',
              choices: [{
                index: 0,
                delta: {
                  role: 'assistant',
                  content: "I apologize, but I'm having trouble connecting to your selected therapist. Please try starting a new conversation."
                },
                finish_reason: 'stop'
              }]
            };
            
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorChunk)}\n\n`));
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            return; // Exit early - don't continue with wrong therapist
          }
          
          const sessionId = sessionInfo.sessionId;
          const therapistId = sessionInfo.therapistId;
          console.log('🎯 Using registered session:', { sessionId, therapistId });
          
          // Store user message for notebook system
          console.log('💾 Storing user message for session:', sessionId, 'Message:', userInput.substring(0, 50) + '...');
          addSessionUserMessage(sessionId, userInput);
          
          // Get therapist and generate response using Claude
          try {
            const therapist = getTherapist(therapistId);
            
            if (therapist) {
              // Build conversation context from messages
              const conversationContext = messages
                .filter((msg: any) => msg.role !== 'system')
                .map((msg: any) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
                .join('\n');
              
              // Generate response with Claude
              const response = await generateTherapistResponse(
                therapist,
                userInput,
                conversationContext,
                'conversation'
              );
              
              responseContent = response.response;
              console.log('Claude generated response:', responseContent);
            }
          } catch (error) {
            console.error('Error generating Claude response:', error);
            // Use fallback response if Claude fails
            if (userInput.toLowerCase().includes('hello') || userInput.toLowerCase().includes('hi')) {
              responseContent = "Hello there! I'm here to help you with your financial journey. What's your name?";
            } else {
              responseContent = "I understand. Could you tell me more about your financial goals and what brought you here today?";
            }
          }
        }
        
        console.log('Streaming response:', responseContent);
        
        if (isStreaming) {
          // Analyze sentiment/context for voice modulation
          let voiceSettings = {
            stability: 0.5,
            similarity_boost: 0.75
          };
          
          // Adjust voice based on response content
          if (responseContent.includes('!') || responseContent.includes('excited') || responseContent.includes('great')) {
            // More energetic
            voiceSettings.stability = 0.3;
            voiceSettings.similarity_boost = 0.8;
          } else if (responseContent.includes('?') || responseContent.includes('concern')) {
            // More thoughtful/gentle
            voiceSettings.stability = 0.7;
            voiceSettings.similarity_boost = 0.6;
          }
          
          // Send initial buffer chunk with voice settings
          const initialChunk = {
            id: `chatcmpl-${Date.now()}`,
            object: 'chat.completion.chunk',
            created: Math.floor(Date.now() / 1000),
            model: body.model || 'gpt-3.5-turbo',
            choices: [{
              index: 0,
              delta: {
                role: 'assistant',
                content: '',
                voice_settings: voiceSettings  // Pass voice modulation
              },
              finish_reason: null
            }]
          };
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(initialChunk)}\n\n`));
          
          // Split response into words for streaming
          const words = responseContent.split(' ');
          
          // Stream each word
          for (let i = 0; i < words.length; i++) {
            const word = words[i] + (i < words.length - 1 ? ' ' : '');
            const chunk = {
              id: `chatcmpl-${Date.now()}`,
              object: 'chat.completion.chunk',
              created: Math.floor(Date.now() / 1000),
              model: body.model || 'gpt-3.5-turbo',
              choices: [{
                index: 0,
                delta: {
                  content: word
                },
                finish_reason: null
              }]
            };
            
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
            
            // Small delay between words for more natural streaming
            await new Promise(resolve => setTimeout(resolve, 30));
          }
          
          // Send final chunk with finish_reason
          const finalChunk = {
            id: `chatcmpl-${Date.now()}`,
            object: 'chat.completion.chunk',
            created: Math.floor(Date.now() / 1000),
            model: body.model || 'gpt-3.5-turbo',
            choices: [{
              index: 0,
              delta: {},
              finish_reason: 'stop'
            }]
          };
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(finalChunk)}\n\n`));
          
          // Send [DONE] signal
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          
        } else {
          // Non-streaming response (fallback)
          const response = {
            id: `chatcmpl-${Date.now()}`,
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model: body.model || 'gpt-3.5-turbo',
            choices: [{
              index: 0,
              message: {
                role: 'assistant',
                content: responseContent
              },
              logprobs: null,
              finish_reason: 'stop'
            }],
            usage: {
              prompt_tokens: 50,
              completion_tokens: 50,
              total_tokens: 100
            },
            system_fingerprint: null
          };
          
          controller.enqueue(encoder.encode(JSON.stringify(response)));
        }
        
      } catch (error) {
        console.error('Streaming error:', error);
        
        // Send error in OpenAI format
        const errorResponse = {
          error: {
            message: 'Internal server error',
            type: 'internal_error',
            code: 'internal_error'
          }
        };
        
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorResponse)}\n\n`));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } finally {
        controller.close();
      }
    }
  });
  
  // Return streaming response with proper headers
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}