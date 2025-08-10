import { UserProfile, BudgetItem } from './types';
import expenseCategories from '../../data/expense-categories.json';

interface BudgetRules {
  baseIncome: number;
  locationMultiplier: Record<string, number>;
  lifestyleMultipliers: Record<string, Record<string, number>>;
}

const budgetRules: BudgetRules = {
  baseIncome: 5000, // Base monthly income assumption
  locationMultiplier: {
    'big city': 1.3,
    'city': 1.3,
    'urban': 1.3,
    'suburb': 1.1,
    'suburban': 1.1,
    'small town': 0.9,
    'rural': 0.8,
    'country': 0.8
  },
  lifestyleMultipliers: {
    housing: {
      'alone': 1.2,
      'solo': 1.2,
      'by myself': 1.2,
      'roommate': 0.7,
      'roommates': 0.7,
      'sharing': 0.7,
      'family': 0.5,
      'parents': 0.3
    },
    food: {
      'cook': 0.6,
      'meal prep': 0.6,
      'home': 0.6,
      'takeout': 1.3,
      'delivery': 1.4,
      'restaurant': 1.5,
      'dining out': 1.5
    },
    transport: {
      'car': 1.2,
      'own': 1.2,
      'lease': 1.1,
      'public': 0.4,
      'transit': 0.4,
      'bike': 0.2,
      'walk': 0.1
    },
    fitness: {
      'gym': 1.0,
      'home': 0.3,
      'outdoor': 0.2,
      'free': 0.1
    },
    entertainment: {
      'movies': 0.8,
      'concerts': 1.5,
      'streaming': 0.3,
      'home': 0.4,
      'expensive': 2.0
    },
    travel: {
      'frequent': 2.0,
      'annual': 1.0,
      'occasional': 0.7,
      'none': 0.2,
      'staycation': 0.3
    }
  }
};

export function calculateBudget(userProfile: UserProfile): BudgetItem[] {
  const { lifestyle, location } = userProfile;
  
  // Determine base multipliers
  const locationMult = getLocationMultiplier(location || '');
  const housingMult = getLifestyleMultiplier('housing', lifestyle?.housing?.preference || '');
  const foodMult = getLifestyleMultiplier('food', lifestyle?.food?.preference || '');
  const transportMult = getLifestyleMultiplier('transport', lifestyle?.transport?.preference || '');
  const fitnessMult = getLifestyleMultiplier('fitness', lifestyle?.fitness?.preference || '');
  const entertainmentMult = getLifestyleMultiplier('entertainment', lifestyle?.entertainment?.preference || '');
  const travelMult = getLifestyleMultiplier('travel', lifestyle?.travel?.preference || '');

  // Base budget percentages
  const baseBudget = [
    { category: 'Housing', baseMonthly: 1800, multiplier: housingMult * locationMult, icon: '🏠' },
    { category: 'Food & Dining', baseMonthly: 600, multiplier: foodMult * locationMult, icon: '🍽️' },
    { category: 'Transportation', baseMonthly: 400, multiplier: transportMult, icon: '🚗' },
    { category: 'Healthcare', baseMonthly: 300, multiplier: locationMult, icon: '🏥' },
    { category: 'Lifestyle & Entertainment', baseMonthly: 300, multiplier: entertainmentMult, icon: '🎬' },
    { category: 'Communications', baseMonthly: 150, multiplier: 1.0, icon: '📱' },
    { category: 'Fitness', baseMonthly: 100, multiplier: fitnessMult, icon: '💪' },
    { category: 'Travel', baseMonthly: 250, multiplier: travelMult, icon: '✈️' },
    { category: 'Insurance', baseMonthly: 200, multiplier: 1.0, icon: '🛡️' },
    { category: 'Subscriptions', baseMonthly: getSubscriptionAmount(lifestyle?.subscriptions?.preference || ''), multiplier: 1.0, icon: '📱' },
    { category: 'Savings & Investments', baseMonthly: 750, multiplier: 1.0, icon: '💰' },
    { category: 'Emergency Fund', baseMonthly: 500, multiplier: 1.0, icon: '🏦' },
  ];

  // Calculate totals
  const totalMonthly = baseBudget.reduce((sum, item) => sum + (item.baseMonthly * item.multiplier), 0);
  
  // Generate budget items with percentages
  return baseBudget.map(item => {
    const monthly = Math.round(item.baseMonthly * item.multiplier);
    const annual = monthly * 12;
    const percentage = Math.round((monthly / totalMonthly) * 100);
    
    return {
      category: item.category,
      monthly,
      annual,
      percentage,
      icon: item.icon
    };
  });
}

function getLocationMultiplier(location: string): number {
  const locationLower = location.toLowerCase();
  
  for (const [key, multiplier] of Object.entries(budgetRules.locationMultiplier)) {
    if (locationLower.includes(key)) {
      return multiplier;
    }
  }
  
  return 1.0; // Default multiplier
}

function getLifestyleMultiplier(category: string, preference: string): number {
  const preferenceLower = preference.toLowerCase();
  const categoryMultipliers = budgetRules.lifestyleMultipliers[category];
  
  if (!categoryMultipliers) return 1.0;
  
  for (const [key, multiplier] of Object.entries(categoryMultipliers)) {
    if (preferenceLower.includes(key)) {
      return multiplier;
    }
  }
  
  return 1.0; // Default multiplier
}

function getSubscriptionAmount(subscriptions: string): number {
  const subsLower = subscriptions.toLowerCase();
  
  // Count common subscriptions mentioned
  const subscriptionServices = [
    'netflix', 'spotify', 'hulu', 'disney', 'amazon', 'prime', 
    'apple', 'youtube', 'gym', 'fitness', 'adobe', 'office'
  ];
  
  const mentionedServices = subscriptionServices.filter(service => 
    subsLower.includes(service)
  ).length;
  
  // Estimate based on number of services mentioned
  return Math.max(50, mentionedServices * 15);
}

export function generateLifestyleSummary(userProfile: UserProfile): string {
  const { name, lifestyle } = userProfile;
  
  const summaryPoints = [
    lifestyle?.housing?.preference && `🏠 **Living Situation:** ${lifestyle?.housing?.preference}`,
    lifestyle?.food?.preference && `🍽️ **Eating Habits:** ${lifestyle?.food?.preference}`,
    lifestyle?.transport?.preference && `🚗 **Transportation:** ${lifestyle?.transport?.preference}`,
    lifestyle?.fitness?.preference && `💪 **Fitness:** ${lifestyle?.fitness?.preference}`,
    lifestyle?.entertainment?.preference && `🎬 **Entertainment:** ${lifestyle?.entertainment?.preference}`,
    lifestyle?.subscriptions?.preference && `📱 **Subscriptions:** ${lifestyle?.subscriptions?.preference}`,
    lifestyle?.travel?.preference && `✈️ **Travel Style:** ${lifestyle?.travel?.preference}`
  ].filter(Boolean);

  return `## ${name}'s Lifestyle Profile\n\n${summaryPoints.join('\n\n')}`;
}