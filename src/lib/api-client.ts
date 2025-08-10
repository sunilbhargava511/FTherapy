/**
 * Centralized API client utilities
 * Provides consistent error handling, request formatting, and response parsing
 */

export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public statusText: string,
    public response?: Response
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export interface APIRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
}

export interface APIResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
}

/**
 * Base API client with consistent error handling
 */
export class APIClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;

  constructor(baseURL = '', defaultHeaders: Record<string, string> = {}) {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...defaultHeaders
    };
  }

  /**
   * Make an API request with consistent error handling
   */
  async request<T = unknown>(
    endpoint: string, 
    options: APIRequestOptions = {}
  ): Promise<APIResponse<T>> {
    const {
      method = 'GET',
      headers = {},
      body,
      timeout = 30000
    } = options;

    const url = `${this.baseURL}${endpoint}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: { ...this.defaultHeaders, ...headers },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new APIError(
          errorText || `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          response.statusText,
          response
        );
      }

      const data = await response.json();
      
      return {
        data,
        status: response.status,
        statusText: response.statusText
      };
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof APIError) {
        throw error;
      }
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new APIError(`Request timeout after ${timeout}ms`, 408, 'Request Timeout');
      }
      
      throw new APIError(
        error instanceof Error ? error.message : 'Unknown error',
        0,
        'Network Error'
      );
    }
  }

  /**
   * GET request helper
   */
  async get<T = unknown>(endpoint: string, options?: Omit<APIRequestOptions, 'method'>): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  /**
   * POST request helper
   */
  async post<T = unknown>(endpoint: string, body?: unknown, options?: Omit<APIRequestOptions, 'method' | 'body'>): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body });
  }

  /**
   * PUT request helper
   */
  async put<T = unknown>(endpoint: string, body?: unknown, options?: Omit<APIRequestOptions, 'method' | 'body'>): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body });
  }

  /**
   * DELETE request helper
   */
  async delete<T = unknown>(endpoint: string, options?: Omit<APIRequestOptions, 'method'>): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

// Default API client instance
export const apiClient = new APIClient();

/**
 * Specialized API methods for common endpoints
 */
export const therapistAPI = {
  /**
   * Generate therapist response
   */
  async generateResponse(data: {
    therapistId: string;
    userInput: string;
    conversationContext?: string;
    currentTopic?: string;
  }) {
    return apiClient.post('/api/therapist-response', data);
  },

  /**
   * Generate voice response for therapist
   */
  async generateVoiceResponse(data: {
    therapistId: string;
    userMessage: string;
    conversationContext?: string;
    voiceSettings?: unknown;
  }) {
    return apiClient.post('/api/therapist-voice-response', data);
  }
};

export const notebookAPI = {
  /**
   * Create or restore notebook
   */
  async createOrRestore(data: { therapistId: string; clientName?: string }) {
    return apiClient.post('/api/notebooks', {
      action: 'create',
      ...data
    });
  },

  /**
   * Save notebook
   */
  async save(notebook: unknown) {
    return apiClient.post('/api/notebooks', {
      action: 'save',
      notebook
    });
  },

  /**
   * Generate reports for notebook
   */
  async generateReports(notebookId: string) {
    return apiClient.post('/api/notebooks', {
      action: 'generateReports',
      notebookId
    });
  },

  /**
   * Complete session
   */
  async completeSession(notebookId: string) {
    return apiClient.post('/api/notebooks', {
      action: 'complete',
      notebookId
    });
  },

  /**
   * Get notebook by ID
   */
  async getById(notebookId: string) {
    return apiClient.get(`/api/notebooks?id=${encodeURIComponent(notebookId)}`);
  },

  /**
   * List all notebooks
   */
  async list() {
    return apiClient.get('/api/notebooks');
  }
};

export const elevenLabsAPI = {
  /**
   * Get signed URL for ElevenLabs
   */
  async getSignedUrl(data: { agentId: string }) {
    return apiClient.post('/api/elevenlabs-signed-url', data);
  },

  /**
   * Convert text to speech
   */
  async textToSpeech(data: { text: string; voiceId: string; settings?: unknown }) {
    return apiClient.post('/api/elevenlabs-tts', data);
  },

  /**
   * Convert speech to text
   */
  async speechToText(data: { audio: Blob; model?: string }) {
    const formData = new FormData();
    formData.append('audio', data.audio);
    if (data.model) formData.append('model', data.model);

    return apiClient.request('/api/elevenlabs-stt', {
      method: 'POST',
      headers: {}, // Let browser set Content-Type for FormData
      body: formData as any
    });
  }
};

export const reportAPI = {
  /**
   * Generate financial report
   */
  async generateFinancialReport(profile: unknown) {
    return apiClient.post('/api/generate-financial-report', { profile });
  },

  /**
   * Generate qualitative report
   */
  async generateQualitativeReport(data: { messages: unknown[]; userProfile: unknown }) {
    return apiClient.post('/api/notebooks/generate-qualitative-report', data);
  }
};