import { NextRequest, NextResponse } from 'next/server';

// Voice mapping for each therapist
const THERAPIST_VOICES: Record<string, string> = {
  'danielle-town': 'ThT5KcBeYPX3keUQqHPh', // Dorothy - warm, intelligent female
  'aja-evans': 'oWAxZDx7w5VEj9dCyTzz', // Grace - nurturing female  
  'ramit-sethi': 'VR6AewLTigWG4xSOukaG', // Josh - confident male
  'nora-ephron': 'EXAVITQu4vr4xnSDxMaL', // Bella - witty female
  'anita-bhargava': 'duDBJHU6G1oq7ZdK4Kxf', // Deshna - Indian-accented female voice
};

export async function POST(request: NextRequest) {
  try {
    const { text, therapistId, speakingPace = 3 } = await request.json();

    if (!text || !therapistId) {
      return NextResponse.json(
        { error: 'Text and therapistId are required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured' },
        { status: 500 }
      );
    }

    const voiceId = THERAPIST_VOICES[therapistId] || THERAPIST_VOICES['danielle-town'];

    // Map speaking pace (1-5) to speed (0.25-2.0)
    const speedMapping = {
      1: 0.5,  // Very Slow
      2: 0.75, // Slow
      3: 1.0,  // Normal
      4: 1.25, // Fast
      5: 1.5   // Very Fast
    };
    const speed = speedMapping[speakingPace as keyof typeof speedMapping] || 1.0;

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: therapistId === 'anita-bhargava' ? 'eleven_multilingual_v2' : 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
          speed: speed,
        },
      }),
    });

    if (!response.ok) {
      console.error('ElevenLabs API error:', response.status, response.statusText);
      return NextResponse.json(
        { error: 'Failed to generate speech' },
        { status: response.status }
      );
    }

    const audioBuffer = await response.arrayBuffer();

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
      },
    });

  } catch (error) {
    console.error('ElevenLabs TTS error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}