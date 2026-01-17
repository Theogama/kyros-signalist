# Signalist - Automated Trading Bot

Professional automated trading bot for Deriv synthetic indices. Real-time tick analysis, multiple contract types, and comprehensive trade tracking.

## 🚀 Features

- **Real-time Tick Analysis**: Live streaming of market data from Deriv.
- **Automated Trading**: Execute trades automatically based on signals.
- **Multiple Contract Types**: Support for various contract types (Rise/Fall, etc.).
- **Trade Tracking**: Detailed logs and performance charts to monitor your trading activity.
- **Responsive Dashboard**: Professional UI built with Tailwind CSS and Shadcn/ui.
- **Supabase Integration**: Backend support for data persistence and user management.

## 🛠 Tech Stack

- **Framework**: [React 18](https://reactjs.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [Shadcn/ui](https://ui.shadcn.com/)
- **State Management**: [React Query (TanStack)](https://tanstack.com/query/latest) & React Context API
- **Charts**: [Recharts](https://recharts.org/)
- **Backend/Database**: [Supabase](https://supabase.com/)
- **API**: [Deriv WebSocket API](https://api.deriv.com/)

## 📁 Project Structure

```text
src/
├── components/       # UI and feature-specific components
│   ├── trading/      # Trading-related components (Charts, Logs, Controls)
│   └── ui/           # Base UI components (Shadcn/ui)
├── contexts/         # React Contexts for global state management
├── hooks/            # Custom React hooks
├── lib/              # Utility functions and API clients (Deriv, Supabase)
├── pages/            # Main application pages
├── App.tsx           # Main App component and routing
└── main.tsx          # Application entry point
```

## 📋 Prerequisites

- **Node.js**: v18 or higher recommended.
- **Package Manager**: npm (standard) or your preferred choice.
- **Deriv Account**: An active account and an API token from [Deriv](https://app.deriv.com/account/api-token).

## ⚙️ Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd trading-bot-signals
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory (if required by your specific deployment) and add:
   ```env
   # TODO: Add Supabase credentials if used for production
   # VITE_SUPABASE_URL=your_supabase_url
   # VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```

## 📜 Available Scripts

- `npm run dev`: Starts the Vite development server.
- `npm run build`: Builds the application for production.
- `npm run lint`: Runs ESLint to check for code quality issues.
- `npm run preview`: Locally previews the production build.

## 🧪 Testing

- TODO: Implement unit and integration tests.

## 📄 License

- TODO: Specify the license (e.g., MIT).

---

*Note: This project is intended for educational and research purposes. Trading involves risk. Use at your own discretion.*
