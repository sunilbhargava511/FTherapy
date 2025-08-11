/**
 * Reusable Next.js API route for ElevenLabs signed URL generation
 */

import { NextRequest, NextResponse } from 'next/server';
import { ElevenLabsConfig } from '../types/elevenlabs';

export interface SignedUrlConfig {
  apiKey: string;
  defaultAgentId?: string;
  baseUrl?: string;
}

export class SignedUrlHandler {
  private config: SignedUrlConfig;

  constructor(config: SignedUrlConfig) {
    this.config = config;
  }

  async handleRequest(request: NextRequest): Promise<NextResponse> {
    try {
      // Parse request body
      const body = await request.json();
      const agentId = body.agentId || this.config.defaultAgentId;

      if (!agentId) {
        return NextResponse.json(
          { error: 'Agent ID is required' },
          { status: 400 }
        );
      }

      if (!this.config.apiKey) {
        return NextResponse.json(
          { error: 'ElevenLabs API key not configured' },
          { status: 500 }
        );
      }

      // Get signed URL from ElevenLabs
      const elevenLabsUrl = this.config.baseUrl || 'https://api.elevenlabs.io';
      const response = await fetch(
        `${elevenLabsUrl}/v1/convai/conversation/get_signed_url?agent_id=${agentId}`,
        {
          method: 'GET',
          headers: {
            'xi-api-key': this.config.apiKey,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('ElevenLabs API error:', response.status, errorText);
        return NextResponse.json(
          { error: 'Failed to get signed URL from ElevenLabs' },
          { status: response.status }
        );
      }

      const data = await response.json();
      
      if (!data.signed_url) {
        return NextResponse.json(
          { error: 'No signed URL returned from ElevenLabs' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        signedUrl: data.signed_url,
        agentId: agentId
      });

    } catch (error) {
      console.error('Signed URL generation error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }
}

// Factory function
export function createSignedUrlHandler(config: SignedUrlConfig): SignedUrlHandler {
  return new SignedUrlHandler(config);
}

// Next.js API route factory
export function createSignedUrlRoute(config: SignedUrlConfig) {
  const handler = createSignedUrlHandler(config);
  
  return {
    async POST(request: NextRequest): Promise<NextResponse> {
      return handler.handleRequest(request);
    }
  };
}

// Environment-based factory for convenience
export function createSignedUrlRouteFromEnv() {
  return createSignedUrlRoute({
    apiKey: process.env.ELEVENLABS_API_KEY!,
    defaultAgentId: process.env.ELEVENLABS_AGENT_ID,
  });
}