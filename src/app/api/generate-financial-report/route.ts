import { NextRequest, NextResponse } from 'next/server';
import { UserProfile } from '@/lib/types';

const EXPENSE_CATEGORIES = {
  housing: {
    'Living Alone': { rent: 2500, utilities: 200, insurance: 50 },
    'With Roommates': { rent: 1500, utilities: 100, insurance: 30 },
    'With Family': { rent: 800, utilities: 50, insurance: 20 },
    'Own Home': { mortgage: 3000, utilities: 250, insurance: 150, maintenance: 200 }
  },
  food: {
    'Meal Prep Master': { groceries: 400, dining: 100 },
    'Balanced Approach': { groceries: 500, dining: 300 },
    'Restaurant Regular': { groceries: 300, dining: 600 },
    'Delivery Dependent': { groceries: 200, dining: 800 }
  },
  transport: {
    'Car Owner': { payment: 400, insurance: 150, gas: 200, maintenance: 100 },
    'Public Transit': { monthly_pass: 120 },
    'Bike/Walk': { maintenance: 20 },
    'Rideshare Regular': { rideshare: 300 }
  },
  fitness: {
    'Gym Member': { membership: 50, classes: 50 },
    'Home Workout': { equipment: 20, apps: 15 },
    'Outdoor Enthusiast': { gear: 30 },
    'Studio Classes': { classes: 200 }
  },
  entertainment: {
    'Homebody': { streaming: 30, games: 20 },
    'Social Butterfly': { events: 200, dining: 150 },
    'Culture Enthusiast': { museums: 50, shows: 150 },
    'Mixed Interests': { streaming: 30, events: 100, activities: 70 }
  },
  subscriptions: {
    'Minimal': { total: 50 },
    'Moderate': { total: 150 },
    'Heavy': { total: 300 }
  },
  travel: {
    'Weekend Explorer': { monthly: 300 },
    'Big Trip Saver': { monthly: 500 },
    'Minimal Traveler': { monthly: 100 },
    'Frequent Flyer': { monthly: 800 }
  }
};

async function generateReportWithClaude(profile: UserProfile): Promise<any> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey || apiKey === 'your_api_key_here') {
    // Fallback to local calculation
    return generateLocalReport(profile);
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: `Generate a comprehensive financial report based on this user's lifestyle information.

User Profile:
${JSON.stringify(profile, null, 2)}

## Your Task:
Create both a qualitative lifestyle analysis and quantitative expense breakdown.

## Part 1: QUALITATIVE LIFESTYLE ANALYSIS
Provide a narrative description that:
- Summarizes their current lifestyle choices
- Identifies their financial personality type
- Highlights spending patterns and priorities
- Offers personalized recommendations
- Creates a shared understanding of their desired lifestyle

## Part 2: QUANTITATIVE EXPENSE BREAKDOWN
Based on their qualitative lifestyle information, estimate realistic monthly expenses using publicly available data for their location. DO NOT use any numbers they provided - instead research typical costs for their lifestyle choices and location. Include ALL relevant categories:

### Core Categories:
- **Housing**: Rent/mortgage, utilities, insurance, maintenance, property taxes
- **Transportation**: Car payments, insurance, gas, maintenance, public transit, rideshare
- **Food & Dining**: Groceries, restaurants, delivery, coffee shops
- **Healthcare**: Insurance premiums, medications, co-pays, dental, vision
- **Insurance**: Life, disability, long-term care
- **Debt & Loans**: Credit cards, student loans, personal loans

### Lifestyle Categories:
- **Family & Children**: Childcare, education, activities, support
- **Entertainment**: Subscriptions, events, hobbies, gym memberships
- **Personal Care**: Clothing, grooming, beauty
- **Travel & Vacations**: Monthly allocation for trips
- **Savings & Investments**: Emergency fund, retirement, goals
- **Miscellaneous**: Gifts, donations, professional development

Return the response in this JSON format:
{
  "lifestyleAnalysis": {
    "summary": "Comprehensive overview of their lifestyle",
    "personality": "Financial personality type with explanation",
    "currentSituation": "Detailed description of current lifestyle",
    "strengths": ["strength1", "strength2", "strength3"],
    "opportunities": ["opportunity1", "opportunity2", "opportunity3"],
    "recommendations": ["specific recommendation 1", "specific recommendation 2", "specific recommendation 3"],
    "lifestyleAlignment": "How their spending aligns with stated values and goals"
  },
  "monthlyBudget": {
    "income": 0,
    "expenses": {
      "housing": { 
        "rent_mortgage": 0, 
        "utilities": 0, 
        "insurance": 0,
        "maintenance": 0,
        "property_tax": 0,
        "total": 0 
      },
      "transportation": { 
        "car_payment": 0,
        "insurance": 0,
        "gas": 0,
        "maintenance": 0,
        "public_transit": 0,
        "rideshare": 0,
        "total": 0 
      },
      "food_dining": { 
        "groceries": 0, 
        "restaurants": 0,
        "delivery": 0,
        "coffee": 0,
        "total": 0 
      },
      "healthcare": {
        "insurance": 0,
        "medications": 0,
        "copays": 0,
        "dental_vision": 0,
        "total": 0
      },
      "insurance": {
        "life": 0,
        "disability": 0,
        "long_term_care": 0,
        "total": 0
      },
      "debt_loans": {
        "credit_cards": 0,
        "student_loans": 0,
        "personal_loans": 0,
        "total": 0
      },
      "family_children": {
        "childcare": 0,
        "education": 0,
        "activities": 0,
        "support": 0,
        "total": 0
      },
      "lifestyle_entertainment": {
        "gym": 0,
        "subscriptions": 0,
        "events": 0,
        "hobbies": 0,
        "personal_care": 0,
        "clothing": 0,
        "total": 0
      },
      "travel": { 
        "monthly_allocation": 0,
        "total": 0 
      },
      "savings_investments": { 
        "emergency_fund": 0, 
        "retirement": 0, 
        "other_goals": 0, 
        "total": 0 
      },
      "miscellaneous": {
        "gifts": 0,
        "donations": 0,
        "professional_dev": 0,
        "other": 0,
        "total": 0
      }
    },
    "totalExpenses": 0,
    "netIncome": 0,
    "savingsRate": "X%"
  }
}`
        }]
      })
    });

    if (response.ok) {
      const data = await response.json();
      const content = data.content[0].text;
      return JSON.parse(content);
    }
  } catch (error) {
    console.error('Claude API error:', error);
  }

  // Fallback to local calculation
  return generateLocalReport(profile);
}

