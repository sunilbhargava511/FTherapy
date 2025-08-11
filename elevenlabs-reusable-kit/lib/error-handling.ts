/**
 * Reusable error handling utilities for ElevenLabs integration
 */

import { ConversationError } from '../types/elevenlabs';

export class RetryManager {
  private maxRetries: number;
  private baseDelay: number;
  private maxDelay: number;
  private retryCount: number = 0;

  constructor(
    maxRetries: number = 3,
    baseDelay: number = 1000,
    maxDelay: number = 30000
  ) {
    this.maxRetries = maxRetries;
    this.baseDelay = baseDelay;
    this.maxDelay = maxDelay;
  }

  async execute<T>(
    operation: () => Promise<T>,
    shouldRetry: (error: any) => boolean = () => true
  ): Promise<T> {
    this.retryCount = 0;

    while (this.retryCount <= this.maxRetries) {
      try {
        const result = await operation();
        this.retryCount = 0; // Reset on success
        return result;
      } catch (error) {
        this.retryCount++;

        if (this.retryCount > this.maxRetries || !shouldRetry(error)) {
          throw error;
        }

        const delay = Math.min(
          this.baseDelay * Math.pow(2, this.retryCount - 1),
          this.maxDelay
        );

        console.log(
          `Retry ${this.retryCount}/${this.maxRetries} after ${delay}ms delay`
        );

        await this.delay(delay);
      }
    }

    throw new Error('Max retries exceeded');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  reset(): void {
    this.retryCount = 0;
  }

  getRetryCount(): number {
    return this.retryCount;
  }
}

export class ConversationErrorHandler {
  private retryManager: RetryManager;
  private onError?: (error: ConversationError) => void;
  private onRetry?: (attempt: number, error: ConversationError) => void;

  constructor(options: {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
    onError?: (error: ConversationError) => void;
    onRetry?: (attempt: number, error: ConversationError) => void;
  } = {}) {
    this.retryManager = new RetryManager(
      options.maxRetries,
      options.baseDelay,
      options.maxDelay
    );
    this.onError = options.onError;
    this.onRetry = options.onRetry;
  }

  parseError(errorMessage: string): ConversationError {
    const errorLower = errorMessage.toLowerCase();
    
    if (errorLower.includes('silence') || errorLower.includes('no audio')) {
      return {
        type: 'AUDIO_SILENCE',
        message: 'No speech detected. Please check your microphone and try again.',
        shouldRetry: false
      };
    }
    
    if (errorLower.includes('timeout')) {
      return {
        type: 'TIMEOUT',
        message: 'Connection timed out. Attempting to reconnect...',
        shouldRetry: true,
        retryDelay: 5000
      };
    }
    
    if (errorLower.includes('network') || errorLower.includes('connection')) {
      return {
        type: 'NETWORK',
        message: 'Network connection lost. Attempting to reconnect...',
        shouldRetry: true,
        retryDelay: 3000
      };
    }
    
    if (errorLower.includes('disconnect')) {
      return {
        type: 'DISCONNECT',
        message: 'Connection was interrupted. Attempting to reconnect...',
        shouldRetry: true,
        retryDelay: 2000
      };
    }
    
    if (errorLower.includes('permission') || errorLower.includes('microphone')) {
      return {
        type: 'PERMISSION',
        message: 'Microphone permission is required for voice conversations.',
        shouldRetry: false
      };
    }
    
    return {
      type: 'UNKNOWN',
      message: `Conversation error: ${errorMessage}`,
      shouldRetry: false
    };
  }

  async handleWithRetry<T>(
    operation: () => Promise<T>,
    errorMessage: string
  ): Promise<T> {
    const conversationError = this.parseError(errorMessage);
    this.onError?.(conversationError);

    if (!conversationError.shouldRetry) {
      throw new Error(conversationError.message);
    }

    return this.retryManager.execute(
      operation,
      (error) => {
        const parsed = this.parseError(error.message || error.toString());
        this.onRetry?.(this.retryManager.getRetryCount(), parsed);
        return parsed.shouldRetry;
      }
    );
  }
}

export class KeepAliveManager {
  private intervalId: NodeJS.Timeout | null = null;
  private sessionStartTime: Date | null = null;
  private onKeepAlive?: () => void;
  private onWarning?: (minutesRemaining: number) => void;
  private onTimeout?: () => void;

