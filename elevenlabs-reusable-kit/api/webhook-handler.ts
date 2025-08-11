/**
 * Reusable webhook handler template for ElevenLabs Conversational AI
 * Customize the response generation logic for your specific use case
 */

import { NextRequest, NextResponse } from 'next/server';
import { ElevenLabsWebhookRequest, ElevenLabsWebhookResponse } from '../types/elevenlabs';
import { SessionManager } from '../lib/session-manager';

export interface WebhookConfig {
  sessionManager: SessionManager;
  responseGenerator: ResponseGenerator;
  topicManager?: TopicManager;
  enableLogging?: boolean;
}

export interface ResponseGenerator {
  generateResponse(params: {
    userInput: string;
    conversationContext: string;
    sessionId: string;
    variables: Record<string, any>;
  }): Promise<{
    content: string;
    variables?: Record<string, any>;
  }>;
}

export interface TopicManager {
  determineNextTopic(
    currentTopic: string,
    userInput: string,
    messages: Array<{ role: string; content: string }>
  ): string;
}

export class ElevenLabsWebhookHandler {
  private config: WebhookConfig;

  constructor(config: WebhookConfig) {
    this.config = config;
  }

  async handleWebhook(request: NextRequest): Promise<NextResponse> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      if (this.config.enableLogging) {
        console.log(`[${requestId}] Webhook request started`);
      }

      const body: ElevenLabsWebhookRequest = await request.json();
      
      // Extract and validate request data
      const { messages, variables = {} } = body;
      const userMessage = messages[messages.length - 1];

      if (!userMessage || userMessage.role !== 'user') {
        return this.createResponse({
          content: "I didn't catch that. Could you please repeat?",
          variables
        }, requestId);
      }

      // Resolve session
      const sessionInfo = await this.config.sessionManager.resolveSessionWithRetry();
      if (!sessionInfo) {
        return this.createResponse({
          content: "I'm having trouble connecting. Please try refreshing the page and starting a new conversation.",
          variables
        }, requestId);
      }

      const userInput = userMessage.content;
      const sessionId = sessionInfo.sessionId;

      // Store user message
      await this.config.sessionManager.addMessage(sessionId, {
        timestamp: new Date().toISOString(),
        message: userInput,
        speaker: 'user'
      });

      // Update session activity
      await this.config.sessionManager.updateSessionActivity(sessionId);

      // Build conversation context
      const conversationContext = this.buildConversationContext(messages);

      // Generate response
      const response = await this.config.responseGenerator.generateResponse({
        userInput,
        conversationContext,
        sessionId,
        variables
      });

      // Handle topic progression if topic manager is provided
      let updatedVariables = response.variables || variables;
      if (this.config.topicManager) {
        const currentTopic = variables.current_topic || 'intro';
        const nextTopic = this.config.topicManager.determineNextTopic(
          currentTopic,
          userInput,
          messages
        );
        updatedVariables = {
          ...updatedVariables,
          current_topic: nextTopic
        };
      }

      // Store agent response
      await this.config.sessionManager.addMessage(sessionId, {
        timestamp: new Date().toISOString(),
        message: response.content,
        speaker: 'agent'
      });

      if (this.config.enableLogging) {
        const duration = Date.now() - startTime;
        console.log(`[${requestId}] Webhook completed in ${duration}ms`);
      }

      return this.createResponse({
        content: response.content,
        variables: updatedVariables
      }, requestId);

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[${requestId}] Webhook error after ${duration}ms:`, error);

      return this.createResponse({
        content: "I apologize, but I'm having a technical difficulty. Could you please try again?",
        variables: {}
      }, requestId, 500);
    }
  }

  private buildConversationContext(messages: Array<{ role: string; content: string }>): string {
    return messages
      .filter(msg => msg.role !== 'system')
      .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n');
  }

  private createResponse(
    response: ElevenLabsWebhookResponse, 
    requestId: string, 
    status: number = 200
  ): NextResponse {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (this.config.enableLogging) {
      headers['X-Request-ID'] = requestId;
    }

    return NextResponse.json(response, { status, headers });
  }

  private generateRequestId(): string {
    return `wh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Simple topic manager implementation
export class SimpleTopicManager implements TopicManager {
  private topics: string[];

  constructor(topics: string[] = ['intro', 'name', 'details', 'summary']) {
    this.topics = topics;
  }

  determineNextTopic(
    currentTopic: string,
    userInput: string,
    messages: Array<{ role: string; content: string }>
  ): string {
    // Only progress if user provides substantive answer
    if (userInput.trim().length <= 10) {
      return currentTopic;
    }

    const currentIndex = this.topics.indexOf(currentTopic);
    
    // Normal progression
    if (currentIndex >= 0 && currentIndex < this.topics.length - 1) {
      return this.topics[currentIndex + 1];
    }

    return currentTopic;
  }
}

// Factory function for easy setup
export function createWebhookHandler(config: {
  sessionManager: SessionManager;
  responseGenerator: ResponseGenerator;
  topics?: string[];
  enableLogging?: boolean;
}): ElevenLabsWebhookHandler {
  const webhookConfig: WebhookConfig = {
    sessionManager: config.sessionManager,
    responseGenerator: config.responseGenerator,
    topicManager: config.topics ? new SimpleTopicManager(config.topics) : undefined,
    enableLogging: config.enableLogging || false
  };

  return new ElevenLabsWebhookHandler(webhookConfig);
}

// Example implementation for Next.js API route
export function createNextJSWebhookRoute(handler: ElevenLabsWebhookHandler) {
  return {
    async POST(request: NextRequest): Promise<NextResponse> {
      return handler.handleWebhook(request);
    }
  };
}