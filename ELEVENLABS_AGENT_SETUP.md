# ElevenLabs Agent Configuration Guide

## Overview
To complete the Conversation Mode setup, you need to configure an ElevenLabs Agent in the ElevenLabs console that will use your webhook for LLM responses.

## Steps to Configure Agent

### 1. Go to ElevenLabs Console
Visit: https://elevenlabs.io/app/conversational-ai

### 2. Create New Agent
- Click "Create Agent"
- Name: "FTherapy AI" (or your preferred name)

### 3. Configure Agent Settings

#### Basic Settings:
- **Name**: FTherapy AI
- **Description**: AI Financial Therapist
- **First Message**: "Hello! I'm here to help you understand and improve your financial habits. Let's start by getting to know you a little better. What's your name?"

#### Voice Settings:
- **Voice**: Choose from your existing voices (e.g., Dorothy for Danielle Town)
- **Stability**: 0.5
- **Similarity**: 0.5
- **Speed**: 1.0

#### LLM Configuration:
- **Provider**: Custom
- **Webhook URL**: `https://yourdomain.com/api/elevenlabs-webhook`
  - For local testing: Use ngrok or similar to expose localhost:3000
  - For production: Use your actual domain
- **Authentication**: Add your webhook secret if needed

#### System Prompt (Basic):
```
You are a financial therapist having a structured conversation to understand someone's financial habits and generate a comprehensive report. Follow this conversation flow:

1. Greeting and name
2. Age  
3. Interests/hobbies
4. Housing situation
5. Food preferences and spending
6. Transportation habits
7. Fitness and health spending
8. Entertainment preferences
9. Subscription services
10. Travel habits
11. Generate financial report and summary

Keep responses conversational, warm, and professional. Ask focused follow-up questions (maximum 3 topics per response) to get detailed information about spending amounts and habits. Keep questions simple and specific rather than overwhelming users with too many topics at once.
```

#### Advanced Settings (IMPORTANT):
In the **Advanced** tab of your agent configuration, you'll find critical timeout settings:

##### Session Duration / Max Conversation Time
- **Default**: 5 minutes (300 seconds)
- **Recommended**: 15-30 minutes for financial therapy sessions
- **Location**: Advanced tab → Conversation Settings → Max Duration or Session Timeout
- **Note**: This setting controls when the conversation automatically ends. The default 5-minute limit is too short for comprehensive financial discussions.

##### Other Important Advanced Settings:
- **Silence Timeout**: Time before agent assumes user is done speaking (default: 10 seconds)
- **Interruption Sensitivity**: How easily the agent can be interrupted
- **Turn Detection**: Controls conversation flow and speaking turns

### 4. Agent Variables (Optional)
Configure these variables to pass to your webhook:
- `therapist_id`: "danielle-town"
- `current_topic`: "intro"

### 5. Test Agent
1. Save the agent configuration
2. Copy the Agent ID to your `.env.local`:
   ```
   NEXT_PUBLIC_ELEVENLABS_AGENT_ID=your_agent_id_here
   ```

### 6. Webhook Configuration
Your webhook is already configured at `/api/elevenlabs-webhook` and will:
- Receive user messages from ElevenLabs
- Call Claude API for responses
- Handle topic progression
- Generate financial reports at the summary stage
- Return responses to ElevenLabs for TTS

## Testing Checklist

1. ✅ Agent responds to initial greeting
2. ✅ Progresses through conversation topics
3. ✅ Generates financial report at end
4. ✅ Handles Q&A about the report
5. ✅ Frontend shows report when generated
6. ✅ Download functionality works

## Troubleshooting

### Common Issues:
1. **Agent not responding**: Check webhook URL and authentication
2. **No report generated**: Verify conversation reaches summary stage
3. **Voice issues**: Check voice ID configuration in agent settings
4. **Frontend not showing report**: Check SSE connection and webhook response
5. **Conversation ends after 5 minutes**: 
   - This is the default session timeout in ElevenLabs
   - Go to Agent Settings → Advanced tab → Session Duration/Max Conversation Time
   - Increase from default 300 seconds (5 minutes) to 1800 seconds (30 minutes)
   - The app will show warnings at 4:30 and 9:30 marks

### Debug Logs:
Check your server logs for:
- Webhook requests from ElevenLabs
- Report generation attempts  
- SSE connection status
- Claude API calls

## Production Deployment Notes

1. **Webhook URL**: Must be HTTPS with valid SSL certificate
2. **Environment Variables**: Set NEXT_PUBLIC_ELEVENLABS_AGENT_ID in production
3. **Rate Limits**: Consider ElevenLabs and Claude API rate limits
4. **Session Storage**: Replace in-memory storage with Redis for production
5. **Error Handling**: Add comprehensive error logging and monitoring

## Current Status
- ✅ Webhook implementation complete
- ✅ Frontend integration complete  
- ✅ Report generation integrated
- ⏳ Agent configuration needed (manual step)
- ⏳ Production deployment pending