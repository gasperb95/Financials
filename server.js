const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'financials.db');

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.static(__dirname));

// Open SQLite database
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to financials.db SQLite database.');
        initDatabase();
    }
});

// Default Configuration Constants (to match app.js)
const DEFAULT_CATEGORIES = [
    { id: 'cat-income', name: 'Income / Refunds', budget: 5000, type: 'income', icon: 'trending-up', color: '#10b981' },
    { id: 'cat-housing', name: 'Housing & Rent', budget: 1500, type: 'expense', icon: 'home', color: '#6366f1' },
    { id: 'cat-groceries', name: 'Groceries', budget: 400, type: 'expense', icon: 'shopping-cart', color: '#f59e0b' },
    { id: 'cat-dining', name: 'Dining & Cafes', budget: 300, type: 'expense', icon: 'coffee', color: '#ec4899' },
    { id: 'cat-transport', name: 'Transport & Travel', budget: 200, type: 'expense', icon: 'car', color: '#06b6d4' },
    { id: 'cat-entertainment', name: 'Entertainment', budget: 150, type: 'expense', icon: 'film', color: '#a855f7' },
    { id: 'cat-utilities', name: 'Utilities & Bills', budget: 250, type: 'expense', icon: 'zap', color: '#3b82f6' },
    { id: 'cat-shopping', name: 'Shopping', budget: 300, type: 'expense', icon: 'shopping-bag', color: '#f43f5e' },
    { id: 'cat-other', name: 'Other Expenses', budget: 100, type: 'expense', icon: 'help-circle', color: '#64748b' }
];

const DEFAULT_RULES = [
    { id: 'rule-1', keyword: 'uber', categoryId: 'cat-transport' },
    { id: 'rule-2', keyword: 'lyft', categoryId: 'cat-transport' },
    { id: 'rule-3', keyword: 'starbucks', categoryId: 'cat-dining' },
    { id: 'rule-4', keyword: 'mcdonald', categoryId: 'cat-dining' },
    { id: 'rule-5', keyword: 'dunkin', categoryId: 'cat-dining' },
    { id: 'rule-6', keyword: 'safeway', categoryId: 'cat-groceries' },
    { id: 'rule-7', keyword: 'wholefoods', categoryId: 'cat-groceries' },
    { id: 'rule-8', keyword: 'trader joe', categoryId: 'cat-groceries' },
    { id: 'rule-9', keyword: 'netflix', categoryId: 'cat-entertainment' },
    { id: 'rule-10', keyword: 'spotify', categoryId: 'cat-entertainment' },
    { id: 'rule-11', keyword: 'comcast', categoryId: 'cat-utilities' },
    { id: 'rule-12', keyword: 'verizon', categoryId: 'cat-utilities' },
    { id: 'rule-13', keyword: 'amazon', categoryId: 'cat-shopping' },
    { id: 'rule-14', keyword: 'target', categoryId: 'cat-shopping' },
    { id: 'rule-15', keyword: 'walmart', categoryId: 'cat-shopping' }
];

