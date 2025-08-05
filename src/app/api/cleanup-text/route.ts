import { NextRequest, NextResponse } from 'next/server';
import { cleanupTextWithClaude } from '@/lib/claude-api';

export async function POST(request: NextRequest) {
  let text: string = '';
  
  try {
    const body = await request.json();
    text = body.text;
    
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    // Check if Claude API is configured
    if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your_api_key_here') {
      // Fallback to local cleanup if no API key
      const cleanedText = cleanupTextLocally(text);
      return NextResponse.json({ cleanedText });
    }

    // Use Claude API for intelligent cleanup
    const cleanedText = await cleanupTextWithClaude(text);
    
    return NextResponse.json({ cleanedText });
  } catch (error) {
    console.error('Error cleaning up text:', error);
    
    // Fallback to local cleanup on error
    if (text) {
      try {
        const cleanedText = cleanupTextLocally(text);
        return NextResponse.json({ cleanedText });
      } catch (fallbackError) {
        // If even local cleanup fails, return the original text
        return NextResponse.json({ cleanedText: text });
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to clean up text' },
      { status: 500 }
    );
  }
}

function cleanupTextLocally(rawText: string): string {
  let cleaned = rawText;
  
  // Step 1: Fix the most obvious repetitions (like "my name is Sunil my name is Sunil...")
  // This regex captures 2-6 word phrases that repeat
  cleaned = cleaned.replace(/\b((?:\w+\s+){2,6})\1+/gi, '$1');
  
  // Step 2: Remove filler words
  cleaned = cleaned.replace(/\b(um|uh|like|you know|actually|basically|literally)\b\s*/gi, '');
  
  // Step 3: Clean up repeated single words (e.g., "I I think" -> "I think")
  cleaned = cleaned.replace(/\b(\w+)\s+\1\b/gi, '$1');
  
  // Step 4: Fix punctuation and spacing issues
  cleaned = cleaned
    .replace(/\s*,\s*,+/g, ',')
    .replace(/^\s*,\s*/, '')
    .replace(/\s*,\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Handle cases where someone repeats their entire response
  const sentences = cleaned.split(/[.!?]+/).filter(s => s.trim().length > 0);
  if (sentences.length > 1) {
    // Check if we have repeated sentences
    const uniqueSet = new Set(sentences.map(s => s.trim().toLowerCase()));
    const uniqueSentences = Array.from(uniqueSet);
    if (uniqueSentences.length < sentences.length / 2) {
      // If more than half are duplicates, just take the unique ones
      cleaned = uniqueSentences.join('. ');
    }
  }

  // Capitalize first letter of sentences
  cleaned = cleaned.replace(/(^|\.\s+)([a-z])/g, (match, prefix, letter) => {
    return prefix + letter.toUpperCase();
  });

  // Ensure the text ends with proper punctuation
  if (cleaned && !cleaned.match(/[.!?]$/)) {
    cleaned += '.';
  }

  // If the cleanup resulted in very short or empty text, return original
  if (cleaned.length < 3) {
    return rawText;
  }

  return cleaned;
}