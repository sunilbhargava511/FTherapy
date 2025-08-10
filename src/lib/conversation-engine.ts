import { ConversationTopic, TherapistPersonality, UserProfile } from './types';
import { therapistAPI, APIError } from './api-client';

export class ConversationEngine {
  private therapist: TherapistPersonality;
  private userProfile: UserProfile;
  private currentTopic: ConversationTopic;

  constructor(therapist: TherapistPersonality) {
    this.therapist = therapist;
    this.currentTopic = 'intro';
    this.userProfile = {
      lifestyle: {
        housing: { preference: '', details: '' },
        food: { preference: '', details: '' },
        transport: { preference: '', details: '' },
        fitness: { preference: '', details: '' },
        entertainment: { preference: '', details: '' },
        subscriptions: { preference: '', details: '' },
        travel: { preference: '', details: '' },
        lifeEvents: { preference: '', details: '' }
      }
    };
  }

  async processUserInput(input: string): Promise<{ response: string; nextTopic: ConversationTopic; note: string }> {
    // Update user profile based on current topic first
    this.updateUserProfile(input);
    
    // Try to use Claude API for dynamic responses
    try {
      const conversationContext = this.buildConversationContext();
      
      const result = await therapistAPI.generateResponse({
        therapistId: this.therapist.id,
        userInput: input,
        conversationContext,
        currentTopic: this.currentTopic
      });
      
      const data = result.data as any;
      this.currentTopic = data.nextTopic as ConversationTopic;
      return {
        response: data.response,
        nextTopic: data.nextTopic,
        note: data.note
      };
    } catch (error) {
      console.error('Failed to get AI response:', error instanceof APIError ? `${error.status}: ${error.message}` : error);
    }
    
    // No fallback - throw error to track API failures
    const errorMsg = 'Claude API failed - no fallback available';
    console.error('[API_FAILURE]', new Date().toISOString(), {
      therapistId: this.therapist.id,
      currentTopic: this.currentTopic,
      error: errorMsg
    });
    throw new Error(errorMsg);
  }


  private getNextTopic(input: string): ConversationTopic {
    // Simple topic flow without checking for positive/negative responses
    const topicFlow: Record<ConversationTopic, ConversationTopic> = {
      intro: 'name',
      name: 'age',
      age: 'interests',
      interests: 'housing_location',
      housing_location: 'housing_preference',
      housing_preference: 'food_preference',
      food_preference: 'transport_preference',
      transport_preference: 'fitness_preference',
      fitness_preference: 'entertainment_preference',
      entertainment_preference: 'subscriptions_preference',
      subscriptions_preference: 'travel_preference',
      travel_preference: 'summary',
      summary: 'summary'
    };

    return topicFlow[this.currentTopic] || this.currentTopic;
  }

  updateUserProfile(input: string): void {
    switch (this.currentTopic) {
      case 'name':
        const nameMatch = input.match(/(?:my name is |i'm |i am |call me )([a-zA-Z]+)/i) || [null, input.trim()];
        this.userProfile.name = nameMatch[1] || input.trim();
        break;
      
      case 'age':
        const ageMatch = input.match(/(\d+)/);
        if (ageMatch) {
          this.userProfile.age = ageMatch[1];
        }
        break;
      
      case 'housing_location':
        this.userProfile.location = input;
        break;
      
      case 'housing_preference':
        this.userProfile.lifestyle!.housing!.preference = input;
        break;
      
      case 'food_preference':
        this.userProfile.lifestyle!.food!.preference = input;
        break;
      
      case 'transport_preference':
        this.userProfile.lifestyle!.transport!.preference = input;
        break;
      
      case 'fitness_preference':
        this.userProfile.lifestyle!.fitness!.preference = input;
        break;
      
      case 'entertainment_preference':
        this.userProfile.lifestyle!.entertainment!.preference = input;
        break;
      
      case 'subscriptions_preference':
        this.userProfile.lifestyle!.subscriptions!.preference = input;
        break;
      
      case 'travel_preference':
        this.userProfile.lifestyle!.travel!.preference = input;
        break;
    }
  }

  private generateNote(input: string): string {
    const noteTemplates: Record<ConversationTopic, string> = {
      intro: '✓ Session started',
      name: `Name: ${this.userProfile.name || input.trim()}`,
      age: `Age: ${this.userProfile.age || 'pending'}`,
      interests: `Interests/Values: ${input.substring(0, 50)}...`,
      housing_location: `Location: ${input}`,
      housing_preference: `Housing: ${input}`,
      food_preference: `Food habits: ${input}`,
      transport_preference: `Transportation: ${input}`,
      fitness_preference: `Fitness: ${input}`,
      entertainment_preference: `Entertainment: ${input}`,
      subscriptions_preference: `Subscriptions: ${input}`,
      travel_preference: `Travel: ${input}`,
      summary: '✓ Financial summary requested'
    };

    return noteTemplates[this.currentTopic] || `${this.currentTopic}: ${input.substring(0, 30)}...`;
  }

  getCurrentTopic(): ConversationTopic {
    return this.currentTopic;
  }

  getUserProfile(): UserProfile {
    return { ...this.userProfile };
  }

  public buildConversationContext(): string {
    const profile = this.userProfile;
    const context = [];
    
    if (profile.name) context.push(`User's name: ${profile.name}`);
    if (profile.age) context.push(`Age: ${profile.age}`);
    if (profile.location) context.push(`Location: ${profile.location}`);
    
    // Add lifestyle info that's been collected
    if (profile.lifestyle) {
      Object.entries(profile.lifestyle).forEach(([key, value]) => {
        if (value?.preference) {
          context.push(`${key}: ${value.preference}`);
        }
      });
    }
    
    return context.join('\n');
  }

  async getInitialMessage(): Promise<string> {
    // Try to generate dynamic intro using Claude
    try {
      const result = await therapistAPI.generateResponse({
        therapistId: this.therapist.id,
        userInput: '[SYSTEM: Generate opening message]',
        conversationContext: '',
        currentTopic: 'intro'
      });
      
      return (result.data as any).response;
    } catch (error) {
      const errorMsg = 'Failed to generate initial message - Claude API unavailable';
      console.error('[API_FAILURE_INTRO]', new Date().toISOString(), {
        therapistId: this.therapist.id,
        error: error instanceof APIError ? error.message : 'Unknown error'
      });
      throw new Error(errorMsg);
    }
  }

  reset(): void {
    this.currentTopic = 'intro';
    this.userProfile = {
      lifestyle: {
        housing: { preference: '', details: '' },
        food: { preference: '', details: '' },
        transport: { preference: '', details: '' },
        fitness: { preference: '', details: '' },
        entertainment: { preference: '', details: '' },
        subscriptions: { preference: '', details: '' },
        travel: { preference: '', details: '' },
        lifeEvents: { preference: '', details: '' }
      }
    };
  }
}