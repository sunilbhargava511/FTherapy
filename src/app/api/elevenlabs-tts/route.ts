import { NextRequest, NextResponse } from 'next/server';

// Voice mapping for each therapist
const THERAPIST_VOICES: Record<string, string> = {
  'danielle-town': 'ThT5KcBeYPX3keUQqHPh', // Dorothy - warm, intelligent female
  'aja-evans': 'oWAxZDx7w5VEj9dCyTzz', // Grace - nurturing female  
  'ramit-sethi': 'VR6AewLTigWG4xSOukaG', // Josh - confident male
  'nora-ephron': 'EXAVITQu4vr4xnSDxMaL', // Bella - witty female
  'anita-bhargava': 'mLO3zRzNWGT6HtmIOcOQ', // Updated voice for Anita
  // Backup bench therapists
  'shakespeare': 'onwK4e9ZLuTAKqWW03F9', // Daniel - distinguished English gentleman
  'trevor-noah': 'N2lVS1w4EtoT3dr4eOWO', // Callum - warm, articulate male with slight accent
  'peter-lynch': 'douDhHvfoViWmZth0cUX', // Updated male voice for Peter Lynch
  'michelle-obama': 'XB0fDUnXU5powFXDhCwa', // Charlotte - elegant, inspiring female
  'mel-robbins': 'jBpfuIE2acCO8z3wKNLl', // Freya - energetic, motivational female
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

    // Use default voice for custom therapists (those not in THERAPIST_VOICES)
    const voiceId = THERAPIST_VOICES[therapistId] || 'ThT5KcBeYPX3keUQqHPh'; // Dorothy - warm, intelligent female as default

    // Map speaking pace (1-5) to speed (0.25-2.0)
    const speedMapping = {
      1: 0.5,  // Very Slow
      2: 0.75, // Slow
      3: 1.0,  // Normal
      4: 1.25, // Fast
      5: 1.5   // Very Fast
    };
    let speed = speedMapping[speakingPace as keyof typeof speedMapping] || 1.0;
    
    // Make Anita speak slower by default
    if (therapistId === 'anita-bhargava') {
      speed = speed * 0.75; // Reduce speed by 25%
    }

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
          stability: therapistId === 'anita-bhargava' ? 0.8 : 0.5,
          similarity_boost: therapistId === 'anita-bhargava' ? 0.4 : 0.5,
          speed: speed,
          ...(therapistId === 'anita-bhargava' && { style: 0.1, use_speaker_boost: true }), // Deeper, less nasal tone for Anita
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