  constructor(options: {
    intervalMs?: number;
    warningMinutes?: number[];
    maxSessionMinutes?: number;
    onKeepAlive?: () => void;
    onWarning?: (minutesRemaining: number) => void;
    onTimeout?: () => void;
  } = {}) {
    this.onKeepAlive = options.onKeepAlive;
    this.onWarning = options.onWarning;
    this.onTimeout = options.onTimeout;
  }

  start(sessionStartTime?: Date): void {
    this.sessionStartTime = sessionStartTime || new Date();
    
    this.intervalId = setInterval(() => {
      this.checkSession();
    }, 5000); // Check every 5 seconds
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.sessionStartTime = null;
  }

  private checkSession(): void {
    if (!this.sessionStartTime) return;

    const now = new Date();
    const sessionDurationMs = now.getTime() - this.sessionStartTime.getTime();
    const sessionMinutes = Math.floor(sessionDurationMs / 60000);
    const sessionSeconds = Math.floor((sessionDurationMs % 60000) / 1000);

    // Send keep-alive at 4:30 and 9:30 to prevent 5-minute and 10-minute timeouts
    if ((sessionMinutes === 4 && sessionSeconds === 30) ||
        (sessionMinutes === 9 && sessionSeconds === 30)) {
      console.log(`Sending keep-alive at ${sessionMinutes}:${sessionSeconds.toString().padStart(2, '0')}`);
      this.onKeepAlive?.();
    }

    // Send warnings before session limits
    const warningPoints = [
      { minutes: 4, remaining: 1 }, // 1 minute before 5-minute limit
      { minutes: 9, remaining: 1 }, // 1 minute before 10-minute limit
      { minutes: 14, remaining: 1 }  // 1 minute before 15-minute limit
    ];

    for (const warning of warningPoints) {
      if (sessionMinutes === warning.minutes && sessionSeconds === 45) {
        this.onWarning?.(warning.remaining);
      }
    }

    // Handle session timeout (if configured)
    const maxMinutes = 30; // Default max session
    if (sessionMinutes >= maxMinutes) {
      console.log(`Session timeout reached: ${maxMinutes} minutes`);
      this.onTimeout?.();
      this.stop();
    }
  }

  getSessionDuration(): string {
    if (!this.sessionStartTime) return '00:00';

    const now = new Date();
    const durationMs = now.getTime() - this.sessionStartTime.getTime();
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
}

// Utility function to create a comprehensive error handler
export function createErrorHandler(options: {
  maxRetries?: number;
  enableKeepAlive?: boolean;
  onError?: (error: ConversationError) => void;
  onRetry?: (attempt: number) => void;
  onKeepAlive?: () => void;
  onWarning?: (minutesRemaining: number) => void;
} = {}) {
  const errorHandler = new ConversationErrorHandler({
    maxRetries: options.maxRetries || 3,
    onError: options.onError,
    onRetry: options.onRetry ? (attempt, error) => options.onRetry!(attempt) : undefined
  });

  const keepAliveManager = options.enableKeepAlive ? new KeepAliveManager({
    onKeepAlive: options.onKeepAlive,
    onWarning: options.onWarning
  }) : null;

  return {
    errorHandler,
    keepAliveManager,
    
    handleError: (errorMessage: string) => errorHandler.parseError(errorMessage),
    
    startSession: (sessionStartTime?: Date) => {
      if (keepAliveManager) {
        keepAliveManager.start(sessionStartTime);
      }
    },
    
    endSession: () => {
      if (keepAliveManager) {
        keepAliveManager.stop();
      }
    },
    
    getSessionDuration: () => {
      return keepAliveManager?.getSessionDuration() || '00:00';
    }
  };
}