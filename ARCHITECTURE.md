# FTherapy Architecture Evolution

## Overview
This document outlines the phased evolution of the FTherapy financial coaching application from a simple session-based system to a comprehensive client management platform.

## Architecture Phases

### Phase 1: Session Notebooks (Current)
**Goal**: Single-session conversations with persistent reports but no client history

### Phase 2: Vercel Migration  
**Goal**: Cloud deployment with enhanced storage and authentication

### Phase 3: Multi-Session Client Management
**Goal**: Full client relationship management with historical tracking

---

## Phase 1: Session Notebooks Architecture

### Core Concepts
- **Session Notebook**: A self-contained record of a single coaching session
- **No Authentication**: Sessions are anonymous/ephemeral
- **Report Persistence**: Qualitative and quantitative reports are stored
- **Local Storage**: Uses browser localStorage and server-side file storage

### Data Model

```typescript
interface SessionNotebook {
  id: string;                    // UUID for the session
  therapistId: string;           // Selected therapist
  clientName: string;            // Provided during session
  sessionDate: Date;             // When session occurred
  duration: number;              // Session length in minutes
  
  // Conversation Data
  messages: ConversationMessage[];
  notes: TherapistNote[];
  currentTopic: ConversationTopic;
  
  // Extracted Profile
  userProfile: {
    name: string;
    age: string;
    location: string;
    lifestyle: LifestylePreferences;
  };
  
  // Reports
  qualitativeReport: {
    summary: string;
    keyInsights: string[];
    recommendations: string[];
    actionItems: string[];
    generatedAt: Date;
  };
  
  quantitativeReport: {
    monthlyBudget: BudgetBreakdown;
    savingsOpportunities: SavingsItem[];
    projections: FinancialProjection[];
    generatedAt: Date;
  };
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'completed' | 'abandoned';
}
```

### Storage Strategy

```typescript
// Local Storage (Browser)
localStorage.setItem(`notebook_${sessionId}`, JSON.stringify(notebook));

// Server Storage (File System)
/data/notebooks/
  ├── 2024-01-15/
  │   ├── session_abc123.json    // Complete notebook
  │   ├── session_abc123_qual.md  // Qualitative report
  │   └── session_abc123_quant.json // Quantitative report
```

### Key Components

#### 1. SessionNotebookManager
```typescript
class SessionNotebookManager {
  private currentNotebook: SessionNotebook | null = null;
  
  // Initialize new session
  startSession(therapistId: string): SessionNotebook {
    this.currentNotebook = {
      id: generateUUID(),
      therapistId,
      sessionDate: new Date(),
      messages: [],
      notes: [],
      status: 'active'
    };
    return this.currentNotebook;
  }
  
  // Add conversation data
  addMessage(message: ConversationMessage) {
    this.currentNotebook?.messages.push(message);
    this.saveToLocalStorage();
  }
  
  // Generate reports
  async generateReports() {
    const qualitative = await this.generateQualitativeReport();
    const quantitative = await this.generateQuantitativeReport();
    
    this.currentNotebook.qualitativeReport = qualitative;
    this.currentNotebook.quantitativeReport = quantitative;
    
    await this.persistReports();
  }
  
  // Persist to server
  async persistReports() {
    await fetch('/api/notebooks/save', {
      method: 'POST',
      body: JSON.stringify(this.currentNotebook)
    });
  }
}
```

#### 2. Report Generation Service
```typescript
class ReportGenerator {
  // Extract data from conversation
  extractFinancialData(messages: ConversationMessage[]): FinancialData {
    // Parse messages for income, expenses, goals
    return {
      income: this.extractIncome(messages),
      expenses: this.extractExpenses(messages),
      goals: this.extractGoals(messages)
    };
  }
  
  // Generate quantitative report
  generateQuantitativeReport(data: FinancialData): QuantitativeReport {
    return {
      monthlyBudget: this.calculateBudget(data),
      savingsOpportunities: this.identifySavings(data),
      projections: this.projectFinances(data)
    };
  }
  
  // Generate qualitative insights
  async generateQualitativeReport(
    messages: ConversationMessage[],
    therapist: TherapistPersonality
  ): Promise<QualitativeReport> {
    // Use Claude API to generate insights
    const insights = await generateTherapistInsights(messages, therapist);
    return insights;
  }
}
```

