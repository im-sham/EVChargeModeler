Product Requirements Document (PRD) and Technical Build Plan for EVChargeModeler Web App
1. Overview

Product Name: EVChargeModeler
Purpose: A web app for financial modeling of commercial EV truck charging stations (4-8 chargers, focused on California/Southwest) with project management features, including uploading and parsing contractor Statements of Work (SOWs) for expense comparison. Built for developers, fleet operators, and consultants.
Target Users: Project managers, financial analysts, infrastructure developers; multi-user with roles (admin, editor, viewer).
Value Proposition: Streamlines EV charging financial modeling (inspired by Atlas, NREL EVI-FAST, ANL CHECT) with CA-specific incentives (e.g., EnergIIZE, LCFS) and integrates SOW ingestion for cost alignment and project tracking.
Development Environment: Documentation and initial code via Grok; development in Replit for collaborative prototyping and deployment.
Scope: MVP includes financial modeling (DCF, NPV, IRR, LCOC) and basic SOW upload/parsing/comparison. Future phases: advanced analytics, API integrations.
Out of Scope: Full CRM, hardware simulations, legal contract generation.

2. Functional Requirements
2.1 Financial Modeling
Inspired by Atlas (DCF, 100+ inputs), NREL EVI-FAST (MDHD risk analysis), and ANL CHECT (LCOC).

Model Creation:
Wizard-style UI: Inputs for project scale (4-8 chargers), location (CA/Southwest with pre-filled incentives), charger types (150-350kW+ DCFC), utilization (40-60%), energy demand.
Categories: CapEx ($100k-$250k/charger, installation, grid), OpEx (10-15%/year), Revenue ($0.40-0.60/kWh, subscriptions, LCFS $50k-$200k/year), Incentives (EnergIIZE up to 75%, PG&E/SCE rebates).
Horizon: 10-15 years; discount rate 8-10%.


Calculation Engine:
Methods: DCF for NPV/IRR/Payback; LCOC ($/kWh = Total Costs / Total kWh); sensitivity analysis (tornado charts).
Key Formulas:
NPV = Σ [Cash Flow_t / (1 + Discount Rate)^t] - Initial Investment
IRR = Iterative solver (Newton-Raphson)
LCFS = (Energy in MJ * EER * CI Factor) / 1,000,000 * Credit Value ($100-200)


Outputs: Dashboard with NPV, IRR, Payback, LCOC; charts (cash flow, sensitivities); exportable financial statements.


Customization: 100+ inputs (e.g., market growth 8%, equipment $6,000/kW USD); scenario comparison (side-by-side).
Incentives: Auto-populate CA programs (NEVI $384M, CALeVIP, LCFS); stacking logic for 40-80% CapEx reduction.

2.2 Project Management

SOW Upload/Parsing:
Formats: PDF, Excel, Word (drag-drop or file picker).
Parsing: OCR (Tesseract.js) for PDFs; extract expenses, timelines, scopes; manual override for errors.
Features: Tag to projects, version control, search by contractor/amount.


Comparison Tools:
Layer SOW costs into models (e.g., override CapEx).
Side-by-side: Model vs. Bid (highlight >20% variances).
Alerts: Flag budget discrepancies.


Project Dashboard:
List view: Projects (Planning, Bidding, Active).
Collaboration: Share models/SOWs; comments.
Export: PDFs/Excels of models, comparisons.



2.3 UI/UX

Dashboard: Project list, quick-start model button.
Workflow: Tabs (Inputs, Calculations, Outputs).
Visuals: Charts (Chart.js for cash flow, D3.js for sensitivities).
Accessibility: Mobile-responsive, WCAG-compliant.
Onboarding: Tooltips with CA incentive examples.

2.4 Non-Functional Requirements

Performance: <2s calculations for 100+ inputs; <500ms page loads.
Security: OAuth/JWT auth; encrypted SOW uploads; role-based access.
Scalability: 100+ users; Replit-hosted for MVP, scalable to AWS/GCP.
Storage: Retain models/SOWs; export/backup options.

3. Technical Build Plan (Optimized for Replit)
3.1 Tech Stack

Frontend: React.js (via CDN: cdn.jsdelivr.net/npm/react, react-dom) with JSX, Tailwind CSS (via CDN). Reason: Lightweight, Replit-friendly; Tailwind for rapid styling; Chart.js for charts.
Backend: Node.js with Express (Replit’s default Node env). Reason: Handles file uploads, parsing; WebSockets for real-time collab.
Database: SQLite (Replit’s built-in storage). Reason: Simple for MVP; swap to PostgreSQL/MongoDB for production.
File Parsing: pdf.js for PDF extraction; xlsx for Excel; Tesseract.js for OCR. Reason: Browser-based, Replit-compatible.
Calculations: math.js for DCF/NPV/IRR (e.g., Newton-Raphson for IRR). Reason: Lightweight, no heavy dependencies.
Deployment: Replit’s built-in hosting (free for MVP). Reason: Instant deploy, team access.
Other: Firebase Auth (via CDN) for user login; no <form> tags (Replit’s sandbox restrictions).

