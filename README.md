# Deriv Matches Analyzer Pro v2

Advanced browser-based Matches analysis dashboard.

## Features
- Live public Deriv tick stream
- Historical tick loading
- Digits 0–9 distribution
- Selected Matches digit and observed match rate
- 10% mathematical baseline comparison
- 25 / 50 / 100 / 200 tick rolling rates
- Hot and cold digit statistics
- Target-digit overdue count
- Current match streak
- Recent 30-digit pattern strip
- Sample-strength indicator
- Short-window vs long-window divergence insight
- Recent tick table
- CSV export
- Mobile-friendly UI
- No Deriv account token/password is stored or required for market-data analysis

## Run
Open `index.html` in a browser. If your browser blocks local WebSocket behavior, serve the folder with a simple static server.

## API
The app uses Deriv's public WebSocket market-data endpoint:
`wss://ws.binaryws.com/websockets/v3`

Market data endpoints such as `ticks` and `ticks_history` do not require authentication.

## Important
This tool reports historical/statistical observations. It does not guarantee the next digit, does not promise profit, and does not place trades automatically.
