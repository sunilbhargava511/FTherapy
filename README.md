# Financial Therapy App

A voice-enabled financial coaching application that provides personalized lifestyle budgeting through conversational AI with different therapist personalities.

## Features

- **5 Unique Therapist Personalities**: Each with authentic conversation styles, expertise, and approaches
  - Mel Robbins (Direct motivation & action)
  - Aja Evans (Emotional money wellness) 
  - Ramit Sethi (Rich life design)
  - Nora Ephron (Witty financial wisdom)
  - Michelle Obama (Values-based prosperity)

- **Voice & Text Input**: Speak or type your responses using Web Speech Recognition API
- **AI Voice Cleanup**: Uses Claude API to intelligently clean up stream-of-consciousness voice input
- **Dynamic AI Responses**: Each therapist responds naturally using Claude API while maintaining their unique personality
- **Fallback System**: Works without API keys using pre-written responses and local cleanup rules
- **Manual Recording Control**: Click to start/stop voice recording for precise control
- **Conversational Data Collection**: Natural conversation flow that captures lifestyle preferences
- **Financial Analysis**: Generates both qualitative lifestyle summaries and quantitative budget breakdowns
- **Session Notes**: Real-time note-taking during conversations
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **Web Speech Recognition API** for voice input

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd financial-therapy-app
```

2. Install dependencies:
```bash
npm install
```

3. Set up Claude API (optional but recommended):
```bash
# Copy the environment file
cp .env.local.example .env.local

# Edit .env.local and add your Claude API key
ANTHROPIC_API_KEY=your_actual_api_key_here
```

Get your API key from [Anthropic Console](https://console.anthropic.com/)

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
src/
├── app/                 # Next.js app router
├── components/          # React components
│   ├── ChatInterface.tsx
│   ├── TherapistSelector.tsx
│   ├── VoiceInput.tsx
│   ├── FinancialSummary.tsx
│   └── SessionNotes.tsx
├── lib/                 # Utilities and business logic
│   ├── types.ts
│   ├── conversation-engine.ts
│   ├── budget-calculator.ts
│   └── therapist-loader.ts
└── styles/              # Global styles

therapists/              # Individual therapist personality files
├── mel-robbins.json
├── aja-evans.json
├── ramit-sethi.json
├── nora-ephron.json
└── michelle-obama.json

data/                    # Financial data and categories
└── expense-categories.json
```

## How It Works

1. **Select a Therapist**: Choose from 5 unique coaching personalities
2. **Have a Conversation**: Answer questions about your lifestyle preferences using voice or text
3. **Get Analysis**: Receive both qualitative insights and quantitative budget projections
4. **Review Notes**: See session notes and therapist approach during the conversation

## Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Deploy automatically on push to main branch

### Manual Deployment

```bash
npm run build
npm start
```

## Future Enhancements

- **ElevenLabs Integration**: Add voice responses from therapists
- **Database Storage**: Persist user sessions and progress
- **Export Features**: PDF/CSV export of financial summaries
- **Additional Therapists**: Expand personality library
- **Advanced Analytics**: More sophisticated financial modeling

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.