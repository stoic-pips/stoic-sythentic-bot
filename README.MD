# 🤖 StoicPips Automated Trading Platform

> *Professional algorithmic trading system powered by advanced market analysis and Deriv API*

## 🎯 Overview

StoicPips is a full-featured algorithmic trading platform that executes automated trades on Deriv's financial markets using sophisticated supply-demand zone analysis and price action strategies.

### 🚀 Live Features
- **Real-time market analysis** across multiple symbols
- **Automated trade execution** via Deriv API
- **Multi-timeframe strategy analysis** (1m to 1H)
- **Dynamic risk management** with configurable limits
- **Professional dashboard** with live trade monitoring
- **Multi-user support** with role-based access

---

## 📊 System Architecture

```graph TB

    subgraph Client_Layer ["Client Layer"]
        WEB["Web Dashboard"]
        API["API Client"]
        WS["WebSocket Feed"]
    end

    subgraph Application_Layer ["Application Layer"]
        FE["Next.js Frontend"]
        BE["Express Backend"]
        WSOCK["WebSocket Server"]
    end

    subgraph Business_Logic ["Business Logic"]
        SIG["Signal Generator"]
        EXEC["Trade Executor"]
        RISK["Risk Manager"]
        MON["Trade Monitor"]
    end

    subgraph Data_Layer ["Data Layer"]
        DB["Supabase PostgreSQL"]
        CACHE["Redis Cache"]
        LOGS["Logging System"]
    end

    subgraph External_Services ["External Services"]
        DERIV["Deriv Trading API"]
        WSAPI["Deriv WebSocket API"]
        AUTH["OAuth Providers"]
    end

    WEB --> FE
    FE --> BE
    API --> BE
    BE --> SIG
    BE --> EXEC
    BE --> RISK
    BE --> MON

    EXEC --> DERIV
    WSOCK --> WSAPI

    BE --> DB
    BE --> CACHE
    SIG --> DB
    MON --> LOGS

    FE --> AUTH
```

## ✨ Core Features

### 🎯 **Smart Trading Engine**
- **Multi-strategy support**: Supply-demand, price action, and trend analysis
- **Real-time signal generation**: Continuous market monitoring
- **Adaptive timeframe selection**: Auto-adjusts based on market conditions
- **Symbol rotation**: Cycles through configured assets for optimal opportunities

### 🛡️ **Risk Management**
- **Daily trade limits**: Prevent overtrading
- **Maximum trades per cycle**: Control trading frequency
- **Stop-loss protection**: Automatic position management
- **Subscription tiers**: Free ($10/trade) and premium unlimited

### 📈 **Advanced Analytics**
- **Live P&L tracking**: Real-time profit/loss calculation
- **Trade history**: Complete audit trail
- **Performance metrics**: Win rate, profit factor, Sharpe ratio
- **Market insights**: Volume analysis and volatility metrics

### 🔧 **Bot Configuration**
- **Customizable symbols**: R_100, R_50, VIX indices, Forex pairs
- **Flexible timeframes**: 1-minute to 1-hour intervals
- **Trade amount control**: Configurable stake sizes
- **Cycle intervals**: 30s to 5min execution frequency

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm/yarn
- Deriv API account with valid token
- Supabase account for database
- Redis (optional, for caching)

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/stoicpips-bot.git
cd stoicpips-bot

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# Initialize database
npx supabase init

# Start development servers
npm run dev:backend  # Backend on port 4000
npm run dev:frontend # Frontend on port 3000
```

### Environment Configuration

```env
# API Credentials
DERIV_API_TOKEN=your_deriv_api_token
DERIV_APP_ID=1089

# Database
DATABASE_URL=your_supabase_db_url
SUPABASE_ANON_KEY=your_supabase_key

# Security
JWT_SECRET=your_jwt_secret
SESSION_SECRET=your_session_secret

# Redis (optional)
REDIS_URL=redis://localhost:6379
```

---

## 🏗️ Project Structure

```
stoicpips-bot/
├── src/
│   ├── frontend/                 # Next.js application
│   │   ├── app/                  # App router pages
│   │   ├── components/           # React components
│   │   ├── lib/                  # Utilities & hooks
│   │   └── styles/               # Tailwind CSS
│   │
│   ├── backend/                  # Express server
│   │   ├── controllers/          # API controllers
│   │   │   ├── bot/              # Bot management
│   │   │   ├── trades/           # Trade operations
│   │   │   └── users/            # User management
│   │   │
│   │   ├── services/             # Business logic
│   │   │   ├── deriv/            # Deriv API integration
│   │   │   ├── strategies/       # Trading strategies
│   │   │   └── trading/          # Trade execution
│   │   │
│   │   ├── middleware/           # Express middleware
│   │   ├── models/               # Data models
│   │   └── routes/               # API routes
│   │
│   ├── shared/                   # Shared types & utils
│   └── deriv/                    # WebSocket handling
│
├── docs/                         # Documentation
├── scripts/                      # Deployment & utility scripts
└── tests/                        # Test suites
```

---

## 🔌 API Reference

### Bot Management
```http
POST /api/bot/start
Content-Type: application/json
Authorization: Bearer <token>

