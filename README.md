# Insurance Product Repository

A modern, TypeScript-based React application for managing insurance products, coverages, forms, pricing, and compliance workflows.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📋 Tech Stack

- **Frontend**: React 18.3.1 with TypeScript 5.x
- **Build Tool**: Vite 7.x
- **Styling**: Styled Components 6.x
- **Routing**: React Router 7.x
- **Backend**: Firebase (Firestore, Auth, Storage, Functions)
- **AI Integration**: OpenAI API for intelligent features
- **State Management**: React Hooks + Custom Hooks

## 🏗️ Project Structure

```
src/
├── components/          # React components
│   ├── ui/             # Reusable UI components
│   ├── Home.tsx        # Home page with AI assistant
│   ├── ProductHub.tsx  # Product management
│   ├── ProductBuilder.tsx
│   ├── ProductExplorer.tsx
│   ├── TaskManagement.tsx
│   ├── ClaimsAnalysis.tsx
│   ├── DataDictionary.tsx
│   ├── InsuranceNews.tsx  # Real-time P&C news feed
│   └── ...
├── hooks/              # Custom React hooks
│   ├── useProducts.ts
│   ├── useCoverages.ts
│   └── ...
├── services/           # Business logic & API services
│   ├── firebaseOptimized.ts
│   ├── unifiedCacheService.ts
│   ├── aiTaskSummaryService.ts
│   └── ...
├── utils/              # Utility functions
│   ├── logger.ts
│   ├── performance.tsx
│   ├── bundleOptimization.ts
│   └── ...
├── config/             # Configuration files
│   ├── env.ts
│   ├── aiConfig.ts
│   └── performance.ts
├── types/              # TypeScript type definitions
│   └── index.ts
├── styles/             # Global styles & theme
│   ├── theme.ts
│   └── GlobalStyle.ts
└── firebase.ts         # Firebase initialization
```

## 🔑 Key Features

### Product Management
- Create, edit, and manage insurance products
- Define coverages and sub-coverages
- Manage forms and form-coverage mappings
- Configure pricing rules and tables
- State availability management

### AI-Powered Features
- Intelligent product assistant on home page
- Real-time P&C insurance industry news feed
- Task summarization and insights
- Natural language queries across all data

### Task Management
- Track product development lifecycle
- Phase-based workflow (Research → Development → Compliance → Implementation)
- Priority management and deadline tracking
- Team assignment and ownership

### Data Dictionary
- Centralized field definitions
- Data type specifications
- Validation rules
- Cross-reference tracking

### Claims Analysis
- Claims data visualization
- Trend analysis
- Risk assessment

### News & Industry Updates
- Curated insurance industry news
- AI-enhanced article summaries
- Category filtering
- Bookmark and share functionality

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file (see `.env.example`):

```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id

# OpenAI Configuration
VITE_OPENAI_KEY=your_openai_api_key

# Firebase Emulators (optional)
VITE_USE_FIREBASE_EMULATORS=false
```

### Firebase Setup

1. Create a Firebase project at https://console.firebase.google.com
2. Enable Authentication (Email/Password)
3. Create Firestore database
4. Enable Storage
5. Deploy Cloud Functions (optional)

### Firestore Collections

- `products` - Insurance products
- `coverages` - Coverage definitions
- `forms` - Form templates
- `pricingSteps` - Pricing rules and tables
- `businessRules` - Business logic rules
- `dataDictionary` - Field definitions
- `formCoverages` - Form-coverage mappings
- `tasks` - Task management
- `news` - Industry news articles

## 🎯 Core Concepts

### Product Hierarchy
```
Product
├── Coverages
│   └── Sub-Coverages
├── Forms
├── Pricing Steps
│   └── Pricing Tables
├── Business Rules
└── State Availability
```

### Task Phases
1. **Research** - Market research and ideation
2. **Development** - Product development
3. **Compliance** - Regulatory compliance and filings
4. **Implementation** - Launch and implementation

### AI Integration
- Uses OpenAI GPT models for intelligent features
- Configurable in `src/config/aiConfig.ts`
- Caching and rate limiting built-in
- Fallback to sample data when API unavailable

## 🚀 Performance Optimizations

- **Code Splitting**: Lazy-loaded routes with optimized chunks
- **Caching**: Multi-layer caching (memory, localStorage, IndexedDB)
- **Bundle Optimization**: Tree-shaking and minification
- **Image Optimization**: Lazy loading and responsive images
- **Virtual Scrolling**: For large lists
- **Memoization**: Strategic use of useMemo and useCallback

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm test -- --coverage
```

## 📦 Building

```bash
# Production build
npm run build

# Analyze bundle size
npm run build:analyze
```

## 🔒 Security

- Firebase Authentication required for all routes
- Row-level security rules in Firestore
- API keys stored in environment variables
- CORS configuration for Firebase Functions

## 🤖 AI Agent Optimization

This codebase is optimized for AI coding agents:

- **Clear Structure**: Logical file organization with consistent naming
- **Type Safety**: Full TypeScript coverage for better code understanding
- **Documentation**: Inline comments and JSDoc where needed
- **Modularity**: Small, focused components and functions
- **Consistent Patterns**: Standardized hooks, services, and utilities
- **Error Handling**: Comprehensive error boundaries and logging

## 📝 Development Guidelines

### Adding New Features
1. Define types in `src/types/index.ts`
2. Create service layer in `src/services/`
3. Build custom hooks in `src/hooks/`
4. Implement UI components in `src/components/`
5. Add routes in `src/App.tsx`

### Code Style
- Use TypeScript for all new files
- Follow existing component patterns
- Use styled-components for styling
- Implement proper error handling
- Add logging for debugging

### Performance Considerations
- Lazy load heavy components
- Use React.memo for expensive renders
- Implement proper caching strategies
- Monitor bundle size
- Optimize images and assets

## 🔗 Key Dependencies

- `react` & `react-dom` - UI framework
- `typescript` - Type safety
- `vite` - Build tool
- `styled-components` - CSS-in-JS
- `react-router-dom` - Routing
- `firebase` - Backend services
- `@heroicons/react` - Icons
- `axios` - HTTP client
- `react-markdown` - Markdown rendering
- `xlsx` - Excel file handling
- `pdfjs-dist` - PDF processing

## 📄 License

Private - All rights reserved

## 🆘 Support

For issues or questions, refer to:
- Type definitions in `src/types/index.ts`
- Configuration in `src/config/`
- Service documentation in `src/services/`

