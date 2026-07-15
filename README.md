# B² Finance — Smart Statement Parser & Budget Planner

A local-first, privacy-respecting financial manager and budget planner. **B² Finance** lets you upload your PDF or CSV bank and credit card statements, parse them completely in your browser without sending financial data to third-party servers, categorize transactions automatically using keyword rules, and track your category budgets and monthly net worth.

---

## Key Features

- 🔒 **Privacy First & Local-First**: Your financial statements are processed entirely in the browser using a client-side parser. Data is saved locally on your machine in an SQLite database.
- 📄 **Client-Side PDF & CSV Parser**: Parses bank and credit card statements. Reconstructs text lines vertically from PDF layout coordinates (powered by PDF.js) and applies heuristics to extract transactions automatically.
- 🏷️ **Auto-Categorization Rules**: Define rules matching keywords (e.g., `uber` ➔ `Transport & Travel`, `amazon` ➔ `Shopping`) to automatically categorize transactions on upload.
- 📊 **Dynamic Dashboard**: Interactive charts (powered by Chart.js) visualizing income, expense breakdowns, and category-specific budget progress.
- 👥 **User Scoping & Purchase Division**: Track transactions by specific users (e.g. "Gasper") and split them into "Single" vs. shared "Group" purchases.
- 💼 **Net Worth & Asset Tracker**: Monitor your net worth over time. Tracks liquid cash accounts, investments, properties, and mortgages month-by-month.
- 🎨 **Modern Glassmorphic UI**: Beautiful dark-mode design (with a toggleable light mode) using curated colors, modern typography (Outfit & Plus Jakarta Sans), and responsive sidebar navigation.

---

## Technology Stack

- **Frontend**: HTML5, Vanilla CSS3 (Custom variables, glassmorphic design, responsive layouts), JavaScript (ES6+).
- **Frontend Libraries**:
  - [pdf.js](https://mozilla.github.io/pdf.js/) — Client-side PDF reading and text extraction.
  - [Chart.js](https://www.chartjs.org/) — Interactive dashboard graphs.
  - [Lucide Icons](https://lucide.dev/) — Icon system.
- **Backend**: Node.js & Express.
- **Database**: SQLite3 (`financials.db`).

---

## Project Structure

```text
├── server.js              # Express API Server and SQLite DB configuration
├── app.js                 # Frontend application logic, PDF/CSV parser engine, and state management
├── index.html             # Main single-page application layout
├── styles.css             # Premium custom CSS styling (Dark/Light themes, layouts, responsive design)
├── package.json           # Project metadata, script shortcuts, and Node dependencies
├── package-lock.json      # Locked versions of dependencies
├── financials.db          # Local SQLite Database (created automatically on first launch)
└── README.md              # Project documentation (this file)
```

---

## Getting Started

### Prerequisites

Make sure you have [Node.js](https://nodejs.org/) installed (v16+ recommended).

### Installation & Run

1. Clone or extract this repository into your workspace.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the application:
   ```bash
   npm start
   ```
4. Open your browser and navigate to:
   ```text
   http://localhost:3000
   ```

### Database Setup & Privacy

- **Zero-Setup Database**: You do not need to run any manual database install scripts. The first time you launch the application (`npm start`), the SQLite backend automatically creates a fresh, local `financials.db` file and seeds it with all necessary tables and default data (categories, rules, and users).
- **Local Data Privacy**: The `financials.db` database is listed in the `.gitignore` file, ensuring that your local financial transactions, net worth logs, and personal budgets are never committed to your Git repository.

---

## How It Works

### 1. Statement Importer Engine
When you drag and drop or upload a statement:
- **For PDFs**: The app uses `pdf.js` to extract text items and their precise coordinates. It then reconstructs lines horizontally by sorting vertical coordinates.
- **Transaction Extraction**: The engine scans lines matching standard currency and date patterns (e.g., `MM/DD` or `Month DD`) and runs regex checks to identify transaction details.
- **Import Review**: You are presented with a staging area where you can adjust transaction values, users, categories, or purchase types before committing them to the database.

### 2. Auto-Rules
You can manage auto-rules from the **Auto-Rules** tab. When statements are uploaded, the import engine matches description text against these rules. If a keyword is found, the statement entry is pre-categorized automatically.

### 3. Data Persistence
All modifications, custom budgets, transactions, rules, and net worth records are committed atomically via REST endpoints (`/api/state`) to the local Express backend, which syncs them with `financials.db`.

---

## License

Personal project — use and customize as needed!
