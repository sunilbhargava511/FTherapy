/**
 * Regular expression patterns for extracting financial data from conversations
 */

export const INCOME_PATTERNS = {
  annual: [
    /\$?([\d,]+)\s*(?:per|\/|\s)\s*(?:year|yr|annual|annually)/gi,
    /(?:yearly|annual)\s*(?:income|salary|pay|earning).*?\$?([\d,]+)/gi,
    /(?:make|earn|get|receive).*?\$?([\d,]+)\s*(?:a|per)\s*year/gi,
    /\$?([\d,]+)k\s*(?:per|\/|\s)?\s*(?:year|yr|annual|annually)/gi, // Handles "100k per year"
  ],
  monthly: [
    /\$?([\d,]+)\s*(?:per|\/|\s)\s*(?:month|mo|monthly)/gi,
    /(?:monthly|month)\s*(?:income|salary|pay|earning).*?\$?([\d,]+)/gi,
    /(?:make|earn|get|receive).*?\$?([\d,]+)\s*(?:a|per|each)\s*month/gi,
    /\$?([\d,]+)k\s*(?:per|\/|\s)?\s*(?:month|mo)/gi, // Handles "10k per month"
  ],
  biweekly: [
    /\$?([\d,]+)\s*(?:bi-?weekly|every\s*(?:two|2)\s*weeks|biweekly)/gi,
    /(?:paid|pay).*?(?:bi-?weekly|every\s*(?:two|2)\s*weeks).*?\$?([\d,]+)/gi,
  ],
  weekly: [
    /\$?([\d,]+)\s*(?:per|\/|\s)\s*(?:week|wk|weekly)/gi,
    /(?:weekly|week)\s*(?:income|salary|pay|earning).*?\$?([\d,]+)/gi,
  ],
  hourly: [
    /\$?([\d,]+)\s*(?:per|\/|\s)\s*(?:hour|hr|hourly)/gi,
    /(?:hourly|hour)\s*(?:rate|wage|pay).*?\$?([\d,]+)/gi,
  ]
};

export const EXPENSE_PATTERNS = {
  rent: [
    /(?:rent|rental).*?\$?([\d,]+)/gi,
    /\$?([\d,]+).*?(?:rent|rental)/gi,
    /(?:pay|paying|spend).*?\$?([\d,]+).*?(?:rent|rental)/gi,
  ],
  mortgage: [
    /(?:mortgage).*?\$?([\d,]+)/gi,
    /\$?([\d,]+).*?(?:mortgage)/gi,
    /(?:pay|paying).*?\$?([\d,]+).*?(?:mortgage)/gi,
  ],
  groceries: [
    /(?:groceries|grocery|food\s*shop).*?\$?([\d,]+)/gi,
    /\$?([\d,]+).*?(?:groceries|grocery|food\s*shop)/gi,
    /(?:spend|spending).*?\$?([\d,]+).*?(?:groceries|grocery|food)/gi,
  ],
  dining: [
    /(?:dining|restaurant|eat\s*out|takeout|delivery).*?\$?([\d,]+)/gi,
    /\$?([\d,]+).*?(?:dining|restaurant|eat\s*out|takeout)/gi,
  ],
  transportation: [
    /(?:car|vehicle|auto|transport|commute|gas|fuel|uber|lyft|taxi).*?\$?([\d,]+)/gi,
    /\$?([\d,]+).*?(?:car|vehicle|transport|gas|uber|lyft)/gi,
  ],
  utilities: [
    /(?:utilities|utility|electric|gas|water|power|internet|phone).*?\$?([\d,]+)/gi,
    /\$?([\d,]+).*?(?:utilities|utility|electric|water|internet)/gi,
  ],
  insurance: [
    /(?:insurance|health\s*insurance|car\s*insurance|life\s*insurance).*?\$?([\d,]+)/gi,
    /\$?([\d,]+).*?(?:insurance)/gi,
  ],
  subscriptions: [
    /(?:subscription|netflix|spotify|gym|membership).*?\$?([\d,]+)/gi,
    /\$?([\d,]+).*?(?:subscription|netflix|spotify|gym)/gi,
  ],
  entertainment: [
    /(?:entertainment|fun|hobby|hobbies|movie|concert|game).*?\$?([\d,]+)/gi,
    /\$?([\d,]+).*?(?:entertainment|fun|hobby)/gi,
  ],
  savings: [
    /(?:save|saving|savings|put\s*away|set\s*aside).*?\$?([\d,]+)/gi,
    /\$?([\d,]+).*?(?:save|saving|savings)/gi,
  ]
};

