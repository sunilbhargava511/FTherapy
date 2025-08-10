import { ConversationMessage, UserProfile } from '@/lib/types';
import { ExtractedFinancialData } from '../notebook/types';
import {
  INCOME_PATTERNS,
  EXPENSE_PATTERNS,
  DEBT_PATTERNS,
  GOAL_PATTERNS,
  LIFESTYLE_PATTERNS,
  normalizeAmount,
  convertToMonthly
} from './patterns';

export class DataExtractor {
  /**
   * Extract all financial and profile data from conversation messages
   */
  extract(messages: ConversationMessage[]): {
    financialData: ExtractedFinancialData;
    userProfile: UserProfile;
  } {
    // Filter to user messages only
    const userMessages = messages.filter(m => m.speaker === 'user');
    const allUserText = userMessages.map(m => m.text).join(' ');

    const financialData = this.extractFinancialData(userMessages);
    const userProfile = this.extractUserProfile(userMessages);

    return { financialData, userProfile };
  }

  /**
   * Extract financial data from messages
   */
  extractFinancialData(messages: ConversationMessage[]): ExtractedFinancialData {
    const income = this.extractIncome(messages);
    const expenses = this.extractExpenses(messages);
    const goals = this.extractGoals(messages);
    const debts = this.extractDebts(messages);

    // Calculate total expenses
    const totalExpenses = Object.values(expenses).reduce((sum, val) => sum + (val || 0), 0);
    expenses.total = totalExpenses;

    return {
      income,
      expenses,
      goals,
      debts
    };
  }

