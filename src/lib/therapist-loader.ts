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
    responses: {
      intro: {
        positive: "I'm excited to work with you on your financial journey! Understanding where your money goes is the first step to taking control. What's your name?",
        negative: "I understand money conversations can feel overwhelming. But I'm here to make this easy and comfortable. When you're ready to start building your financial awareness, just say 'ready'!"
      },
      name: {
        default: "Great to meet you, {name}! You're taking a smart step by having this conversation. Can you tell me your age? This helps me understand your financial stage."
      },
      age: {
        default: "Perfect! At {age}, you have great potential to build financial awareness. Tell me about yourself - what interests you? What's important to you?"
      },
      interests: {
        default: "That's wonderful! Understanding your values helps create a budget that actually works for you. Now, where do you live - big city, suburbs, or somewhere else?"
      },
      housing_location: {
        default: "Great! Location really affects our spending patterns. Let's dive into your lifestyle - starting with housing. Are you living alone, with roommates, or with family?"
      },
      housing_preference: {
        default: "That makes sense! Housing is usually our biggest expense. Next, let's talk about food - are you someone who cooks at home, loves dining out, or a mix of both?"
      },
      food_preference: {
        default: "Good to know! Food choices really shape our budgets. How about transportation - do you have a car, use public transit, or prefer other ways to get around?"
      },
      transport_preference: {
        default: "That's helpful! Transportation costs can vary so much. Let's talk about fitness - staying healthy is an investment. Do you have a gym membership, work out at home, or prefer outdoor activities?"
      },
      fitness_preference: {
        default: "Great approach to health! Now for fun - entertainment is important for a balanced budget. What do you enjoy doing? Movies, streaming, concerts, outdoor activities?"
      },
      entertainment_preference: {
        default: "Fun is so important! Speaking of monthly expenses, let's talk subscriptions - streaming, apps, memberships. What services are you currently paying for?"
      },
      subscriptions_preference: {
        default: "Those can definitely add up! Last question - travel and experiences. Are you more of a frequent explorer or someone who saves up for bigger adventures?"
      },
      travel_preference: {
        default: "Perfect! You've given me a complete picture of your lifestyle. This is exactly what I need to show you where your money is going. Ready to see your financial overview?"
      },
      summary: {
        positive: "Here's your complete financial picture! This is your foundation for making smarter money decisions going forward.",
        negative: "I know looking at numbers can feel overwhelming, but this information is powerful! When you're ready to see your financial overview, just say 'show me' - this is your path to financial clarity!"
      }
    }
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