export const DEBT_PATTERNS = {
  creditCard: [
    /(?:credit\s*card|cc).*?(?:debt|balance|owe).*?\$?([\d,]+)/gi,
    /(?:owe|debt|balance).*?\$?([\d,]+).*?(?:credit\s*card|cc)/gi,
  ],
  studentLoan: [
    /(?:student\s*loan|student\s*debt|college\s*loan).*?\$?([\d,]+)/gi,
    /\$?([\d,]+).*?(?:student\s*loan|student\s*debt)/gi,
  ],
  carLoan: [
    /(?:car\s*loan|auto\s*loan|vehicle\s*loan).*?\$?([\d,]+)/gi,
    /\$?([\d,]+).*?(?:car\s*loan|auto\s*loan)/gi,
  ],
  personalLoan: [
    /(?:personal\s*loan|loan).*?\$?([\d,]+)/gi,
    /\$?([\d,]+).*?(?:personal\s*loan)/gi,
  ],
  totalDebt: [
    /(?:total\s*debt|all\s*debt|debt\s*total|altogether\s*owe).*?\$?([\d,]+)/gi,
    /\$?([\d,]+).*?(?:total\s*debt|in\s*debt)/gi,
  ]
};

export const GOAL_PATTERNS = {
  emergency: [
    /(?:emergency\s*fund|rainy\s*day|safety\s*net)/gi,
    /(?:save|need).*?(?:emergency|unexpected)/gi,
  ],
  retirement: [
    /(?:retire|retirement|401k|ira|pension)/gi,
    /(?:save|saving).*?(?:retire|retirement)/gi,
  ],
  house: [
    /(?:buy|purchase|save\s*for).*?(?:house|home|property|condo)/gi,
    /(?:down\s*payment|house\s*payment)/gi,
  ],
  vacation: [
    /(?:vacation|travel|trip|holiday)/gi,
    /(?:save|saving).*?(?:vacation|travel)/gi,
  ],
  education: [
    /(?:education|college|university|degree|course|certification)/gi,
    /(?:save|saving).*?(?:education|school)/gi,
  ],
  business: [
    /(?:start|launch|open).*?(?:business|company|startup)/gi,
    /(?:entrepreneur|self-employed)/gi,
  ],
  investment: [
    /(?:invest|investment|stock|bond|real\s*estate|crypto)/gi,
    /(?:grow|build).*?(?:wealth|portfolio)/gi,
  ]
};

export const LIFESTYLE_PATTERNS = {
  location: [
    /(?:live|living|located|based)\s*(?:in|at|near)\s*([A-Za-z\s,]+)/gi,
    /(?:from|in)\s*([A-Za-z\s,]+)(?:\s*city|\s*state|\s*area)?/gi,
  ],
  age: [
    /(?:I'm|I\s*am|age|aged)\s*(\d{1,3})/gi,
    /(\d{1,3})\s*(?:years?\s*old|yo)/gi,
  ],
  occupation: [
    /(?:work|working|job|career|profession|employed)\s*(?:as|in|at)\s*([A-Za-z\s]+)/gi,
    /(?:I'm|I\s*am)\s*(?:a|an)\s*([A-Za-z\s]+)(?:\s*by\s*profession)?/gi,
  ],
  family: [
    /(?:married|single|divorced|widowed)/gi,
    /(?:have|has)\s*(\d+)\s*(?:kid|child|children)/gi,
    /(?:family\s*of)\s*(\d+)/gi,
  ]
};

/**
 * Helper function to normalize extracted amounts
 */
export function normalizeAmount(amountStr: string): number {
  // Remove dollar signs and commas
  let cleaned = amountStr.replace(/[$,]/g, '');
  
  // Handle 'k' notation (e.g., "100k" -> 100000)
  if (cleaned.toLowerCase().endsWith('k')) {
    cleaned = cleaned.slice(0, -1);
    return parseFloat(cleaned) * 1000;
  }
  
  // Handle 'm' notation (e.g., "1.5m" -> 1500000)
  if (cleaned.toLowerCase().endsWith('m')) {
    cleaned = cleaned.slice(0, -1);
    return parseFloat(cleaned) * 1000000;
  }
  
  return parseFloat(cleaned) || 0;
}

/**
 * Convert any frequency to monthly for standardization
 */
export function convertToMonthly(amount: number, frequency: string): number {
  switch (frequency.toLowerCase()) {
    case 'annual':
    case 'yearly':
    case 'year':
      return amount / 12;
    case 'biweekly':
    case 'bi-weekly':
      return (amount * 26) / 12; // 26 bi-weekly periods per year
    case 'weekly':
    case 'week':
      return (amount * 52) / 12; // 52 weeks per year
    case 'daily':
    case 'day':
      return amount * 30; // Approximate month as 30 days
    case 'hourly':
    case 'hour':
      return amount * 160; // Assume 40 hours/week * 4 weeks
    default:
      return amount; // Assume monthly if not specified
  }
}