  /**
   * Extract user profile information
   */
  extractUserProfile(messages: ConversationMessage[]): UserProfile {
    const allText = messages.map(m => m.text).join(' ');
    
    const profile: UserProfile = {};

    // Extract name (if mentioned)
    const nameMatch = allText.match(/(?:my\s*name\s*is|I'm|I\s*am|call\s*me)\s*([A-Z][a-z]+)/);
    if (nameMatch) {
      profile.name = nameMatch[1];
    }

    // Extract age
    for (const pattern of LIFESTYLE_PATTERNS.age) {
      const match = pattern.exec(allText);
      if (match && match[1]) {
        profile.age = match[1];
        break;
      }
    }

    // Extract location
    for (const pattern of LIFESTYLE_PATTERNS.location) {
      const match = pattern.exec(allText);
      if (match && match[1]) {
        profile.location = match[1].trim();
        break;
      }
    }

    // Extract occupation
    for (const pattern of LIFESTYLE_PATTERNS.occupation) {
      const match = pattern.exec(allText);
      if (match && match[1]) {
        profile.occupation = match[1].trim();
        break;
      }
    }

    // Extract lifestyle preferences from conversation
    profile.lifestyle = this.extractLifestylePreferences(messages);

    return profile;
  }

  /**
   * Extract income information
   */
  private extractIncome(messages: ConversationMessage[]): ExtractedFinancialData['income'] {
    const allText = messages.map(m => m.text).join(' ');
    let monthlyIncome: number | undefined;
    let annualIncome: number | undefined;
    let source: string | undefined;

    // Check annual patterns first (usually more accurate)
    for (const pattern of INCOME_PATTERNS.annual) {
      const matches = allText.match(pattern);
      if (matches && matches.length > 1) {
        const amount = normalizeAmount(matches[1]);
        annualIncome = amount;
        monthlyIncome = amount / 12;
        break;
      }
    }

    // If no annual, check monthly
    if (!monthlyIncome) {
      for (const pattern of INCOME_PATTERNS.monthly) {
        const matches = allText.match(pattern);
        if (matches && matches.length > 1) {
          monthlyIncome = normalizeAmount(matches[1]);
          annualIncome = monthlyIncome * 12;
          break;
        }
      }
    }

    // Check other frequencies
    if (!monthlyIncome) {
      const frequencies = ['biweekly', 'weekly', 'hourly'] as const;
      for (const freq of frequencies) {
        for (const pattern of INCOME_PATTERNS[freq]) {
          const matches = allText.match(pattern);
          if (matches && matches.length > 1) {
            const amount = normalizeAmount(matches[1]);
            monthlyIncome = convertToMonthly(amount, freq);
            annualIncome = monthlyIncome * 12;
            source = `${freq} income`;
            break;
          }
        }
        if (monthlyIncome) break;
      }
    }

    return {
      monthly: monthlyIncome,
      annual: annualIncome,
      source
    };
  }

  /**
   * Extract expense information
   */
  private extractExpenses(messages: ConversationMessage[]): ExtractedFinancialData['expenses'] {
    const allText = messages.map(m => m.text).join(' ');
    const expenses: ExtractedFinancialData['expenses'] = {};

    // Map expense categories to profile categories
    const categoryMap: { [key: string]: keyof ExtractedFinancialData['expenses'] } = {
      'rent': 'housing',
      'mortgage': 'housing',
      'groceries': 'food',
      'dining': 'food',
      'transportation': 'transport',
      'utilities': 'other',
      'insurance': 'other',
      'subscriptions': 'subscriptions',
      'entertainment': 'entertainment'
    };

    for (const [category, patterns] of Object.entries(EXPENSE_PATTERNS)) {
      for (const pattern of patterns) {
        const matches = allText.match(pattern);
        if (matches && matches.length > 1) {
          const amount = normalizeAmount(matches[1]);
          const mappedCategory = categoryMap[category] || 'other';
          
          // Add to existing amount if category already has value
          if (expenses[mappedCategory]) {
            expenses[mappedCategory] = (expenses[mappedCategory] || 0) + amount;
          } else {
            expenses[mappedCategory] = amount;
          }
          break;
        }
      }
    }

    return expenses;
  }

  /**
   * Extract financial goals
   */
  private extractGoals(messages: ConversationMessage[]): ExtractedFinancialData['goals'] {
    const allText = messages.map(m => m.text).join(' ');
    const goals: ExtractedFinancialData['goals'] = {
      shortTerm: [],
      longTerm: []
    };

    // Check for emergency fund (usually short-term)
    if (GOAL_PATTERNS.emergency.some(pattern => pattern.test(allText))) {
      goals.shortTerm?.push('Build emergency fund');
    }

    // Check for vacation (usually short-term)
    if (GOAL_PATTERNS.vacation.some(pattern => pattern.test(allText))) {
      goals.shortTerm?.push('Save for vacation');
    }

    // Check for retirement (long-term)
    if (GOAL_PATTERNS.retirement.some(pattern => pattern.test(allText))) {
      goals.longTerm?.push('Retirement planning');
    }

    // Check for house purchase (long-term)
    if (GOAL_PATTERNS.house.some(pattern => pattern.test(allText))) {
      goals.longTerm?.push('Buy a house');
    }

    // Check for education
    if (GOAL_PATTERNS.education.some(pattern => pattern.test(allText))) {
      goals.shortTerm?.push('Education/Training');
    }

    // Check for business
    if (GOAL_PATTERNS.business.some(pattern => pattern.test(allText))) {
      goals.longTerm?.push('Start a business');
    }

    // Check for investment
    if (GOAL_PATTERNS.investment.some(pattern => pattern.test(allText))) {
      goals.longTerm?.push('Build investment portfolio');
    }

    // Extract savings amount if mentioned
    const savingsPattern = /(?:save|saving|put\s*away|set\s*aside).*?\$?([\d,]+)\s*(?:per|\/|\s)\s*month/gi;
    const savingsMatch = savingsPattern.exec(allText);
    if (savingsMatch) {
      goals.savings = normalizeAmount(savingsMatch[1]);
    }

    return goals;
  }

  /**
   * Extract debt information
   */
  private extractDebts(messages: ConversationMessage[]): ExtractedFinancialData['debts'] {
    const allText = messages.map(m => m.text).join(' ');
    const debts: ExtractedFinancialData['debts'] = {
      items: []
    };

    let totalDebt = 0;

    // Check for different types of debt
    for (const [debtType, patterns] of Object.entries(DEBT_PATTERNS)) {
      for (const pattern of patterns) {
        const matches = allText.match(pattern);
        if (matches && matches.length > 1) {
          const amount = normalizeAmount(matches[1]);
          
          if (debtType === 'totalDebt') {
            debts.total = amount;
          } else {
            debts.items?.push({
              type: debtType.replace(/([A-Z])/g, ' $1').trim(),
              amount
            });
            totalDebt += amount;
          }
          break;
        }
      }
    }

    // If no total was explicitly mentioned, calculate from items
    if (!debts.total && totalDebt > 0) {
      debts.total = totalDebt;
    }

    return debts;
  }

  /**
   * Extract lifestyle preferences
   */
  private extractLifestylePreferences(messages: ConversationMessage[]): UserProfile['lifestyle'] {
    const lifestyle: UserProfile['lifestyle'] = {};
    
    // This would be enhanced with more sophisticated NLP
    // For now, create basic structure that can be filled by conversation
    const categories = ['housing', 'food', 'transport', 'fitness', 'entertainment', 'subscriptions', 'travel'];
    
    for (const category of categories) {
      lifestyle[category as keyof typeof lifestyle] = {
        preference: '',
        details: ''
      };
    }

    return lifestyle;
  }

  /**
   * Validate extracted data
   */
  validateData(data: ExtractedFinancialData): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if income makes sense
    if (data.income.monthly && data.income.monthly < 500) {
      warnings.push('Monthly income seems very low. Please verify.');
    }
    if (data.income.monthly && data.income.monthly > 100000) {
      warnings.push('Monthly income seems very high. Please verify.');
    }

    // Check if expenses exceed income
    if (data.income.monthly && data.expenses.total) {
      if (data.expenses.total > data.income.monthly) {
        warnings.push('Monthly expenses exceed monthly income.');
      }
    }

    // Check for missing critical data
    if (!data.income.monthly && !data.income.annual) {
      errors.push('No income information found.');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}