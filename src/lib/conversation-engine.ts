import { ConversationTopic, TherapistPersonality, UserProfile } from './types';

export class ConversationEngine {
  private therapist: TherapistPersonality;
  private userProfile: UserProfile;
  private currentTopic: ConversationTopic;

  constructor(therapist: TherapistPersonality) {
    this.therapist = therapist;
    this.currentTopic = 'intro';
    this.userProfile = {
      name: '',
      age: '',
      location: '',
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
      
      const response = await fetch('/api/therapist-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          therapistId: this.therapist.id,
          userInput: input,
          conversationContext,
          currentTopic: this.currentTopic
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        this.currentTopic = result.nextTopic as ConversationTopic;
        return {
          response: result.response,
          nextTopic: result.nextTopic,
          note: result.note
        };
      }
    } catch (error) {
      console.error('Failed to get AI response, falling back to static:', error);
    }
    
    // Fallback to original static logic
    const response = this.generateResponse(input);
    const nextTopic = this.getNextTopic(input);
    const note = this.generateNote(input);
    
    this.currentTopic = nextTopic;
    
    return { response, nextTopic, note };
  }

  private generateResponse(input: string): string {
    const responsePattern = this.therapist.responses[this.currentTopic];
    
    if (!responsePattern) {
      return "I'm not sure how to respond to that. Could you tell me more?";
    }

    // Determine if input is positive, negative, or neutral
    const isPositive = this.isPositiveResponse(input);
    const isNegative = this.isNegativeResponse(input);

    let response: string | ((input: string) => string) | undefined;

    if (isPositive && responsePattern.positive) {
      response = responsePattern.positive;
    } else if (isNegative && responsePattern.negative) {
      response = responsePattern.negative;
    } else if (responsePattern.default) {
      response = responsePattern.default;
    } else {
      response = "Thank you for sharing that. Could you tell me more?";
    }

    // Handle function responses
    if (typeof response === 'function') {
      return response(input);
    }

    // Handle template strings
    return this.replaceTemplateVariables(response, input);
  }

  private replaceTemplateVariables(template: string, input: string): string {
    let result = template;
    
    // Replace {name}
    if (this.userProfile.name) {
      result = result.replace(/{name}/g, this.userProfile.name);
    } else if (this.currentTopic === 'name') {
      const nameMatch = input.match(/(?:my name is |i'm |i am |call me )([a-zA-Z]+)/i) || [null, input.trim()];
      result = result.replace(/{name}/g, nameMatch[1] || input);
    }
    
    // Replace {age}
    if (this.userProfile.age) {
      result = result.replace(/{age}/g, this.userProfile.age);
    } else if (this.currentTopic === 'age') {
      const ageMatch = input.match(/(\d+)/);
      result = result.replace(/{age}/g, ageMatch?.[1] || input);
    }
    
    return result;
  }

  private isPositiveResponse(input: string): boolean {
    const positiveWords = ['yes', 'sure', 'okay', 'ready', 'start', 'begin', 'go', 'show', 'absolutely'];
    return positiveWords.some(word => input.toLowerCase().includes(word));
  }

  private isNegativeResponse(input: string): boolean {
    const negativeWords = ['no', 'not', 'don\'t', 'can\'t', 'won\'t', 'maybe later', 'not sure'];
    return negativeWords.some(word => input.toLowerCase().includes(word));
  }

  private getNextTopic(input: string): ConversationTopic {
    const topicFlow: Record<ConversationTopic, ConversationTopic> = {
      intro: this.isPositiveResponse(input) ? 'name' : 'intro',
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

  private updateUserProfile(input: string): void {
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
        this.userProfile.lifestyle.housing.preference = input;
        break;
      
      case 'food_preference':
        this.userProfile.lifestyle.food.preference = input;
        break;
      
      case 'transport_preference':
        this.userProfile.lifestyle.transport.preference = input;
        break;
      
      case 'fitness_preference':
        this.userProfile.lifestyle.fitness.preference = input;
        break;
      
      case 'entertainment_preference':
        this.userProfile.lifestyle.entertainment.preference = input;
        break;
      
      case 'subscriptions_preference':
        this.userProfile.lifestyle.subscriptions.preference = input;
        break;
      
      case 'travel_preference':
        this.userProfile.lifestyle.travel.preference = input;
        break;
    }
  }

  private generateNote(input: string): string {
    const noteTemplates: Record<ConversationTopic, string> = {
      intro: this.isPositiveResponse(input) ? '✓ Client ready to begin' : '- Client hesitant, providing encouragement',
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
      summary: this.isPositiveResponse(input) ? '✓ Showing financial summary' : 'Client not ready for summary yet'
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
    Object.entries(profile.lifestyle).forEach(([key, value]) => {
      if (value.preference) {
        context.push(`${key}: ${value.preference}`);
      }
    });
    
    return context.join('\n');
  }

  getInitialMessage(): string {
    const responsePattern = this.therapist.responses.intro;
    const message = responsePattern.positive || responsePattern.default || "Hello! I'm excited to work with you on your financial journey. Are you ready to begin?";
    
    if (typeof message === 'function') {
      return message('');
    }
    
    return message;
  }

  reset(): void {
    this.currentTopic = 'intro';
    this.userProfile = {
      name: '',
      age: '',
      location: '',
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