import { UserProfile } from './types';

export interface LifestyleProgress {
  housing: '○' | '✓';
  food: '○' | '✓';
  transport: '○' | '✓';
  fitness: '○' | '✓';
  entertainment: '○' | '✓';
  subscriptions: '○' | '✓';
  travel: '○' | '✓';
  basics: '○' | '✓';
  completed: number;
  total: number;
}

/**
 * Calculate lifestyle progress based on user profile data
 */
export function getLifestyleProgress(userProfile: UserProfile | null): LifestyleProgress {
  const defaultProgress: LifestyleProgress = {
    housing: '○',
    food: '○',
    transport: '○',
    fitness: '○',
    entertainment: '○',
    subscriptions: '○',
    travel: '○',
    basics: '○',
    completed: 0,
    total: 8
  };
  
  if (!userProfile) return defaultProgress;
  
  const progress = {
    housing: userProfile.lifestyle?.housing?.preference ? '✓' as const : '○' as const,
    food: userProfile.lifestyle?.food?.preference ? '✓' as const : '○' as const,
    transport: userProfile.lifestyle?.transport?.preference ? '✓' as const : '○' as const,
    fitness: userProfile.lifestyle?.fitness?.preference ? '✓' as const : '○' as const,
    entertainment: userProfile.lifestyle?.entertainment?.preference ? '✓' as const : '○' as const,
    subscriptions: userProfile.lifestyle?.subscriptions?.preference ? '✓' as const : '○' as const,
    travel: userProfile.lifestyle?.travel?.preference ? '✓' as const : '○' as const,
    basics: (userProfile.name && userProfile.age && userProfile.location) ? '✓' as const : '○' as const
  };
  
  const completed = Object.values(progress).filter(v => v === '✓').length;
  const total = Object.keys(progress).length;
  
  return { ...progress, completed, total };
}