import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioBlob = formData.get('audio') as File;

    console.log('Received audio blob:', {
      name: audioBlob?.name,
      size: audioBlob?.size,
      type: audioBlob?.type
    });

    if (!audioBlob) {
      console.error('No audio file provided');
      return NextResponse.json(
        { error: 'Audio file is required' },
        { status: 400 }
      );
    }

    if (audioBlob.size === 0) {
      console.error('Audio file is empty');
      return NextResponse.json(
        { error: 'Audio file is empty' },
        { status: 400 }
      );
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      console.error('ElevenLabs API key not configured');
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured' },
        { status: 500 }
      );
    }

    // Create FormData for ElevenLabs API
    const elevenlabsFormData = new FormData();
    // ElevenLabs expects 'file' not 'audio' as the parameter name
    elevenlabsFormData.append('file', audioBlob, audioBlob.name || 'recording.webm');
    elevenlabsFormData.append('model_id', 'scribe_v1');
    elevenlabsFormData.append('language_code', 'en');

    console.log('Sending to ElevenLabs STT with:', {
      audioSize: audioBlob.size,
      audioType: audioBlob.type,
      model: 'scribe_v1',
      language: 'en'
    });

    const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
      },
      body: elevenlabsFormData,
    });

    if (!response.ok) {
      console.error('ElevenLabs STT API error:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      
      try {
        const errorData = JSON.parse(errorText);
        console.error('Parsed error:', errorData);
      } catch (e) {
        // Error text is not JSON
      }
      
      return NextResponse.json(
        { error: 'Failed to transcribe audio', details: errorText },
        { status: response.status }
      );
    }

    const result = await response.json();
    
    return NextResponse.json({
      transcript: result.text || '',
      confidence: result.language_probability || 0,
      language: result.language_code || 'en'
    });

  } catch (error) {
    console.error('ElevenLabs STT error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}