#### 3. Data Extraction Methods
```typescript
class DataExtractor {
  // Income extraction
  extractIncome(messages: ConversationMessage[]): Income {
    const patterns = [
      /I make \$?([\d,]+)/i,
      /salary.{0,20}\$?([\d,]+)/i,
      /earn.{0,20}\$?([\d,]+)/i
    ];
    
    return this.searchPatterns(messages, patterns);
  }
  
  // Expense extraction with categories
  extractExpenses(messages: ConversationMessage[]): CategorizedExpenses {
    return {
      housing: this.extractHousingCosts(messages),
      food: this.extractFoodCosts(messages),
      transport: this.extractTransportCosts(messages),
      entertainment: this.extractEntertainmentCosts(messages),
      subscriptions: this.extractSubscriptions(messages)
    };
  }
  
  // Smart pattern matching
  private searchPatterns(
    messages: ConversationMessage[], 
    patterns: RegExp[]
  ): any {
    // Implementation
  }
}
```

### API Endpoints

```typescript
// Save notebook
POST /api/notebooks/save
{
  notebook: SessionNotebook
}

// Retrieve notebook
GET /api/notebooks/:id

// Generate reports
POST /api/notebooks/:id/generate-reports

// Export notebook
GET /api/notebooks/:id/export?format=pdf|json|csv
```

### Phase 1 Implementation Checklist

- [ ] Create SessionNotebook data model
- [ ] Implement SessionNotebookManager class
- [ ] Build DataExtractor for conversation parsing
- [ ] Create ReportGenerator service
- [ ] Add notebook persistence API
- [ ] Implement local storage backup
- [ ] Create notebook viewer UI
- [ ] Add export functionality (PDF/CSV)
- [ ] Build report visualization components

---

## Phase 2: Vercel Migration Architecture

### Infrastructure Changes
- **Hosting**: Vercel serverless functions
- **Storage**: Vercel KV (Redis) for sessions
- **Database**: Vercel Postgres for notebooks
- **Authentication**: NextAuth.js with magic links
- **File Storage**: Vercel Blob for report exports

### Enhanced Data Model

```typescript
interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: Date;
}

interface SessionNotebookV2 extends SessionNotebook {
  userId?: string;  // Optional user association
  shareToken?: string; // For sharing reports
  accessLog: AccessLogEntry[];
}
```

### Vercel KV Schema

```typescript
// Active sessions
`session:${sessionId}` → SessionData

// User sessions index  
`user:${userId}:sessions` → string[] (session IDs)

// Temporary report cache
`report:cache:${sessionId}` → CachedReport (TTL: 1 hour)
```

### Serverless Functions

```typescript
// api/notebooks/save.ts
export async function POST(req: Request) {
  const notebook = await req.json();
  
  // Save to Vercel Postgres
  await sql`
    INSERT INTO notebooks (id, data, created_at)
    VALUES (${notebook.id}, ${notebook}, NOW())
  `;
  
  // Cache in Vercel KV
  await kv.set(`notebook:${notebook.id}`, notebook, {
    ex: 3600 // 1 hour cache
  });
  
  return Response.json({ success: true });
}
```

### Phase 2 Features
- User accounts with email authentication
- Session history (last 10 sessions)
- Share reports via secure links
- Automatic session recovery
- Report templates and customization

---

## Phase 3: Multi-Session Client Management

### Full Client Database

