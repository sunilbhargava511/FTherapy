/**
 * Reusable conversation status display component
 */

'use client';

import { ReactNode } from 'react';

export interface ConversationStatusProps {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  sessionDuration?: string;
  currentStatus?: string;
  className?: string;
  showDuration?: boolean;
  showDetailedStatus?: boolean;
  // Custom status messages
  messages?: {
    connecting?: string;
    connected?: string;
    disconnected?: string;
    error?: string;
  };
  // Icon components
  ConnectedIcon?: React.ComponentType<{ className?: string }>;
  ConnectingIcon?: React.ComponentType<{ className?: string }>;
  ErrorIcon?: React.ComponentType<{ className?: string }>;
  // Custom children for additional status info
  children?: ReactNode;
}

export function ConversationStatus({
  isConnected,
  isConnecting,
  error,
  sessionDuration = '00:00',
  currentStatus,
  className = '',
  showDuration = true,
  showDetailedStatus = false,
  messages = {},
  ConnectedIcon = DefaultConnectedIcon,
  ConnectingIcon = DefaultConnectingIcon,
  ErrorIcon = DefaultErrorIcon,
  children
}: ConversationStatusProps) {
  const defaultMessages = {
    connecting: 'Connecting to AI...',
    connected: 'Connected - Ready to talk!',
    disconnected: 'Click to start conversation',
    error: 'Connection error occurred',
    ...messages
  };

  const getStatusInfo = () => {
    if (error) {
      return {
        type: 'error' as const,
        message: currentStatus || defaultMessages.error,
        icon: ErrorIcon,
        className: 'bg-red-50 text-red-700 border-red-200'
      };
    }
    
    if (isConnecting) {
      return {
        type: 'connecting' as const,
        message: currentStatus || defaultMessages.connecting,
        icon: ConnectingIcon,
        className: 'bg-blue-50 text-blue-700 border-blue-200'
      };
    }
    
    if (isConnected) {
      return {
        type: 'connected' as const,
        message: currentStatus || defaultMessages.connected,
        icon: ConnectedIcon,
        className: 'bg-green-50 text-green-700 border-green-200'
      };
    }
    
    return {
      type: 'disconnected' as const,
      message: currentStatus || defaultMessages.disconnected,
      icon: null,
      className: 'bg-gray-50 text-gray-700 border-gray-200'
    };
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      {/* Main Status Badge */}
      <div className={`
        flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium
        ${statusInfo.className}
        ${isConnecting ? 'animate-pulse' : ''}
      `}>
        {StatusIcon && (
          <StatusIcon className={`w-4 h-4 ${isConnecting ? 'animate-spin' : ''}`} />
        )}
        <span>{statusInfo.message}</span>
      </div>

      {/* Session Duration */}
      {showDuration && isConnected && (
        <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span>Session: {sessionDuration}</span>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm max-w-sm">
          <ErrorIcon className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Detailed Status */}
      {showDetailedStatus && (
        <div className="flex flex-col items-center gap-1 text-xs text-gray-500 text-center max-w-xs">
          {statusInfo.type === 'disconnected' && (
            <p>Click the microphone button to start a voice conversation</p>
          )}
          {statusInfo.type === 'connecting' && (
            <p>Establishing connection and requesting microphone access...</p>
          )}
          {statusInfo.type === 'connected' && (
            <p>Speak naturally - your conversation is being processed in real-time</p>
          )}
          {statusInfo.type === 'error' && (
            <p>Please check your connection and try again</p>
          )}
        </div>
      )}

      {/* Custom children */}
      {children}
    </div>
  );
}

// Default icon components
function DefaultConnectedIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
    </svg>
  );
}

function DefaultConnectingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function DefaultErrorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
    </svg>
  );
}