function generateLocalReport(profile: UserProfile) {
  // Calculate expenses based on profile
  const expenses: any = {
    housing: { items: {}, total: 0 },
    food: { items: {}, total: 0 },
    transport: { items: {}, total: 0 },
    fitness: { items: {}, total: 0 },
    entertainment: { items: {}, total: 0 },
    subscriptions: { items: {}, total: 0 },
    travel: { items: {}, total: 0 }
  };

  // Housing calculation
  const housingPref = profile.lifestyle?.housing?.preference || 'With Roommates';
  const housingData = EXPENSE_CATEGORIES.housing[housingPref as keyof typeof EXPENSE_CATEGORIES.housing] || EXPENSE_CATEGORIES.housing['With Roommates'];
  expenses.housing.items = housingData;
  expenses.housing.total = Object.values(housingData).reduce((sum: number, val: any) => sum + val, 0);

  // Food calculation
  const foodPref = profile.lifestyle?.food?.preference || 'Balanced Approach';
  const foodData = EXPENSE_CATEGORIES.food[foodPref as keyof typeof EXPENSE_CATEGORIES.food] || EXPENSE_CATEGORIES.food['Balanced Approach'];
  expenses.food.items = foodData;
  expenses.food.total = Object.values(foodData).reduce((sum: number, val: any) => sum + val, 0);

  // Transport calculation
  const transportPref = profile.lifestyle?.transport?.preference || 'Public Transit';
  const transportData = EXPENSE_CATEGORIES.transport[transportPref as keyof typeof EXPENSE_CATEGORIES.transport] || EXPENSE_CATEGORIES.transport['Public Transit'];
  expenses.transport.items = transportData;
  expenses.transport.total = Object.values(transportData).reduce((sum: number, val: any) => sum + val, 0);

  // Continue for other categories...
  const totalExpenses = Object.values(expenses).reduce((sum: number, cat: any) => sum + cat.total, 0);
  
  // Estimate income based on age and location
  const estimatedIncome = estimateIncome(profile);
  
  return {
    lifestyleAnalysis: {
      summary: `${profile.name} is a ${profile.age}-year-old living in ${profile.location} with diverse lifestyle preferences.`,
      personality: determineFinancialPersonality(profile),
      strengths: [
        "Clear awareness of spending habits",
        "Balanced approach to lifestyle choices"
      ],
      opportunities: [
        "Potential to optimize housing costs",
        "Room for increased savings rate"
      ],
      recommendations: [
        "Consider a 50/30/20 budget allocation",
        "Automate savings for long-term goals"
      ]
    },
    monthlyBudget: {
      income: estimatedIncome,
      expenses: expenses,
      totalExpenses: totalExpenses,
      netIncome: estimatedIncome - totalExpenses,
      savings: {
        emergency: Math.max(0, (estimatedIncome - totalExpenses) * 0.3),
        retirement: Math.max(0, (estimatedIncome - totalExpenses) * 0.4),
        goals: Math.max(0, (estimatedIncome - totalExpenses) * 0.3),
        total: Math.max(0, estimatedIncome - totalExpenses)
      }
    }
  };
}

function estimateIncome(profile: UserProfile): number {
  const age = parseInt(profile.age || '30') || 30;
  const baseIncome = 50000;
  const ageMultiplier = Math.min(2, 1 + (age - 22) * 0.05);
  const locationMultiplier = profile.location?.toLowerCase().includes('city') ? 1.3 : 1;
  return Math.round(baseIncome * ageMultiplier * locationMultiplier / 12);
}

function determineFinancialPersonality(profile: UserProfile): string {
  // Simple personality determination based on preferences
  const preferences = profile.lifestyle;
  let score = 0;
  
  if (preferences?.housing?.preference?.includes('Own')) score += 2;
  if (preferences?.food?.preference?.includes('Meal Prep')) score += 2;
  if (preferences?.transport?.preference?.includes('Bike')) score += 2;
  
  if (score >= 4) return "The Conscious Saver";
  if (score >= 2) return "The Balanced Spender";
  return "The Lifestyle Enthusiast";
}

export async function POST(request: NextRequest) {
  try {
    const { userProfile } = await request.json();
    
    if (!userProfile || !userProfile.name) {
      return NextResponse.json(
        { error: 'User profile is required' },
        { status: 400 }
      );
    }

    const report = await generateReportWithClaude(userProfile);
    
    return NextResponse.json(report);
  } catch (error) {
    console.error('Error generating financial report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}