# TokenTrack Dashboard Prototype

A no-code inspired prototype that demonstrates the TokenTrack Dashboard experience, featuring live dashboards, customizable metrics, and stress-testing workflows for tracking tokenization progress across stablecoins, CBDCs, and tokenized deposits.

## Getting started

Open `index.html` in your browser to explore the prototype. The experience is split across dedicated pages:

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
