// Shared session storage utility for both webhook endpoints
// Uses Phase 1 ServerFileStorage for persistence across serverless functions

import { ServerFileStorage } from '@/services/storage/ServerFileStorage';

// Session-related types
export interface SessionMessage {
  timestamp: string;
  message: string;
  speaker: 'user' | 'agent';
}

export interface SessionData {
  sessionId?: string;
  therapistId?: string;
  registeredAt?: string;
  [key: string]: unknown;
}

export interface SessionReport {
  id: string;
  generated: string;
  data: unknown;
  [key: string]: unknown;
}

// Initialize persistent storage
const storage = new ServerFileStorage();

export async function addSessionUserMessage(sessionId: string, message: string): Promise<void> {
  const key = `sessions/messages_${sessionId}`;
  const messages = await storage.load<SessionMessage[]>(key) || [];
  messages.push({
    timestamp: new Date().toISOString(),
    message: message,
    speaker: 'user'
  });
  await storage.save<SessionMessage[]>(key, messages);
}

export async function getSessionUserMessages(sessionId: string): Promise<SessionMessage[]> {
  return await storage.load<SessionMessage[]>(`sessions/messages_${sessionId}`) || [];
}

export async function getSessionData(sessionId: string): Promise<SessionData | null> {
  const data = await storage.load<SessionData>(`sessions/${sessionId}`);
  return data;
}

export async function setSessionData(sessionId: string, data: SessionData): Promise<void> {
  await storage.save<SessionData>(`sessions/${sessionId}`, data);
  
  // Verify the save worked
  const verification = await storage.load<SessionData>(`sessions/${sessionId}`);
}

export async function getSessionReport(sessionId: string): Promise<SessionReport | null> {
  return await storage.load<SessionReport>(`sessions/report_${sessionId}`);
}

export async function setSessionReport(sessionId: string, report: SessionReport): Promise<void> {
  await storage.save<SessionReport>(`sessions/report_${sessionId}`, report);
}

// Helper function to resolve session ID using registry with retry logic
export async function resolveSessionId(maxRetries: number = 3, retryDelay: number = 100): Promise<{ sessionId: string; therapistId: string } | null> {
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Get latest session directly from our persistent storage
      const latestSession = await getSessionData('registry_latest');
      
      if (latestSession) {
        const ageSeconds = Math.floor((Date.now() - new Date(latestSession.registeredAt || Date.now()).getTime()) / 1000);
        
        return {
          sessionId: latestSession.frontendSessionId as string,
          therapistId: latestSession.therapistId as string
        };
      } else if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        retryDelay *= 2; // Exponential backoff
      } else {
        console.log('⚠️ No registered session found after all retries');
      }
    } catch (error) {
      console.error(`Error resolving session ID (attempt ${attempt}):`, error);
      if (attempt === maxRetries) {
        return null;
      }
    }
  }
  
  return null;
}

// Utility function to get session by ID
export async function getSessionById(sessionId: string) {
  return await getSessionData(`registry_${sessionId}`);
}