import { NextRequest, NextResponse } from 'next/server';
import { getSessionReport, getSessionUserMessages } from '@/lib/session-storage';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('id');

  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
  }

  // Set up Server-Sent Events
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      let lastMessageCount = 0;
      let reportSent = false; // Track if report has already been sent
      
      // Send initial connection
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'connected', sessionId })}\n\n`)
      );

      // Check for new data periodically
      const checkForUpdates = async () => {
        try {
          // Check for new user messages (await async function)
          const messages = await getSessionUserMessages(sessionId);
          
          // Enhanced logging for debugging
          if (messages.length !== lastMessageCount) {
            console.log('📡 SSE new messages detected. SessionId:', sessionId, 'Messages:', messages.length, 'Previous:', lastMessageCount);
            console.log('📡 SSE message details:', messages.map((m: any) => ({ 
              timestamp: m.timestamp, 
              messagePreview: m.message?.substring(0, 30) + '...' 
            })));
          } else if (messages.length === 0) {
            console.log('📡 SSE no messages found for session:', sessionId);
          }
          
          if (messages.length > lastMessageCount) {
            // Send only new messages
            const newMessages = messages.slice(lastMessageCount);
            console.log('📤 SSE sending', newMessages.length, 'new messages to client');
            newMessages.forEach((msg: any) => {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ 
                  type: 'user_message', 
                  message: msg.message,
                  timestamp: msg.timestamp
                })}\n\n`)
              );
            });
            lastMessageCount = messages.length;
          }
          
          // Check for report (only send once, await async function)
          if (!reportSent) {
            const report = await getSessionReport(sessionId);
            if (report) {
              console.log('📊 SSE sending report for session:', sessionId);
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ 
                  type: 'show_report', 
                  report 
                })}\n\n`)
              );
              reportSent = true; // Mark as sent to avoid spam
            }
          }
        } catch (error) {
          console.error('SSE checkForUpdates error:', error);
          // Continue running even if there's an error
        }
      };

      // Check every 1 second for updates (faster for real-time feel)
      const interval = setInterval(() => {
        // Only run if controller is not closed
        try {
          checkForUpdates();
        } catch (error) {
          console.error('SSE interval error:', error);
          clearInterval(interval);
        }
      }, 1000);

      // Cleanup after 10 minutes
      setTimeout(() => {
        clearInterval(interval);
        try {
          controller.close();
        } catch (error) {
          // Controller might already be closed
          console.log('SSE controller already closed during cleanup');
        }
      }, 600000);

      return () => {
        clearInterval(interval);
      };
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}