```sql
-- Core tables
CREATE TABLE clients (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  profile JSONB,
  created_at TIMESTAMP
);

CREATE TABLE sessions (
  id UUID PRIMARY KEY,
  client_id UUID REFERENCES clients(id),
  notebook JSONB,
  created_at TIMESTAMP
);

CREATE TABLE reports (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES sessions(id),
  type VARCHAR(50),
  content JSONB,
  created_at TIMESTAMP
);

-- Analytics tables
CREATE TABLE financial_snapshots (
  id UUID PRIMARY KEY,
  client_id UUID REFERENCES clients(id),
  snapshot_data JSONB,
  snapshot_date DATE
);

CREATE TABLE action_items (
  id UUID PRIMARY KEY,
  client_id UUID REFERENCES clients(id),
  session_id UUID,
  item JSONB,
  status VARCHAR(20),
  created_at TIMESTAMP
);
```

### Advanced Features

#### 1. Progress Tracking
```typescript
class ClientProgressTracker {
  async getProgress(clientId: string): Promise<ProgressReport> {
    const sessions = await this.getClientSessions(clientId);
    const snapshots = await this.getFinancialSnapshots(clientId);
    
    return {
      totalSessions: sessions.length,
      financialProgress: this.calculateProgress(snapshots),
      goalsAchieved: this.evaluateGoals(sessions),
      insights: this.generateInsights(sessions, snapshots)
    };
  }
}
```

#### 2. Multi-Therapist Collaboration
```typescript
interface TherapistHandoff {
  fromTherapist: string;
  toTherapist: string;
  clientId: string;
  handoffNotes: string;
  sessionHistory: SessionSummary[];
}
```

#### 3. Automated Insights
- Spending pattern analysis
- Goal achievement tracking
- Predictive recommendations
- Anomaly detection

### Phase 3 Architecture Components

```
┌─────────────────────────────────────┐
│         Client Dashboard            │
│  (Progress, History, Insights)      │
└─────────────────────────────────────┘
                 │
┌─────────────────────────────────────┐
│        GraphQL API Layer            │
│   (Efficient data fetching)         │
└─────────────────────────────────────┘
                 │
┌─────────────────────────────────────┐
│     Business Logic Layer            │
│  ┌──────────┐ ┌──────────┐         │
│  │Progress  │ │Analytics │         │
│  │Tracker   │ │Engine    │         │
│  └──────────┘ └──────────┘         │
└─────────────────────────────────────┘
                 │
┌─────────────────────────────────────┐
│        Data Access Layer            │
│  ┌──────────┐ ┌──────────┐         │
│  │PostgreSQL│ │Redis     │         │
│  │(Primary) │ │(Cache)   │         │
│  └──────────┘ └──────────┘         │
└─────────────────────────────────────┘
```

---

## Migration Strategies

### Phase 1 → Phase 2
1. Export all notebooks to JSON
2. Deploy to Vercel
3. Import notebooks to Vercel Postgres
4. Add authentication layer
5. Migrate localStorage to Vercel KV

### Phase 2 → Phase 3
1. Create full database schema
2. Migrate notebooks to sessions table
3. Associate sessions with users
4. Backfill client profiles from sessions
5. Enable multi-session features

---

## Technology Stack Evolution

### Phase 1
- Next.js 14 (App Router)
- Local file storage
- In-memory session storage
- localStorage for client

### Phase 2
- Next.js on Vercel
- Vercel KV (Redis)
- Vercel Postgres
- NextAuth.js
- Vercel Blob Storage

### Phase 3
- Next.js + GraphQL
- PostgreSQL (Supabase/Neon)
- Redis (Upstash)
- Prisma ORM
- Analytics (Segment/Mixpanel)

---

## Performance Considerations

### Phase 1
- Minimize localStorage usage (<5MB)
- Lazy load reports
- Client-side data processing

### Phase 2
- Edge functions for low latency
- KV caching strategy
- Optimistic UI updates

### Phase 3
- Database indexing strategy
- Query optimization
- Pagination for history
- Data archival strategy

---

## Security & Privacy

### Phase 1
- No PII in localStorage
- Sanitize all inputs
- Rate limiting on API

### Phase 2
- Encryption at rest
- Secure session tokens
- GDPR compliance

### Phase 3
- Row-level security
- Audit logging
- Data retention policies
- Export/delete rights