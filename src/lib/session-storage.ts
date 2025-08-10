// Shared session storage utility for both webhook endpoints
// Uses Phase 1 ServerFileStorage for persistence across serverless functions

import { ServerFileStorage } from '@/services/storage/ServerFileStorage';

// Initialize persistent storage
const storage = new ServerFileStorage();

export async function addSessionUserMessage(sessionId: string, message: string) {
  const key = `sessions/messages_${sessionId}`;
  const messages = await storage.load(key) || [];
  messages.push({
    timestamp: new Date().toISOString(),
    message: message,
    speaker: 'user'
  });
  await storage.save(key, messages);
}

export async function getSessionUserMessages(sessionId: string) {
  return await storage.load(`sessions/messages_${sessionId}`) || [];
}

export async function getSessionData(sessionId: string) {
  const data = await storage.load(`sessions/${sessionId}`);
  console.log('📖 Getting session data:', { key: sessionId, data, exists: !!data });
  return data;
}

export async function setSessionData(sessionId: string, data: any) {
  console.log('💾 Setting session data:', { key: sessionId, data });
  await storage.save(`sessions/${sessionId}`, data);
  
  // Verify the save worked
  const verification = await storage.load(`sessions/${sessionId}`);
  console.log('💾 Session storage verification after save:', { saved: !!verification });
}

export async function getSessionReport(sessionId: string) {
  return await storage.load(`sessions/report_${sessionId}`);
}

export async function setSessionReport(sessionId: string, report: any) {
  await storage.save(`sessions/report_${sessionId}`, report);
}

// Helper function to resolve session ID using registry with retry logic
export async function resolveSessionId(maxRetries: number = 3, retryDelay: number = 100): Promise<{ sessionId: string; therapistId: string } | null> {
  console.log('🔍 Resolving session ID...');
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Get latest session directly from our persistent storage
      const latestSession = await getSessionData('registry_latest');
      console.log(`🔍 Attempt ${attempt}/${maxRetries}: latestSession =`, latestSession);
      
      if (latestSession) {
        const ageSeconds = Math.floor((Date.now() - new Date(latestSession.registeredAt).getTime()) / 1000);
        console.log('✅ Found registered session:', {
          sessionId: latestSession.frontendSessionId,
          therapistId: latestSession.therapistId,
          age: ageSeconds + 's',
          attempt: attempt
        });
        
        return {
          sessionId: latestSession.frontendSessionId,
          therapistId: latestSession.therapistId
        };
      } else if (attempt < maxRetries) {
        console.log(`⏳ No session found on attempt ${attempt}/${maxRetries}, retrying in ${retryDelay}ms...`);
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