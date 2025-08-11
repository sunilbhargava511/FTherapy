/**
 * Reusable conversation button component with visual states
 */

'use client';

import { ReactNode } from 'react';

export interface ConversationButtonProps {
  isConnected: boolean;
  isConnecting: boolean;
  onStart: () => void;
  onEnd: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'minimal' | 'floating';
  className?: string;
  children?: ReactNode;
  // Icon components (you can pass your own icons)
  ConnectIcon?: React.ComponentType<{ className?: string }>;
  DisconnectIcon?: React.ComponentType<{ className?: string }>;
  LoadingIcon?: React.ComponentType<{ className?: string }>;
}

export function ConversationButton({
  isConnected,
  isConnecting,
  onStart,
  onEnd,
  disabled = false,
  size = 'md',
  variant = 'default',
  className = '',
  children,
  ConnectIcon = DefaultConnectIcon,
  DisconnectIcon = DefaultDisconnectIcon,
  LoadingIcon = DefaultLoadingIcon
}: ConversationButtonProps) {
  const handleClick = () => {
    if (isConnecting || disabled) return;
    
    if (isConnected) {
      onEnd();
    } else {
      onStart();
    }
  };

  const sizeClasses = {
    sm: 'w-16 h-16 text-sm',
    md: 'w-24 h-24 text-base',
    lg: 'w-32 h-32 text-lg'
  };

  const variantClasses = {
    default: 'rounded-full shadow-lg',
    minimal: 'rounded-lg border-2',
    floating: 'rounded-full shadow-2xl'
  };

  const baseClasses = `
    relative flex items-center justify-center font-medium transition-all duration-200 
    transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-opacity-50
    ${sizeClasses[size]} ${variantClasses[variant]}
    ${disabled || isConnecting ? 'opacity-75 cursor-not-allowed' : 'cursor-pointer'}
  `;

  const stateClasses = isConnected
    ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white focus:ring-red-300'
    : isConnecting
      ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white focus:ring-yellow-300'
      : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white focus:ring-green-300';

  return (
    <div className="relative">
      {/* Animated rings for connected state */}
      {isConnected && variant === 'floating' && (
        <>
          <div className="absolute inset-0 w-full h-full rounded-full bg-green-400 opacity-20 animate-ping" />
          <div className="absolute inset-0 w-full h-full rounded-full bg-green-400 opacity-10 animate-ping" 
               style={{ animationDelay: '0.2s' }} />
        </>
      )}
      
      <button
        onClick={handleClick}
        disabled={disabled || isConnecting}
        className={`${baseClasses} ${stateClasses} ${className}`}
        aria-label={
          isConnecting 
            ? 'Connecting...' 
            : isConnected 
              ? 'End conversation'
              : 'Start conversation'
        }
      >
        <div className="flex flex-col items-center gap-2">
          {isConnecting ? (
            <LoadingIcon className="w-8 h-8 animate-spin" />
          ) : isConnected ? (
            <DisconnectIcon className="w-8 h-8" />
          ) : (
            <ConnectIcon className="w-8 h-8" />
          )}
          
          {children && (
            <span className="text-xs font-medium opacity-90">
              {children}
            </span>
          )}
        </div>

        {/* Connection indicator */}
        {isConnected && (
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
            <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
          </div>
        )}
      </button>
    </div>
  );
}

// Default icon components (replace with your preferred icons)
function DefaultConnectIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
  );
}

function DefaultDisconnectIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M6 6h12v12H6z" />
    </svg>
  );
}

function DefaultLoadingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}