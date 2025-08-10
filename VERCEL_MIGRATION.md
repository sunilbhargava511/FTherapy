# Vercel Deployment Migration Guide

## Current Development Setup

The application uses in-memory storage (JavaScript `Map`) for session management, which works in development but will **NOT work in Vercel's serverless environment**.

## Files That Need Updates for Vercel

### 1. `/src/lib/session-storage.ts`
**Current:** Uses in-memory Map storage
```javascript
const sessionStorage = new Map<string, any>();
```

**Required Change:** Replace with persistent storage

## Vercel Storage Options

### Option 1: Vercel KV (Recommended)
Simple Redis-like key-value storage built for Vercel.

#### Setup:
1. Install Vercel KV:
```bash
npm install @vercel/kv
```

2. Enable KV in Vercel Dashboard:
- Go to your project → Storage → Create Database → KV
- Connect to your project

3. Update `/src/lib/session-storage.ts`:
```javascript
import { kv } from '@vercel/kv';

// Replace all Map operations:
// OLD: sessionStorage.set(key, value)
// NEW: await kv.set(key, value, { ex: 1800 }) // 30 min expiry

// OLD: sessionStorage.get(key)
// NEW: await kv.get(key)

// OLD: sessionStorage.delete(key)
// NEW: await kv.del(key)
```

### Option 2: Upstash Redis
Third-party Redis provider with good Vercel integration.

#### Setup:
1. Create Upstash account and Redis database
2. Install client:
```bash
npm install @upstash/redis
```
3. Add environment variables from Upstash dashboard
4. Update storage similarly to Vercel KV

### Option 3: Database (PostgreSQL/MySQL)
For more complex needs, but overkill for session storage.

## Migration Checklist

- [ ] Choose storage solution (Vercel KV recommended)
- [ ] Install required packages
- [ ] Set up storage in Vercel dashboard
- [ ] Update `/src/lib/session-storage.ts` to use async storage
- [ ] Update all functions to be async:
  - `addSessionUserMessage` → async
  - `getSessionUserMessages` → async
  - `setSessionData` → async
  - `getSessionData` → async
  - `resolveSessionId` → already async
- [ ] Update all callers to use `await`
- [ ] Test in Vercel preview deployment
- [ ] Monitor for any timeout issues (30 min session expiry)

## Session Data Structure

Current session storage keys:
- `registry_latest` - Most recent session registration
- `registry_{conversationId}` - Session info by conversation ID
- `messages_{sessionId}` - User messages for a session
- `report_{sessionId}` - Generated financial reports

## Environment Variables Needed

For Vercel KV:
```env
KV_URL="..."
KV_REST_API_URL="..."
KV_REST_API_TOKEN="..."
KV_REST_API_READ_ONLY_TOKEN="..."
```

These are automatically added when you connect KV to your project.

## Testing

1. Deploy to Vercel preview branch first
2. Test conversation flow:
   - Session registration
   - Message storage
   - Therapist consistency
   - Report generation
3. Monitor logs for any storage errors
4. Check KV/Redis dashboard for data persistence

## Rollback Plan

If issues occur:
- The in-memory Map code is preserved in git history
- Can temporarily use a global variable as fallback
- Consider using Edge Config for read-heavy data

## Notes

- Sessions expire after 30 minutes (configurable)
- Vercel KV has a free tier (sufficient for development)
- Production may need paid tier based on usage
- Consider implementing cleanup job for old sessions

## Support

- [Vercel KV Docs](https://vercel.com/docs/storage/vercel-kv)
- [Upstash Redis Docs](https://docs.upstash.com/redis)
- [Vercel Storage Pricing](https://vercel.com/docs/storage/vercel-kv/usage-and-pricing)