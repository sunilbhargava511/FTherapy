import { TherapistPersonality, TherapistStyle } from './types';

// Import all therapist data
import danielleTown from '../../therapists/danielle-town.json';
import ajaEvans from '../../therapists/aja-evans.json';
import ramitSethi from '../../therapists/ramit-sethi.json';
import noraEphron from '../../therapists/nora-ephron.json';
import anitaBhargava from '../../therapists/anita-bhargava.json';
import michelleObama from '../../therapists/michelle-obama.json';
import trevorNoah from '../../therapists/trevor-noah.json';
import peterLynch from '../../therapists/peter-lynch.json';
import shakespeare from '../../therapists/shakespeare.json';
import melRobbins from '../../therapists/mel-robbins.json';

const therapists: Record<string, TherapistPersonality> = {
  'danielle-town': danielleTown as TherapistPersonality,
  'aja-evans': ajaEvans as TherapistPersonality,
  'ramit-sethi': ramitSethi as TherapistPersonality,
  'nora-ephron': noraEphron as TherapistPersonality,
  'anita-bhargava': anitaBhargava as TherapistPersonality,
  'michelle-obama': michelleObama as TherapistPersonality,
  'trevor-noah': trevorNoah as TherapistPersonality,
  'peter-lynch': peterLynch as TherapistPersonality,
  'shakespeare': shakespeare as TherapistPersonality,
  'mel-robbins': melRobbins as TherapistPersonality,
};

// Create a basic therapist personality for custom therapists
function createCustomTherapistPersonality(therapistStyle: TherapistStyle): TherapistPersonality {
  return {
    id: therapistStyle.id,
    name: therapistStyle.name,
    tagline: therapistStyle.tagline,
    icon: therapistStyle.icon,
    color: therapistStyle.color,
    biography: {
      background: "A custom financial coach created to help with your money journey. I'll work with you to understand your spending patterns and help you make smarter financial decisions.",
      expertise: ["Personal finance", "Budgeting", "Financial awareness", "Money mindset", "Lifestyle analysis"],
      keyMessages: [
        "Every financial journey is unique",
        "Understanding your spending is the first step to financial freedom",
        "Small changes can lead to big financial wins",
        "Your money should align with your values"
      ],
      podcastTopics: [
        "Building better money habits",
        "Understanding your relationship with money",
        "Creating a sustainable financial plan",
        "Aligning spending with your goals"
      ]
    },
    conversationStyle: {
      tone: "Friendly, supportive, practical",
      approach: "Personalized, encouraging, goal-focused",
      keyPhrases: [
        "Let's explore this together",
        "That's really insightful",
        "Tell me more about that",
        "You're making great progress",
        "That's a smart observation",
        "I'd love to understand more",
        "Great thinking!"
      ]
    },
    // Removed static responses - all responses now come from Claude API
    responses: {} as any
  };
}

export function getTherapist(id: string): TherapistPersonality {
  // First check built-in therapists
  const therapist = therapists[id];
  if (therapist) {
    return therapist;
  }
  
  // Check for custom therapists in localStorage (browser only)
  if (typeof window !== 'undefined') {
    try {
      const customTherapists = localStorage.getItem('customTherapists');
      if (customTherapists) {
        const customList: TherapistStyle[] = JSON.parse(customTherapists);
        const customTherapist = customList.find(t => t.id === id);
        if (customTherapist) {
          return createCustomTherapistPersonality(customTherapist);
        }
      }
    } catch (error) {
      console.error('Error loading custom therapist:', error);
    }
  }
  
  throw new Error(`Therapist with id "${id}" not found`);
}

export function getAllTherapists(): TherapistPersonality[] {
  return Object.values(therapists);
}

export function getTherapistIds(): string[] {
  return Object.keys(therapists);
}