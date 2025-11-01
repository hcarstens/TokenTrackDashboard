# TokenTrack Dashboard Prototype

A no-code inspired prototype that demonstrates the TokenTrack Dashboard experience, featuring live dashboards, customizable metrics, and stress-testing workflows for tracking tokenization progress across stablecoins, CBDCs, and tokenized deposits.

## Getting started

### Running the Prototype

To run the prototype with full functionality (including live API calls):

```bash
# Start local development server
python3 -m http.server 8000

# Or with Python 2:
python -m SimpleHTTPServer 8000
```

Then open http://localhost:8000 in your browser.

To stop the server:
```bash
# Find and kill the process
pkill -f "python3 -m http.server"
# Or kill the specific port
lsof -ti:8000 | xargs kill
```

### Alternative: Direct File Access

Open `index.html` directly in your browser. The experience is split across dedicated pages:

- **Home (`index.html`)** — Overview of capabilities and next steps.
- **Dashboard (`dashboard.html`)** — Live token metrics, anomaly detection, and contextual signals.
- **Metrics Analyzer (`metrics.html`)** — Drag-and-drop builder for stakeholder-specific metrics using the `TokenData` and `UserPreferences` concepts.
- **Stress Test Simulator (`stress-test.html`)** — Scenario planner with shareable links and recovery projections.

The prototype simulates public data sources with mock values and opportunistically refreshes stablecoin data from the CoinGecko public API. If the API is unavailable the experience falls back to mocked data so demos remain stable.

## Implementation Notes

- Built with static HTML, CSS, and vanilla JavaScript for rapid iteration.
- Charts are powered by [Chart.js](https://www.chartjs.org/) via CDN.
- Preferences are persisted to `localStorage` to mimic custom dashboard storage.
- Stress-test simulations generate deterministic shareable links to support collaboration demos.

## Next Steps

1. Connect to real stablecoin and CBDC feeds using the integration hooks in `assets/js/app.js`.
2. Expand anomaly detection thresholds based on production-grade historical datasets.
3. Layer authentication and role-based views for regulators, banks, and fintech partners.