{
  "symbols": ["R_100", "R_50"],
  "amountPerTrade": 10,
  "timeframe": 60,
  "cycleInterval": 30
}
```

### Trade Operations
```http
GET /api/trades/active
GET /api/trades/history?start=2024-01-01&end=2024-01-31
DELETE /api/trades/:id/cancel
```

### System Status
```http
GET /api/system/health
GET /api/system/metrics
GET /api/system/logs
```

---

## 📊 Trading Strategy

### Signal Generation Pipeline
1. **Data Collection**: Fetch OHLC candles from Deriv API
2. **Normalization**: Convert timeframes, handle missing data
3. **Analysis**: Apply supply-demand zone detection
4. **Validation**: Check signal strength and confidence
5. **Execution**: Place trade with risk parameters

### Strategy Configuration
```typescript
interface TradingStrategy {
  name: 'SupplyDemandStrategy' | 'PriceActionStrategy';
  minConfidence: number;      // 0.6 to 0.9
  minSignalGap: number;       // Minutes between signals
  maxDrawdown: number;        // Maximum allowed drawdown
  takeProfit: number;         // TP as percentage
  stopLoss: number;           // SL as percentage
}
```

### Supported Markets
| Category | Examples | Contract Types |
|----------|----------|----------------|
| Volatility Indices | R_100, R_50 | CALL/PUT |
| Forex Pairs | EUR/USD, GBP/JPY | CALL/PUT |
| Cryptocurrencies | BTC/USD, ETH/USD | CALL/PUT |
| Commodities | Gold, Oil | CALL/PUT |

---

## 🛡️ Security Features

- **JWT Authentication**: Secure user sessions
- **API Rate Limiting**: Prevent abuse
- **Input Validation**: Sanitize all user inputs
- **HTTPS Enforcement**: Secure data transmission
- **Audit Logging**: Complete action trail
- **Environment Separation**: Dev/Staging/Prod isolation

---

## 📈 Performance Monitoring

```typescript
interface PerformanceMetrics {
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  sharpeRatio: number;
  maxDrawdown: number;
  dailyProfit: number[];
}
```

### Logging Levels
- **DEBUG**: Detailed strategy decisions
- **INFO**: Trade executions and cycle starts
- **WARN**: Non-critical errors
- **ERROR**: Critical failures requiring attention

---

## 🚀 Deployment

### Docker Deployment
```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 4000
CMD ["npm", "start"]
```

### Docker Compose
```yaml
# docker-compose.yml
version: '3.8'
services:
  backend:
    build: .
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=production
    depends_on:
      - redis
      - postgres
  
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
  
  redis:
    image: redis:alpine
  
  postgres:
    image: supabase/postgres
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}
```

### Deployment Platforms
- **Frontend**: Vercel, Netlify
- **Backend**: Railway, Render, AWS ECS
- **Database**: Supabase, AWS RDS
- **Monitoring**: Datadog, Sentry

---

## 🧪 Testing

```bash
# Run test suite
npm test

# Run with coverage
npm run test:coverage

# Run integration tests
npm run test:integration

# Run e2e tests
npm run test:e2e
```

### Test Structure
- **Unit Tests**: Individual components and services
- **Integration Tests**: API endpoints and database
- **E2E Tests**: Complete trading cycle simulation
- **Load Tests**: Performance under high volume

---

## 🔄 CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test
      - run: npm run build
  
  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm run deploy:production
```

---

## 📚 Documentation

### Additional Resources
- [API Documentation](https://docs.stoicpips.com/api)
- [Strategy Guide](https://docs.stoicpips.com/strategies)
- [Deployment Guide](https://docs.stoicpips.com/deployment)
- [Troubleshooting](https://docs.stoicpips.com/troubleshooting)

### Contributing
1. Fork the repository
2. Create a feature branch
3. Commit changes
4. Push to the branch
5. Open a Pull Request

---

## ⚠️ Risk Disclaimer

**IMPORTANT: Trading financial instruments carries significant risk. This software is for educational and research purposes only.**

- Past performance does not guarantee future results
- You can lose all of your invested capital
- Only trade with money you can afford to lose
- This bot does not provide financial advice
- Always conduct your own due diligence

The developers of StoicPips are not responsible for any financial losses incurred through the use of this software.

---

## 📞 Support

- **Documentation**: [docs.stoicpips.com](https://docs.stoicpips.com)
- **Issues**: [GitHub Issues](https://github.com/yourusername/stoicpips-bot/issues)
- **Discord**: [Join Community](https://discord.gg/stoicpips)
- **Email**: support@stoicpips.com

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Deriv](https://deriv.com/) for their comprehensive trading API
- [Supabase](https://supabase.com/) for amazing developer tools
- [TradingView](https://www.tradingview.com/) for charting inspiration
- All contributors and testers of the StoicPips platform

---

*Built with precision for disciplined traders. Stay stoic. 🏛️*