// Initialize Database Tables
function initDatabase() {
    db.serialize(() => {
        // 1. Settings Table
        db.run(`CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )`);

        // 2. Categories Table
        db.run(`CREATE TABLE IF NOT EXISTS categories (
            id TEXT PRIMARY KEY,
            name TEXT,
            budget REAL,
            type TEXT,
            icon TEXT,
            color TEXT
        )`, () => {
            // Seed Categories if empty
            db.get(`SELECT COUNT(*) as count FROM categories`, (err, row) => {
                if (!err && row.count === 0) {
                    console.log('Seeding default categories...');
                    const stmt = db.prepare(`INSERT INTO categories (id, name, budget, type, icon, color) VALUES (?, ?, ?, ?, ?, ?)`);
                    DEFAULT_CATEGORIES.forEach(c => {
                        stmt.run(c.id, c.name, c.budget, c.type, c.icon, c.color);
                    });
                    stmt.finalize();
                }
            });
        });

        // 3. Transactions Table
        db.run(`CREATE TABLE IF NOT EXISTS transactions (
            id TEXT PRIMARY KEY,
            date TEXT,
            description TEXT,
            user TEXT,
            amount REAL,
            categoryId TEXT,
            purchaseType TEXT DEFAULT 'single'
        )`, () => {
            // Also run Alter Table just in case database already exists but lacks this column
            db.run(`ALTER TABLE transactions ADD COLUMN purchaseType TEXT DEFAULT 'single'`, (err) => {
                // Ignore error if column already exists
            });
        });

        // 4. Rules Table
        db.run(`CREATE TABLE IF NOT EXISTS rules (
            id TEXT PRIMARY KEY,
            keyword TEXT,
            categoryId TEXT
        )`, () => {
            // Seed Rules if empty
            db.get(`SELECT COUNT(*) as count FROM rules`, (err, row) => {
                if (!err && row.count === 0) {
                    console.log('Seeding default rules...');
                    const stmt = db.prepare(`INSERT INTO rules (id, keyword, categoryId) VALUES (?, ?, ?)`);
                    DEFAULT_RULES.forEach(r => {
                        stmt.run(r.id, r.keyword, r.categoryId);
                    });
                    stmt.finalize();
                }
            });
        });

        // 5 & 6. Net Worth Tables initialization with migration check
        db.all("PRAGMA table_info(net_worth_accounts)", (err, rows) => {
            if (!err && rows && rows.length > 0) {
                const hasMonth = rows.some(r => r.name === 'month');
                const isIdPrimaryKey = rows.some(r => r.name === 'id' && r.pk === 1) && !rows.some(r => r.name === 'month' && r.pk > 0);
                
                if (!hasMonth || isIdPrimaryKey) {
                    console.log("Migrating net_worth tables to support monthly history...");
                    db.serialize(() => {
                        db.run("DROP TABLE IF EXISTS net_worth_accounts");
                        db.run("DROP TABLE IF EXISTS net_worth_properties");
                        createNetWorthTables();
                        createUsersTable();
                    });
                    return;
                }
            }
            createNetWorthTables();
            createUsersTable();
        });

        function createNetWorthTables() {
            db.run(`CREATE TABLE IF NOT EXISTS net_worth_accounts (
                id TEXT,
                name TEXT,
                type TEXT,
                value REAL,
                month TEXT,
                PRIMARY KEY (id, month)
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS net_worth_properties (
                id TEXT,
                name TEXT,
                value REAL,
                mortgage REAL,
                month TEXT,
                PRIMARY KEY (id, month)
            )`);
        }

        function createUsersTable() {
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                name TEXT,
                color TEXT,
                keywords TEXT
            )`, () => {
                // Seed default users if empty
                db.get(`SELECT COUNT(*) as count FROM users`, (err, row) => {
                    if (!err && row.count === 0) {
                        console.log('Seeding default users...');
                        const stmt = db.prepare(`INSERT INTO users (id, name, color, keywords) VALUES (?, ?, ?, ?)`);
                        stmt.run('user-gasper', 'Gasper', '#60a5fa', 'gasper,brandon,primary,g');
                        stmt.run('user-burris', 'Burris', '#c084fc', 'burris,sarah,secondary,b');
                        stmt.finalize();
                    }
                });
            });
        }
    });
}

// REST API Endpoints

// Helper promise wrapper for database queries
function dbAll(query, params = []) {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

// GET /api/state - Compile and return full app state from SQLite
app.get('/api/state', async (req, res) => {
    try {
        const transactions = await dbAll(`SELECT * FROM transactions`);
        const categories = await dbAll(`SELECT * FROM categories`);
        const rules = await dbAll(`SELECT * FROM rules`);
        const settingsRows = await dbAll(`SELECT * FROM settings`);
        const netWorthAccounts = await dbAll(`SELECT * FROM net_worth_accounts`);
        const netWorthProperties = await dbAll(`SELECT * FROM net_worth_properties`);
        const users = await dbAll(`SELECT * FROM users`);

        // Convert settings table to key-value mapping
        const settings = {};
        settingsRows.forEach(row => {
            settings[row.key] = row.value;
        });

        // Default initial selected month
        let selectedMonth = settings.selectedMonth || '';
        if (!selectedMonth) {
            const d = new Date();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            selectedMonth = `${d.getFullYear()}-${mm}`;
        }

        res.json({
            transactions: transactions || [],
            categories: categories || [],
            rules: rules || [],
            netWorthAccounts: netWorthAccounts || [],
            netWorthProperties: netWorthProperties || [],
            users: users || [],
            theme: settings.theme || 'dark-theme',
            activeView: settings.activeView || 'dashboard',
            selectedMonth: selectedMonth
        });
    } catch (err) {
        console.error('Error fetching state from database:', err);
        res.status(500).json({ error: 'Failed to read data from local database.' });
    }
});

// POST /api/state - Atomically update/sync entire app state to SQLite
app.post('/api/state', (req, res) => {
    const { transactions, categories, rules, netWorthAccounts = [], netWorthProperties = [], users = [], theme, activeView, selectedMonth } = req.body;

    if (!categories || !transactions || !rules) {
        return res.status(400).json({ error: 'Invalid state object provided.' });
    }

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // Clear existing tables
        db.run('DELETE FROM transactions');
        db.run('DELETE FROM categories');
        db.run('DELETE FROM rules');
        db.run('DELETE FROM settings');
        db.run('DELETE FROM net_worth_accounts');
        db.run('DELETE FROM net_worth_properties');
        db.run('DELETE FROM users');

        // Insert Settings
        const stmtSettings = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
        stmtSettings.run('theme', theme || 'dark-theme');
        stmtSettings.run('activeView', activeView || 'dashboard');
        stmtSettings.run('selectedMonth', selectedMonth || '');
        stmtSettings.finalize();

        // Insert Categories
        const stmtCat = db.prepare('INSERT INTO categories (id, name, budget, type, icon, color) VALUES (?, ?, ?, ?, ?, ?)');
        categories.forEach(c => {
            stmtCat.run(c.id, c.name, c.budget, c.type, c.icon, c.color);
        });
        stmtCat.finalize();

        // Insert Transactions
        const stmtTx = db.prepare('INSERT INTO transactions (id, date, description, user, amount, categoryId, purchaseType) VALUES (?, ?, ?, ?, ?, ?, ?)');
        transactions.forEach(t => {
            stmtTx.run(t.id, t.date, t.description, t.user || '', t.amount, t.categoryId, t.purchaseType || 'single');
        });
        stmtTx.finalize();

        // Insert Rules
        const stmtRule = db.prepare('INSERT INTO rules (id, keyword, categoryId) VALUES (?, ?, ?)');
        rules.forEach(r => {
            stmtRule.run(r.id, r.keyword, r.categoryId);
        });
        stmtRule.finalize();

        // Insert Net Worth Accounts
        const stmtAcc = db.prepare('INSERT INTO net_worth_accounts (id, name, type, value, month) VALUES (?, ?, ?, ?, ?)');
        netWorthAccounts.forEach(a => {
            stmtAcc.run(a.id, a.name, a.type, a.value, a.month || '');
        });
        stmtAcc.finalize();

        // Insert Net Worth Properties
        const stmtProp = db.prepare('INSERT INTO net_worth_properties (id, name, value, mortgage, month) VALUES (?, ?, ?, ?, ?)');
        netWorthProperties.forEach(p => {
            stmtProp.run(p.id, p.name, p.value, p.mortgage, p.month || '');
        });
        stmtProp.finalize();

        // Insert Users
        const stmtUser = db.prepare('INSERT INTO users (id, name, color, keywords) VALUES (?, ?, ?, ?)');
        users.forEach(u => {
            stmtUser.run(u.id, u.name, u.color, u.keywords || '');
        });
        stmtUser.finalize();

        db.run('COMMIT', (err) => {
            if (err) {
                console.error('Error committing state transaction:', err);
                db.run('ROLLBACK');
                res.status(500).json({ error: 'Failed to persist state transaction.' });
            } else {
                res.json({ success: true });
            }
        });
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`B² Finance Server running locally at http://localhost:${PORT}`);
});