3.2 Replit-Specific Optimizations

Lightweight Dependencies: Use CDNs (cdn.jsdelivr.net) for React, Tailwind, Chart.js to avoid Replit’s storage limits (500MB free tier).
File Handling: Store SOWs in Replit’s /tmp or SQLite; limit uploads to 10MB to avoid slowdowns.
Real-Time Collab: Leverage Replit’s multiplayer mode for team coding; use WebSockets (via socket.io) for live model sharing.
Testing: Jest for frontend (pre-installed in Replit); manual testing for parsing due to Replit’s resource constraints.
Limitations to Address:
Replit’s CPU limits: Offload heavy calcs (e.g., Monte Carlo) to client-side math.js or post-MVP cloud (AWS Lambda).
No persistent storage: Export models/SOWs as JSON for backup; use Replit’s repl.co URLs for sharing.


Migration Plan: Post-MVP, move to AWS/GCP for scaling (S3 for SOWs, EC2 for compute); Dockerize for consistency.

3.3 Core Code Snippets
Below are starter snippets for key features, ready for Replit’s Node/React env.
React Frontend (index.html)
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>EVChargeModeler</title>
  <script src="https://cdn.jsdelivr.net/npm/react@18.2.0/umd/react.development.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/react-dom@18.2.0/umd/react-dom.development.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@babel/standalone@7.20.0/babel.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/mathjs@12.0.0/lib/browser/math.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    const { useState } = React;

    function App() {
      const [inputs, setInputs] = useState({
        chargers: 4,
        capEx: 100000,
        opEx: 0.1,
        revenuePerKWh: 0.4,
        utilization: 0.5,
        horizon: 10,
        discountRate: 0.08
      });

      const calculateNPV = () => {
        let cashFlows = [];
        for (let t = 0; t < inputs.horizon; t++) {
          let revenue = inputs.chargers * inputs.utilization * 365 * 1000 * inputs.revenuePerKWh;
          let costs = inputs.opEx * inputs.capEx;
          cashFlows.push(revenue - costs);
        }
        return math.npv(cashFlows, inputs.discountRate) - inputs.capEx * inputs.chargers;
      };

      return (
        <div className="p-4 max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">EVChargeModeler</h1>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label>Chargers (4-8):</label>
              <input
                type="number"
                value={inputs.chargers}
                onChange={(e) => setInputs({ ...inputs, chargers: Number(e.target.value) })}
                className="border p-2 w-full"
              />
            </div>
            <div>
              <label>CapEx ($/charger):</label>
              <input
                type="number"
                value={inputs.capEx}
                onChange={(e) => setInputs({ ...inputs, capEx: Number(e.target.value) })}
                className="border p-2 w-full"
              />
            </div>
          </div>
          <div className="mt-4">
            <p>NPV: ${calculateNPV().toFixed(2)}</p>
          </div>
        </div>
      );
    }

    ReactDOM.render(<App />, document.getElementById('root'));
  </script>
</body>
</html>

Node Backend (server.js)
const express = require('express');
const multer = require('multer');
const pdf = require('pdf-parse');
const app = express();
const upload = multer({ dest: '/tmp/uploads/' });

app.use(express.json());

app.post('/upload-sow', upload.single('file'), async (req, res) => {
  try {
    const data = await pdf(req.file.path);
    const expenses = data.text.match(/\$[\d,]+/g) || []; // Basic regex for costs
    res.json({ expenses, raw: data.text });
  } catch (error) {
    res.status(500).json({ error: 'Parsing failed' });
  }
});

app.listen(3000, () => console.log('Server on port 3000'));

3.4 Development Roadmap

Week 1-2: Setup Replit (Node/React); build frontend (wizard, dashboard); basic DCF calcs.
Week 3: Backend for SOW uploads; SQLite for models.
Week 4: Parsing (pdf.js, Tesseract); comparison UI; test in Replit.
Post-MVP: Add incentives DB, sensitivities; migrate to AWS if needed.

3.5 Risks and Mitigations

Replit Limits: CPU/storage constraints; mitigate with client-side calcs, small file uploads (<10MB).
Parsing Accuracy: OCR errors; add manual input UI.
Team Collab: Use Replit’s multiplayer; sync via Git for production.

4. Leveraging Existing Tools

Atlas/NREL/ANL: Publicly available user guides and PDFs provide input lists (e.g., Atlas’s 100+ variables), formulas (DCF, LCOC), and outputs (NPV, sensitivities). These are embedded above (e.g., wizard mimics Atlas tabs; LCFS formula from ANL).
Workaround for Excel Access: Use published methodologies (e.g., ICCT cost breakdowns, NREL’s risk models) to replicate logic. If you obtain the files, upload them for me to parse (PDF/Excel supported).
Data Sources: CEC 2024 ZEV Plan, NEVI CA Plan for CA-specific costs/incentives.

5. Next Steps

Refine PRD: Add specific CA incentives (e.g., EnergIIZE rates) or SOW formats.
Code Expansion: Request more snippets (e.g., SOW parser, sensitivity charts).
Replit Setup: Create a Replit project; share invite for team collab.
