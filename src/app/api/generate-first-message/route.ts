import { NextRequest, NextResponse } from 'next/server';
import { generateTherapistResponse } from '@/lib/claude-api';
import type { TherapistPersonality } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { therapist }: { therapist: TherapistPersonality } = await request.json();

    if (!therapist) {
      return NextResponse.json(
        { error: 'Therapist personality is required' },
        { status: 400 }
      );
    }

    // Generate unified first message using same logic as manual mode
    const firstMessageResponse = await generateTherapistResponse(
      therapist,
      "[SYSTEM: Generate opening message]",
      "",
      "intro"
    );

    return NextResponse.json({
      message: firstMessageResponse.response
    });

  } catch (error) {
    console.error('Error generating first message:', error);
    return NextResponse.json(
      { error: 'Failed to generate first message' },
      { status: 500 }
    );
  }
}