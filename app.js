// ==========================================================================
// B² FINANCE - APPLICATION ENGINE (app.js)
// ==========================================================================

// Global Application State
let state = {
    transactions: [],
    categories: [],
    rules: [],
    netWorthAccounts: [],
    netWorthProperties: [],
    users: [], // Dynamic users list
    theme: 'dark-theme',
    activeView: 'dashboard',
    selectedMonth: '' // Format: YYYY-MM
};

// Dashboard User Toggle State
let dashboardUserFilter = 'all'; // 'all' or lowercase user name (e.g. 'gasper')

// Default Configuration Constants
const DEFAULT_USERS = [
    { id: 'user-gasper', name: 'Gasper', color: '#60a5fa', keywords: 'gasper,brandon,primary,g' },
    { id: 'user-burris', name: 'Burris', color: '#c084fc', keywords: 'burris,sarah,secondary,b' }
];

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

const AVAILABLE_ICONS = ['wallet', 'home', 'shopping-cart', 'coffee', 'car', 'film', 'zap', 'shopping-bag', 'trending-up', 'help-circle', 'gift', 'heart', 'activity', 'book', 'briefcase', 'clapperboard', 'plane', 'dumbbell', 'scissors', 'utensils', 'key', 'tv', 'plug', 'shirt', 'tag', 'dog'];
const AVAILABLE_COLORS = ['#6366f1', '#4f46e5', '#10b981', '#ef4444', '#f59e0b', '#06b6d4', '#ec4899', '#a855f7', '#3b82f6', '#f43f5e', '#64748b', '#059669', '#d97706', '#b91c1c', '#0891b2', '#7c3aed', '#db2777', '#2563eb'];

// Temporary parser upload variables
let currentParsedTransactions = [];
let currentCsvData = null; // Holds parsed CSV text lines
let currentMapping = { date: -1, desc: -1, amount: -1, user: -1 };

// Chart.js global instances
let budgetActualChartInstance = null;
let spendingBreakdownChartInstance = null;
let netWorthChartInstance = null;
let netWorthAllocationChartInstance = null;
let netWorthTrendChartInstance = null;

// Initialize PDF.js
if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
}

// ==========================================================================
// CORE APP INITIALIZATION
// ==========================================================================

document.addEventListener('DOMContentLoaded', async () => {
    await loadState();
    setupRouting();
    setupEventListeners();
    populateMonthSelectors();
    initTheme();
    renderActiveView();
    renderThemeToggle();
    lucide.createIcons();
});

// Load state from SQLite Database
async function loadState() {
    try {
        const response = await fetch('/api/state');
        if (response.ok) {
            state = await response.json();
            state.netWorthAccounts = state.netWorthAccounts || [];
            state.netWorthProperties = state.netWorthProperties || [];
            state.users = state.users && state.users.length > 0 ? state.users : [...DEFAULT_USERS];
        } else {
            console.warn('Failed to load state from database server, reverting to defaults.');
            resetStateToDefaults();
        }
    } catch (e) {
        console.error('Failed to fetch state from server. Reverting to defaults.', e);
        resetStateToDefaults();
    }
    
    // Default selectedMonth to current calendar month if not set
    if (!state.selectedMonth) {
        const d = new Date();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        state.selectedMonth = `${d.getFullYear()}-${mm}`;
    }
}

// Reset data structures to initial sandbox state
function resetStateToDefaults() {
    state.transactions = [];
    state.categories = [...DEFAULT_CATEGORIES];
    state.rules = [...DEFAULT_RULES];
    state.netWorthAccounts = [];
    state.netWorthProperties = [];
    state.users = [...DEFAULT_USERS];
    state.theme = 'dark-theme';
    saveState();
}

// Save state to SQLite Database
function saveState() {
    fetch('/api/state', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(state)
    }).catch(err => {
        console.error('Failed to save state to server:', err);
    });
    updateSidebarWidget();
}

// Handle Single Page Routing (Hash-based)
function setupRouting() {
    const handleHashChange = () => {
        const hash = window.location.hash.replace('#', '') || 'dashboard';
        const validViews = ['dashboard', 'importer', 'transactions', 'budgets', 'rules', 'networth', 'users'];
        
        if (validViews.includes(hash)) {
            state.activeView = hash;
            renderActiveView();
        }
    };
    
    window.addEventListener('hashchange', handleHashChange);
    // Initial routing call
    handleHashChange();
}

// Mobile Sidebar Menu toggle event handlers
function setupMobileMenu() {
    const toggleBtn = document.getElementById('mobile-menu-toggle-btn');
    const closeBtn = document.getElementById('mobile-menu-close-btn');
    const overlay = document.getElementById('sidebar-overlay');
    const sidebar = document.querySelector('.sidebar');

    if (toggleBtn && sidebar && overlay) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.add('open');
            overlay.classList.remove('hidden');
            overlay.offsetHeight; // Force reflow
            overlay.classList.add('active');
        });
    }

    const closeMenu = () => {
        if (sidebar) sidebar.classList.remove('open');
        if (overlay) {
            overlay.classList.remove('active');
            setTimeout(() => {
                if (sidebar && !sidebar.classList.contains('open')) {
                    overlay.classList.add('hidden');
                }
            }, 300);
        }
    };

    if (closeBtn) {
        closeBtn.addEventListener('click', closeMenu);
    }

    if (overlay) {
        overlay.addEventListener('click', closeMenu);
    }
}

function closeMobileSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) {
        overlay.classList.remove('active');
        overlay.classList.add('hidden');
    }
}

// Update Active Menu Highlighting and switch Panels
function renderActiveView() {
    closeMobileSidebar();
    // Update active nav links
    document.querySelectorAll('.menu-item').forEach(link => {
        if (link.getAttribute('data-view') === state.activeView) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // Toggle view panels visibility
    document.querySelectorAll('.view-panel').forEach(panel => {
        if (panel.id === `view-${state.activeView}`) {
            panel.classList.add('active');
        } else {
            panel.classList.remove('active');
        }
    });

    // Update Top Title Bar
    const titleEl = document.getElementById('page-title');
    const subtitleEl = document.getElementById('page-subtitle');
    
    switch (state.activeView) {
        case 'dashboard':
            titleEl.textContent = 'Dashboard';
            subtitleEl.textContent = 'Financial health and summary insights.';
            renderDashboardView();
            break;
        case 'importer':
            titleEl.textContent = 'Statement Importer';
            subtitleEl.textContent = 'Upload CSV or PDF credit card statements to auto-parse.';
            resetImporterUI();
            break;
        case 'transactions':
            titleEl.textContent = 'Transactions Ledger';
            subtitleEl.textContent = 'Track and edit details of all transaction records.';
            renderTransactionsView();
            break;
        case 'budgets':
            titleEl.textContent = 'Category Budgets';
            subtitleEl.textContent = 'Set budgets for categories and track status.';
            renderBudgetsView();
            break;
        case 'rules':
            titleEl.textContent = 'Settings & Auto-Rules';
            subtitleEl.textContent = 'Configure auto-categorization mapping rules and backups.';
            renderRulesView();
            break;
        case 'networth':
            titleEl.textContent = 'Net Worth Calculator';
            subtitleEl.textContent = 'Track assets, liabilities, and property equity.';
            renderNetWorthView();
            break;
        case 'users':
            titleEl.textContent = 'Manage Users';
            subtitleEl.textContent = 'Configure contributors and keyword auto-assignment rules.';
            renderUsersView();
            break;
    }
    
    lucide.createIcons();
}

// Navigation Helper
function navigateToView(viewName) {
    window.location.hash = `#${viewName}`;
}

// Toggle Theme (Dark / Light)
function initTheme() {
    document.body.className = state.theme;
}

function renderThemeToggle() {
    const btn = document.getElementById('theme-toggle-btn');
    if (btn) {
        btn.addEventListener('click', () => {
            state.theme = state.theme === 'dark-theme' ? 'light-theme' : 'dark-theme';
            document.body.className = state.theme;
            saveState();
            
            // Re-render charts to adapt styles (grid line color, fonts)
            if (state.activeView === 'dashboard') {
                renderDashboardView();
            } else if (state.activeView === 'networth') {
                renderNetWorthView();
            }
        });
    }
}

// Populate Month Selection Dropdown
function populateMonthSelectors() {
    const select = document.getElementById('global-month-select');
    if (!select) return;
    select.innerHTML = '';

    // We collect all months in transactions, plus last 6 months, sorted chronologically
    let months = new Set();
    
    // Add last 6 months automatically
    const now = new Date();
    for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        months.add(`${yyyy}-${mm}`);
    }
    
    // Add months from transactions if older
    state.transactions.forEach(t => {
        if (t.date && t.date.length >= 7) {
            months.add(t.date.substring(0, 7));
        }
    });

    // Sort descending (newest first)
    const sortedMonths = Array.from(months).sort((a, b) => b.localeCompare(a));
    
    sortedMonths.forEach(m => {
        const option = document.createElement('option');
        option.value = m;
        
        // Human readable name (e.g. July 2026)
        const [year, month] = m.split('-');
        const dateObj = new Date(year, parseInt(month) - 1, 1);
        option.textContent = dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });
        
        if (m === state.selectedMonth) {
            option.selected = true;
        }
        select.appendChild(option);
    });

    select.addEventListener('change', (e) => {
        state.selectedMonth = e.target.value;
        saveState();
        renderActiveView(); // Refresh the current active view panel
    });
}

// ==========================================================================
// EVENT LISTENERS & MODALS HANDLERS
// ==========================================================================

function setupEventListeners() {
    // Quick Add Transaction button
    document.getElementById('btn-quick-transaction').addEventListener('click', () => {
        openTransactionModal();
    });

    // Close Transaction modal button
    document.getElementById('btn-close-transaction-modal').addEventListener('click', closeTransactionModal);
    document.getElementById('btn-cancel-transaction-modal').addEventListener('click', closeTransactionModal);

    // Save manual Transaction form
    document.getElementById('form-transaction').addEventListener('submit', handleSaveTransaction);

    // Net Worth Forms
    const formProperty = document.getElementById('form-property');
    const formAccount = document.getElementById('form-account');
    if (formProperty) {
        formProperty.addEventListener('submit', handleSaveProperty);
    }
    if (formAccount) {
        formAccount.addEventListener('submit', handleSaveAccount);
    }
    const cancelPropBtn = document.getElementById('btn-cancel-property-edit');
    const cancelAccBtn = document.getElementById('btn-cancel-account-edit');
    if (cancelPropBtn) {
        cancelPropBtn.addEventListener('click', resetPropertyForm);
    }
    if (cancelAccBtn) {
        cancelAccBtn.addEventListener('click', resetAccountForm);
    }

    const trendTimeframeSelect = document.getElementById('trend-timeframe');
    if (trendTimeframeSelect) {
        trendTimeframeSelect.addEventListener('change', () => {
            renderNetWorthView();
        });
    }

    const propertyNameInput = document.getElementById('property-name');
    if (propertyNameInput) {
        propertyNameInput.addEventListener('input', (e) => {
            const name = e.target.value.trim();
            const records = state.netWorthProperties.filter(p => p.name.trim() === name);
            if (records.length > 0) {
                records.sort((a, b) => b.month.localeCompare(a.month));
                const latest = records[0];
                document.getElementById('property-value').value = latest.value;
            }
        });
    }

    // Category edit submit form
    document.getElementById('form-manage-category').addEventListener('submit', handleSaveCategory);
    document.getElementById('btn-cancel-category-edit').addEventListener('click', resetCategoryForm);

    // Rule add form
    document.getElementById('form-add-rule').addEventListener('submit', handleAddRule);

    // Settings back-up / restore / clear db listeners
    document.getElementById('btn-export-backup').addEventListener('click', exportBackupJSON);
    
    const triggerBackupBtn = document.getElementById('btn-trigger-backup-import');
    const backupFileEl = document.getElementById('import-backup-file');
    if (triggerBackupBtn && backupFileEl) {
        triggerBackupBtn.addEventListener('click', () => backupFileEl.click());
        backupFileEl.addEventListener('change', handleImportBackupJSON);
    }
    
    document.getElementById('btn-clear-all-data').addEventListener('click', handleClearAllData);
    document.getElementById('btn-inject-mock-data').addEventListener('click', handleInjectMockData);

    // File Drag-Drop Area setup
    const dropzone = document.getElementById('file-dropzone');
    const fileInput = document.getElementById('file-input');
    
    if (dropzone && fileInput) {
        dropzone.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleUploadedFile(e.target.files[0]);
            }
        });
        
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('dragover');
        });
        
        dropzone.addEventListener('dragleave', () => {
            dropzone.classList.remove('dragover');
        });
        
        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                handleUploadedFile(e.dataTransfer.files[0]);
            }
        });
    }

    // CSV Mapping apply
    document.getElementById('btn-apply-mapping').addEventListener('click', processCsvMapping);
    document.getElementById('btn-cancel-mapping').addEventListener('click', () => {
        resetImporterUI();
    });

    // Preview import actions
    document.getElementById('btn-clear-preview').addEventListener('click', () => {
        currentParsedTransactions = [];
        renderParsedPreview();
    });
    
    document.getElementById('btn-import-all').addEventListener('click', handleImportParsedTransactions);

    // Dashboard user toggle event listeners
    const btnScopeAll = document.getElementById('btn-scope-all');
    if (btnScopeAll) {
        btnScopeAll.addEventListener('click', () => {
            dashboardUserFilter = 'all';
            renderDashboardView();
        });
    }

    // User Setup Listeners
    const formSaveUser = document.getElementById('form-save-user');
    if (formSaveUser) {
        formSaveUser.addEventListener('submit', handleSaveUser);
    }
    const cancelUserEditBtn = document.getElementById('btn-cancel-user-edit');
    if (cancelUserEditBtn) {
        cancelUserEditBtn.addEventListener('click', resetUserForm);
    }

    // Category Setup Color & Icon pickers
    renderIconSelector();
    renderColorSelector();
    renderUserColorSelector();
    setupMobileMenu();
}

// Update Sidebar health bar status dynamically
function updateSidebarWidget() {
    const percentageEl = document.getElementById('sidebar-budget-percentage');
    const progressBar = document.getElementById('sidebar-budget-progress');
    const widgetText = document.getElementById('sidebar-budget-text');
    
    if (!percentageEl || !progressBar || !widgetText) return;

    // Filter transaction amounts for active month that are expenses
    const monthlyExpenses = state.transactions
        .filter(t => t.date.substring(0, 7) === state.selectedMonth)
        .reduce((sum, t) => {
            const cat = state.categories.find(c => c.id === t.categoryId);
            if (cat && cat.type === 'expense' && t.amount > 0) {
                return sum + t.amount;
            }
            return sum;
        }, 0);

    const totalBudget = state.categories
        .filter(c => c.type === 'expense')
        .reduce((sum, c) => sum + c.budget, 0);

    let percent = 0;
    if (totalBudget > 0) {
        percent = Math.round((monthlyExpenses / totalBudget) * 100);
    }
    
    percentageEl.textContent = `${percent}%`;
    progressBar.style.width = `${Math.min(percent, 100)}%`;
    
    if (percent > 100) {
        progressBar.style.background = 'var(--danger)';
    } else if (percent > 85) {
        progressBar.style.background = 'var(--warning)';
    } else {
        progressBar.style.background = 'linear-gradient(to right, var(--primary), var(--info))';
    }

    widgetText.textContent = `Spent $${monthlyExpenses.toFixed(2)} of $${totalBudget.toFixed(2)}`;
}

// ==========================================================================
// VIEW RENDERING: DASHBOARD
// ==========================================================================

function renderDashboardView() {
    updateSidebarWidget();
    
    // Update dashboard toggle buttons dynamically inside #dashboard-scope-toggle-container
    const toggleContainer = document.getElementById('dashboard-scope-toggle-container');
    if (toggleContainer) {
        let buttonsHtml = `<button class="scope-toggle-btn ${dashboardUserFilter === 'all' ? 'active' : ''}" data-scope="all">All Purchases</button>`;
        state.users.forEach(u => {
            const scopeName = u.name.toLowerCase();
            buttonsHtml += `<button class="scope-toggle-btn ${dashboardUserFilter === scopeName ? 'active' : ''}" data-scope="${scopeName}">${escapeHTML(u.name)}</button>`;
        });
        toggleContainer.innerHTML = buttonsHtml;
        
        // Add event listeners to the generated buttons
        toggleContainer.querySelectorAll('.scope-toggle-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                dashboardUserFilter = e.currentTarget.getAttribute('data-scope');
                renderDashboardView();
            });
        });
    }

    const activeMonth = state.selectedMonth;
    let monthlyTxs = state.transactions.filter(t => t.date.substring(0, 7) === activeMonth);
    
    // Apply dashboard user/scope filter
    if (dashboardUserFilter === 'all') {
        // All Purchases shows any Group transaction
        monthlyTxs = monthlyTxs.filter(t => (t.purchaseType || 'single') === 'group');
    } else {
        const matchedUser = state.users.find(u => u.name.toLowerCase() === dashboardUserFilter);
        if (matchedUser) {
            monthlyTxs = monthlyTxs.filter(t => {
                const isGroup = (t.purchaseType || 'single') === 'group';
                const isSingle = (t.purchaseType || 'single') === 'single';
                const isThisUser = t.user === matchedUser.name;
                return (isGroup && isThisUser) || (isSingle && isThisUser);
            });
        }
    }
    
    // Compute total income vs. total spending
    let totalIncome = 0;
    let totalSpending = 0;

    monthlyTxs.forEach(t => {
        const cat = state.categories.find(c => c.id === t.categoryId);
        if (cat) {
            if (cat.type === 'income') {
                // If it's tagged as income, we take absolute value or negative values as positive income
                totalIncome += Math.abs(t.amount);
            } else {
                // Expenses are stored as positive values
                if (t.amount > 0) {
                    totalSpending += t.amount;
                } else {
                    // Negative expense values act as refunds, subtract from spending
                    totalSpending += t.amount; 
                }
            }
        }
    });

    const totalBudget = state.categories
        .filter(c => c.type === 'expense')
        .reduce((sum, c) => sum + c.budget, 0);

    let savingsRate = 0;
    if (totalIncome > 0) {
        savingsRate = Math.round(((totalIncome - totalSpending) / totalIncome) * 100);
        savingsRate = Math.max(0, savingsRate); // clamp at 0%
    }

    // Populate Widget Card numbers
    document.getElementById('stat-total-income').textContent = `$${totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    document.getElementById('stat-total-spending').textContent = `$${totalSpending.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    document.getElementById('stat-total-budget').textContent = `$${totalBudget.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    document.getElementById('stat-savings-rate').textContent = `${savingsRate}%`;

    // Render Recent Transactions Feed (last 5)
    renderRecentTransactions(monthlyTxs);

    // Render Category threshold progress bars
    renderDashboardBudgetsProgress(monthlyTxs);

    // Refresh charts
    setTimeout(() => {
        renderDashboardCharts(monthlyTxs);
    }, 50);
}

function renderRecentTransactions(monthlyTxs) {
    const listEl = document.getElementById('recent-transactions-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    // Sort by date desc, then by id desc
    const sorted = [...monthlyTxs].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
    const recent = sorted.slice(0, 5);

    if (recent.length === 0) {
        listEl.innerHTML = `
            <div class="empty-state py-4">
                <p class="text-muted text-sm">No transactions recorded for this month.</p>
            </div>
        `;
        return;
    }

    recent.forEach(t => {
        const cat = state.categories.find(c => c.id === t.categoryId) || { name: 'Other', icon: 'help-circle', color: '#64748b', type: 'expense' };
        
        const item = document.createElement('div');
        item.className = 'recent-item';
        
        const dateObj = new Date(t.date + 'T00:00:00');
        const formattedDate = dateObj.toLocaleDateString('default', { month: 'short', day: 'numeric' });

        const isIncome = cat.type === 'income';
        const sign = isIncome ? '+' : '-';
        const amtClass = isIncome ? 'text-success' : '';
        const displayAmt = Math.abs(t.amount).toFixed(2);

        const userAndScope = t.user 
            ? ` • ${escapeHTML(t.user)} (${t.purchaseType === 'group' ? 'Group' : 'Single'})` 
            : ` • ${t.purchaseType === 'group' ? 'Group' : 'Single'}`;
            
        item.innerHTML = `
            <div class="recent-item-meta">
                <div class="category-avatar" style="background: ${cat.color}15; color: ${cat.color}">
                    <i data-lucide="${cat.icon}"></i>
                </div>
                <div class="recent-item-details">
                    <span class="recent-item-title">${escapeHTML(t.description)}</span>
                    <span class="recent-item-subtitle">${escapeHTML(cat.name)} • ${formattedDate}${userAndScope}</span>
                </div>
            </div>
            <div class="recent-item-amount ${amtClass}">
                ${sign}$${displayAmt}
            </div>
        `;
        listEl.appendChild(item);
    });
    lucide.createIcons();
}

function renderDashboardBudgetsProgress(monthlyTxs) {
    const container = document.getElementById('dashboard-budget-status-list');
    if (!container) return;
    container.innerHTML = '';

    // Filter categories to only expense categories
    const expenseCats = state.categories.filter(c => c.type === 'expense');

    if (expenseCats.length === 0) {
        container.innerHTML = `<p class="text-muted text-sm py-4">Create categories in Budgets view to track limits.</p>`;
        return;
    }

    // Compute sums per category
    const categorySums = {};
    expenseCats.forEach(c => { categorySums[c.id] = 0; });
    
    monthlyTxs.forEach(t => {
        if (categorySums[t.categoryId] !== undefined) {
            categorySums[t.categoryId] += t.amount;
        }
    });

    expenseCats.forEach(cat => {
        const spent = categorySums[cat.id];
        const budget = cat.budget;
        
        let percent = 0;
        if (budget > 0) {
            percent = Math.round((spent / budget) * 100);
        }

        let barColor = cat.color;
        if (percent > 100) barColor = 'var(--danger)';
        else if (percent > 85) barColor = 'var(--warning)';

        const item = document.createElement('div');
        item.className = 'budget-status-item';
        item.innerHTML = `
            <div class="status-item-meta">
                <span class="status-item-title">
                    <span style="color: ${cat.color}">•</span> ${escapeHTML(cat.name)}
                </span>
                <span class="text-muted text-xs">
                    $${spent.toFixed(0)} / $${budget.toFixed(0)} (${percent}%)
                </span>
            </div>
            <div class="status-item-progress-container">
                <div class="status-item-progress-bar" style="width: ${Math.min(percent, 100)}%; background-color: ${barColor}"></div>
            </div>
        `;
        container.appendChild(item);
    });
}

// Generate Dashboard Charts via Chart.js
function renderDashboardCharts(monthlyTxs) {
    const isDark = document.body.classList.contains('dark-theme');
    const textThemeColor = isDark ? '#9ca3af' : '#475569';
    const gridThemeColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
    
    // Prepare Data for Budget vs. Actual (Horizontal Bar Chart)
    const expenseCats = state.categories.filter(c => c.type === 'expense');
    const labels = expenseCats.map(c => c.name);
    const budgetsData = expenseCats.map(c => c.budget);
    
    const categorySums = {};
    expenseCats.forEach(c => { categorySums[c.id] = 0; });
    monthlyTxs.forEach(t => {
        if (categorySums[t.categoryId] !== undefined) {
            categorySums[t.categoryId] += t.amount;
        }
    });
    const actualsData = expenseCats.map(c => Math.max(0, categorySums[c.id]));
    const colors = expenseCats.map(c => c.color);

    // 1. Budget vs. Actual Bar Chart
    const ctxBar = document.getElementById('budgetActualChart');
    if (ctxBar) {
        if (budgetActualChartInstance) {
            budgetActualChartInstance.destroy();
        }
        
        budgetActualChartInstance = new Chart(ctxBar, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Budget Limit',
                        data: budgetsData,
                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
                        borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)',
                        borderWidth: 1,
                        borderRadius: 4,
                        barThickness: 16
                    },
                    {
                        label: 'Actual Spent',
                        data: actualsData,
                        backgroundColor: colors,
                        borderRadius: 4,
                        barThickness: 16
                    }
                ]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: textThemeColor,
                            font: { family: 'Outfit', size: 12 }
                        }
                    },
                    tooltip: {
                        padding: 10,
                        backgroundColor: isDark ? '#111827' : '#ffffff',
                        titleColor: isDark ? '#ffffff' : '#0f172a',
                        bodyColor: isDark ? '#9ca3af' : '#475569',
                        borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                        borderWidth: 1
                    }
                },
                scales: {
                    x: {
                        grid: { color: gridThemeColor },
                        ticks: {
                            color: textThemeColor,
                            font: { family: 'Plus Jakarta Sans', size: 10 }
                        }
                    },
                    y: {
                        grid: { display: false },
                        ticks: {
                            color: textThemeColor,
                            font: { family: 'Plus Jakarta Sans', size: 11, weight: '600' }
                        }
                    }
                }
            }
        });
    }

    // 2. Spending Breakdown Doughnut Chart
    // Only show categories that have actual spending > 0
    const nonZeroBreakdown = expenseCats.map((c) => {
        return {
            name: c.name,
            spent: categorySums[c.id],
            color: c.color
        };
    }).filter(item => item.spent > 0);

    const ctxPie = document.getElementById('spendingBreakdownChart');
    if (ctxPie) {
        if (spendingBreakdownChartInstance) {
            spendingBreakdownChartInstance.destroy();
        }

        if (nonZeroBreakdown.length === 0) {
            // Draw empty state placeholder chart
            spendingBreakdownChartInstance = new Chart(ctxPie, {
                type: 'doughnut',
                data: {
                    labels: ['No Data'],
                    datasets: [{
                        data: [1],
                        backgroundColor: [isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '75%',
                    plugins: {
                        legend: { display: false },
                        tooltip: { enabled: false }
                    }
                }
            });
        } else {
            spendingBreakdownChartInstance = new Chart(ctxPie, {
                type: 'doughnut',
                data: {
                    labels: nonZeroBreakdown.map(x => x.name),
                    datasets: [{
                        data: nonZeroBreakdown.map(x => x.spent),
                        backgroundColor: nonZeroBreakdown.map(x => x.color),
                        borderWidth: isDark ? 2 : 1,
                        borderColor: isDark ? '#111827' : '#ffffff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '70%',
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                color: textThemeColor,
                                boxWidth: 10,
                                font: { family: 'Plus Jakarta Sans', size: 10 }
                            }
                        },
                        tooltip: {
                            padding: 10,
                            backgroundColor: isDark ? '#111827' : '#ffffff',
                            titleColor: isDark ? '#ffffff' : '#0f172a',
                            bodyColor: isDark ? '#9ca3af' : '#475569',
                            borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                            borderWidth: 1,
                            callbacks: {
                                label: function(context) {
                                    const value = context.raw;
                                    const sum = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = Math.round((value / sum) * 100);
                                    return ` $${value.toFixed(2)} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
        }
    }
}

// ==========================================================================
// VIEW RENDERING: TRANSACTION LEDGER
// ==========================================================================

// Ledger Sort State variables
let ledgerSortColumn = 'date'; // 'date' or 'amount'
let ledgerSortDirection = 'desc'; // 'asc' or 'desc'

function renderTransactionsView() {
    const tbody = document.getElementById('ledger-tbody');
    const emptyState = document.getElementById('ledger-empty-state');
    const countEl = document.getElementById('ledger-item-count');
    
    if (!tbody) return;
    tbody.innerHTML = '';

    // Helper to convert hex color to rgba for category badges
    const hexToRgba = (hex, alpha) => {
        hex = hex.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    // Populate filter dropdowns if needed (only once or update dynamically)
    populateLedgerCategoryFilters();
    populateLedgerUserFilters();

    // Fetch filters from headers if they exist
    const descInput = document.getElementById('header-filter-desc');
    const searchKeyword = descInput ? descInput.value.toLowerCase() : '';
    
    const catSelect = document.getElementById('header-filter-category');
    const filterCatId = catSelect ? catSelect.value : 'all';

    const userSelect = document.getElementById('header-filter-user');
    const filterUser = userSelect ? userSelect.value : 'all';

    const scopeSelect = document.getElementById('header-filter-scope');
    const filterScope = scopeSelect ? scopeSelect.value : 'all';

    const typeSelect = document.getElementById('header-filter-type');
    const filterType = typeSelect ? typeSelect.value : 'all';

    const activeMonth = state.selectedMonth;

    // Filter transactions
    let filtered = state.transactions.filter(t => {
        // Month filter
        if (t.date.substring(0, 7) !== activeMonth) return false;
        
        // Category filter
        if (filterCatId !== 'all' && t.categoryId !== filterCatId) return false;
        
        // User filter
        if (filterUser !== 'all') {
            if (filterUser === 'unassigned') {
                if (t.user) return false;
            } else {
                if (t.user !== filterUser) return false;
            }
        }

        // Scope filter
        if (filterScope !== 'all') {
            const scopeVal = t.purchaseType || 'single';
            if (scopeVal !== filterScope) return false;
        }

        // Type filter (Income vs Expense)
        if (filterType !== 'all') {
            const cat = state.categories.find(c => c.id === t.categoryId);
            const isIncome = cat && cat.type === 'income';
            if (filterType === 'income' && !isIncome) return false;
            if (filterType === 'expense' && isIncome) return false;
        }

        // Search text filter
        if (searchKeyword) {
            return t.description.toLowerCase().includes(searchKeyword);
        }
        
        return true;
    });

    // Sort: Date or Amount
    filtered.sort((a, b) => {
        let valA, valB;
        if (ledgerSortColumn === 'date') {
            valA = a.date;
            valB = b.date;
            // secondary sort by ID
            if (valA === valB) {
                return ledgerSortDirection === 'asc' ? a.id.localeCompare(b.id) : b.id.localeCompare(a.id);
            }
            return ledgerSortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        } else if (ledgerSortColumn === 'amount') {
            valA = a.amount;
            valB = b.amount;
            return ledgerSortDirection === 'asc' ? valA - valB : valB - valA;
        }
        return 0;
    });

    // Update sorting icons in UI
    const dateIcon = document.getElementById('sort-icon-date');
    const amountIcon = document.getElementById('sort-icon-amount');
    if (dateIcon && amountIcon) {
        // Reset both
        dateIcon.setAttribute('data-lucide', 'chevrons-up-down');
        amountIcon.setAttribute('data-lucide', 'chevrons-up-down');

        // Set active
        if (ledgerSortColumn === 'date') {
            dateIcon.setAttribute('data-lucide', ledgerSortDirection === 'asc' ? 'chevron-up' : 'chevron-down');
        } else if (ledgerSortColumn === 'amount') {
            amountIcon.setAttribute('data-lucide', ledgerSortDirection === 'asc' ? 'chevron-up' : 'chevron-down');
        }
    }

    countEl.textContent = `Showing ${filtered.length} transactions`;

    if (filtered.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    }
    emptyState.classList.add('hidden');

    filtered.forEach(t => {
        const row = document.createElement('tr');
        const cat = state.categories.find(c => c.id === t.categoryId) || { name: 'Other', color: '#64748b', type: 'expense' };

        const isIncome = cat.type === 'income';
        const displayAmt = Math.abs(t.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const amtText = isIncome ? `-$${displayAmt}` : `$${displayAmt}`; // Credits are negative values, expenses positive
        const amtClass = isIncome ? 'text-success' : '';

        // Category badge for click-to-edit
        const bgRgba = hexToRgba(cat.color, 0.12);
        const borderRgba = hexToRgba(cat.color, 0.25);
        const categoryBadgeHtml = `<span class="category-badge" data-tx-id="${t.id}" style="background: ${bgRgba}; color: ${cat.color}; border: 1px solid ${borderRgba};">
            <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:${cat.color}; margin-right: 6px;"></span>
            ${escapeHTML(cat.name)}
        </span>`;

        // User badge for easy click-to-edit
        let userBadgeHtml = '';
        const matchedUser = state.users.find(u => u.name === t.user);
        if (matchedUser) {
            const uBgRgba = hexToRgba(matchedUser.color, 0.12);
            const uBorderRgba = hexToRgba(matchedUser.color, 0.25);
            userBadgeHtml = `<span class="user-badge" data-tx-id="${t.id}" style="background: ${uBgRgba}; color: ${matchedUser.color}; border: 1px solid ${uBorderRgba};">${escapeHTML(matchedUser.name)}</span>`;
        } else if (t.user) {
            userBadgeHtml = `<span class="user-badge badge-unassigned" data-tx-id="${t.id}">${escapeHTML(t.user)}</span>`;
        } else {
            userBadgeHtml = `<span class="user-badge badge-unassigned" data-tx-id="${t.id}">Unassigned</span>`;
        }

        // Scope badge for click-to-edit
        let scopeBadgeHtml = '';
        if (t.purchaseType === 'group') {
            scopeBadgeHtml = `<span class="scope-badge badge-group" data-tx-id="${t.id}">Group</span>`;
        } else {
            scopeBadgeHtml = `<span class="scope-badge badge-single" data-tx-id="${t.id}">Single</span>`;
        }

        row.innerHTML = `
            <td>${t.date}</td>
            <td style="font-weight: 500;">${escapeHTML(t.description)}</td>
            <td>${userBadgeHtml}</td>
            <td>${categoryBadgeHtml}</td>
            <td>${scopeBadgeHtml}</td>
            <td class="text-right ${amtClass}" style="font-weight: 700;">${amtText}</td>
            <td class="text-right">
                <button class="btn-action-row edit-row-btn" data-tx-id="${t.id}" title="Edit Detail">
                    <i data-lucide="edit-3"></i>
                </button>
                <button class="btn-action-row delete delete-row-btn" data-tx-id="${t.id}" title="Delete">
                    <i data-lucide="trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });

    // Wire up inline category badge click events for editing
    tbody.querySelectorAll('.category-badge').forEach(badge => {
        badge.addEventListener('click', (e) => {
            const txId = e.currentTarget.getAttribute('data-tx-id');
            const tx = state.transactions.find(t => t.id === txId);
            if (!tx) return;

            const td = e.currentTarget.parentElement;
            
            // Create inline select element
            const select = document.createElement('select');
            select.className = 'select-row-category-inline';
            select.dataset.txId = txId;

            state.categories.forEach(c => {
                const optEl = document.createElement('option');
                optEl.value = c.id;
                optEl.textContent = c.name;
                if (tx.categoryId === c.id) {
                    optEl.selected = true;
                }
                select.appendChild(optEl);
            });

            // Replace cell contents with the select element
            td.innerHTML = '';
            td.appendChild(select);
            select.focus();

            let finished = false;

            const finishEdit = (newValue) => {
                if (finished) return;
                finished = true;
                tx.categoryId = newValue;
                saveState();
                updateSidebarWidget();
                renderTransactionsView();
            };

            select.addEventListener('change', (evt) => {
                finishEdit(evt.target.value);
            });

            select.addEventListener('blur', () => {
                finishEdit(tx.categoryId);
            });

            select.addEventListener('keydown', (evt) => {
                if (evt.key === 'Enter') {
                    finishEdit(select.value);
                } else if (evt.key === 'Escape') {
                    finished = true;
                    renderTransactionsView();
                }
            });
        });
    });

    // Wire up inline user badge click events for editing
    tbody.querySelectorAll('.user-badge').forEach(badge => {
        badge.addEventListener('click', (e) => {
            const txId = e.currentTarget.getAttribute('data-tx-id');
            const tx = state.transactions.find(t => t.id === txId);
            if (!tx) return;

            const td = e.currentTarget.parentElement;
            
            // Create inline select element
            const select = document.createElement('select');
            select.className = 'select-row-user-inline';
            select.dataset.txId = txId;

            const options = [
                { value: '', label: 'Unassigned' },
                ...state.users.map(u => ({ value: u.name, label: u.name }))
            ];

            options.forEach(opt => {
                const optEl = document.createElement('option');
                optEl.value = opt.value;
                optEl.textContent = opt.label;
                if ((tx.user || '') === opt.value) {
                    optEl.selected = true;
                }
                select.appendChild(optEl);
            });

            // Replace cell contents with the select element
            td.innerHTML = '';
            td.appendChild(select);
            select.focus();

            let finished = false;

            const finishEdit = (newValue) => {
                if (finished) return;
                finished = true;
                tx.user = newValue;
                saveState();
                renderTransactionsView();
            };

            select.addEventListener('change', (evt) => {
                finishEdit(evt.target.value);
            });

            select.addEventListener('blur', () => {
                finishEdit(tx.user);
            });

            select.addEventListener('keydown', (evt) => {
                if (evt.key === 'Enter') {
                    finishEdit(select.value);
                } else if (evt.key === 'Escape') {
                    finished = true;
                    renderTransactionsView();
                }
            });
        });
    });

    // Wire up inline scope badge click events for editing
    tbody.querySelectorAll('.scope-badge').forEach(badge => {
        badge.addEventListener('click', (e) => {
            const txId = e.currentTarget.getAttribute('data-tx-id');
            const tx = state.transactions.find(t => t.id === txId);
            if (!tx) return;

            const td = e.currentTarget.parentElement;
            
            // Create inline select element
            const select = document.createElement('select');
            select.className = 'select-row-scope-inline';
            select.dataset.txId = txId;

            const options = [
                { value: 'single', label: 'Single' },
                { value: 'group', label: 'Group' }
            ];

            options.forEach(opt => {
                const optEl = document.createElement('option');
                optEl.value = opt.value;
                optEl.textContent = opt.label;
                if ((tx.purchaseType || 'single') === opt.value) {
                    optEl.selected = true;
                }
                select.appendChild(optEl);
            });

            // Replace cell contents with the select element
            td.innerHTML = '';
            td.appendChild(select);
            select.focus();

            let finished = false;

            const finishEdit = (newValue) => {
                if (finished) return;
                finished = true;
                tx.purchaseType = newValue;
                saveState();
                renderTransactionsView();
            };

            select.addEventListener('change', (evt) => {
                finishEdit(evt.target.value);
            });

            select.addEventListener('blur', () => {
                finishEdit(tx.purchaseType || 'single');
            });

            select.addEventListener('keydown', (evt) => {
                if (evt.key === 'Enter') {
                    finishEdit(select.value);
                } else if (evt.key === 'Escape') {
                    finished = true;
                    renderTransactionsView();
                }
            });
        });
    });

    // Wire up row edit button events
    tbody.querySelectorAll('.edit-row-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const txId = e.currentTarget.getAttribute('data-tx-id');
            openTransactionModal(txId);
        });
    });

    // Wire up row delete button events
    tbody.querySelectorAll('.delete-row-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const txId = e.currentTarget.getAttribute('data-tx-id');
            if (confirm('Are you sure you want to delete this transaction?')) {
                state.transactions = state.transactions.filter(t => t.id !== txId);
                saveState();
                renderTransactionsView();
                populateMonthSelectors(); // Refresh month dropdown if no transactions left in some month
            }
        });
    });

    lucide.createIcons();
}

function populateLedgerCategoryFilters() {
    const filterSelect = document.getElementById('header-filter-category');
    if (!filterSelect) return;
    
    const savedVal = filterSelect.value || 'all';
    filterSelect.innerHTML = '<option value="all">All Categories</option>';
    
    state.categories.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        if (c.id === savedVal) opt.selected = true;
        filterSelect.appendChild(opt);
    });

    // Add search and filter event listeners once
    if (!filterSelect.dataset.wired) {
        filterSelect.addEventListener('change', renderTransactionsView);
        
        const descFilter = document.getElementById('header-filter-desc');
        if (descFilter) descFilter.addEventListener('input', renderTransactionsView);

        const userFilter = document.getElementById('header-filter-user');
        if (userFilter) userFilter.addEventListener('change', renderTransactionsView);

        const scopeFilter = document.getElementById('header-filter-scope');
        if (scopeFilter) scopeFilter.addEventListener('change', renderTransactionsView);

        const typeFilter = document.getElementById('header-filter-type');
        if (typeFilter) typeFilter.addEventListener('change', renderTransactionsView);

        const thDate = document.getElementById('th-date');
        if (thDate) {
            thDate.addEventListener('click', () => {
                if (ledgerSortColumn === 'date') {
                    ledgerSortDirection = ledgerSortDirection === 'asc' ? 'desc' : 'asc';
                } else {
                    ledgerSortColumn = 'date';
                    ledgerSortDirection = 'desc';
                }
                renderTransactionsView();
            });
        }

        const thAmount = document.getElementById('th-amount');
        if (thAmount) {
            thAmount.addEventListener('click', () => {
                if (ledgerSortColumn === 'amount') {
                    ledgerSortDirection = ledgerSortDirection === 'asc' ? 'desc' : 'asc';
                } else {
                    ledgerSortColumn = 'amount';
                    ledgerSortDirection = 'desc';
                }
                renderTransactionsView();
            });
        }

        document.getElementById('btn-export-csv').addEventListener('click', exportLedgerCSV);
        filterSelect.dataset.wired = "true";
    }
}

function populateLedgerUserFilters() {
    const filterSelect = document.getElementById('header-filter-user');
    if (!filterSelect) return;
    
    const savedVal = filterSelect.value || 'all';
    filterSelect.innerHTML = '<option value="all">All Users</option>';
    
    state.users.forEach(u => {
        const opt = document.createElement('option');
        opt.value = u.name;
        opt.textContent = escapeHTML(u.name);
        if (u.name === savedVal) opt.selected = true;
        filterSelect.appendChild(opt);
    });

    const optUnassigned = document.createElement('option');
    optUnassigned.value = 'unassigned';
    optUnassigned.textContent = 'Unassigned';
    if (savedVal === 'unassigned') optUnassigned.selected = true;
    filterSelect.appendChild(optUnassigned);
}

// Export ledger transactions to CSV file download
function exportLedgerCSV() {
    const activeMonth = state.selectedMonth;
    const monthlyTxs = state.transactions.filter(t => t.date.substring(0, 7) === activeMonth);
    
    if (monthlyTxs.length === 0) {
        alert('No transactions to export for the current month.');
        return;
    }

    // CSV header row
    let csvContent = "Date,Description,User,Category,CategoryType,Amount\r\n";

    monthlyTxs.forEach(t => {
        const cat = state.categories.find(c => c.id === t.categoryId) || { name: 'Other', type: 'expense' };
        
        // Escape description quotes
        let desc = t.description.replace(/"/g, '""');
        if (desc.includes(",") || desc.includes("\n") || desc.includes("\r")) {
            desc = `"${desc}"`;
        }

        let user = (t.user || '').replace(/"/g, '""');
        if (user.includes(",") || user.includes("\n") || user.includes("\r")) {
            user = `"${user}"`;
        }
        
        csvContent += `${t.date},${desc},${user},"${cat.name}",${cat.type},${t.amount}\r\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `b2_finance_ledger_${activeMonth}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ==========================================================================
// TRANSACTIONS: CREATE / EDIT DIALOG FORM HANDLERS
// ==========================================================================

function openTransactionModal(editId = '') {
    const modal = document.getElementById('transaction-modal');
    const titleEl = document.getElementById('transaction-modal-title');
    const form = document.getElementById('form-transaction');
    
    // Clear and build categories selector
    const catSelect = document.getElementById('tx-category');
    catSelect.innerHTML = '';
    state.categories.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = `${c.name} (${c.type})`;
        catSelect.appendChild(opt);
    });

    // Clear and build users selector
    const userSelect = document.getElementById('tx-user');
    if (userSelect) {
        userSelect.innerHTML = '<option value="">— Unassigned —</option>';
        state.users.forEach(u => {
            const opt = document.createElement('option');
            opt.value = u.name;
            opt.textContent = escapeHTML(u.name);
            userSelect.appendChild(opt);
        });
    }

    if (editId) {
        titleEl.textContent = 'Edit Transaction';
        const tx = state.transactions.find(t => t.id === editId);
        if (tx) {
            document.getElementById('tx-edit-id').value = tx.id;
            document.getElementById('tx-date').value = tx.date;
            document.getElementById('tx-desc').value = tx.description;
            document.getElementById('tx-user').value = tx.user || '';
            document.getElementById('tx-purchase-type').value = tx.purchaseType || 'single';
            
            // Format amount. If category is income, we display negative or positive income value accordingly
            document.getElementById('tx-amount').value = tx.amount;
            document.getElementById('tx-category').value = tx.categoryId;
        }
    } else {
        titleEl.textContent = 'Add Transaction';
        form.reset();
        document.getElementById('tx-edit-id').value = '';
        document.getElementById('tx-user').value = '';
        document.getElementById('tx-purchase-type').value = 'single';
        
        // Autofill today's date in yyyy-mm-dd format
        const todayStr = new Date().toISOString().substring(0, 10);
        document.getElementById('tx-date').value = todayStr;
        document.getElementById('tx-category').value = state.categories[1].id; // Default category
    }

    modal.classList.remove('hidden');
    lucide.createIcons();
}

function closeTransactionModal() {
    document.getElementById('transaction-modal').classList.add('hidden');
}

function handleSaveTransaction(e) {
    e.preventDefault();

    const editId = document.getElementById('tx-edit-id').value;
    const date = document.getElementById('tx-date').value;
    const description = document.getElementById('tx-desc').value.trim();
    const user = document.getElementById('tx-user').value.trim();
    const purchaseType = document.getElementById('tx-purchase-type').value;
    const amount = parseFloat(document.getElementById('tx-amount').value);
    const categoryId = document.getElementById('tx-category').value;

    if (!date || !description || isNaN(amount)) {
        alert('Please fill out all fields with valid data.');
        return;
    }

    if (editId) {
        // Edit Mode
        const tx = state.transactions.find(t => t.id === editId);
        if (tx) {
            tx.date = date;
            tx.description = description;
            tx.user = user;
            tx.purchaseType = purchaseType;
            tx.amount = amount;
            tx.categoryId = categoryId;
        }
    } else {
        // Add Mode
        const newTx = {
            id: 'tx-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
            date,
            description,
            user,
            purchaseType,
            amount,
            categoryId
        };
        state.transactions.push(newTx);
    }

    saveState();
    closeTransactionModal();
    populateMonthSelectors(); // Refresh month dropdown (incase new transaction is in a new month)
    
    if (state.activeView === 'dashboard') {
        renderDashboardView();
    } else if (state.activeView === 'transactions') {
        renderTransactionsView();
    }
}

// ==========================================================================
// VIEW RENDERING: BUDGET SETTINGS
// ==========================================================================

function renderBudgetsView() {
    const grid = document.getElementById('budgets-cards-container');
    if (!grid) return;
    grid.innerHTML = '';

    // Calculate actual spent per category for the selectedMonth
    const categorySums = {};
    const categoryCounts = {};
    state.categories.forEach(c => { 
        categorySums[c.id] = 0; 
        categoryCounts[c.id] = 0; 
    });
    
    state.transactions
        .filter(t => t.date.substring(0, 7) === state.selectedMonth)
        .forEach(t => {
            if (categorySums[t.categoryId] !== undefined) {
                categorySums[t.categoryId] += t.amount;
                categoryCounts[t.categoryId]++;
            }
        });

    state.categories.forEach(cat => {
        const spent = categorySums[cat.id];
        const count = categoryCounts[cat.id];
        
        let percent = 0;
        if (cat.budget > 0) {
            percent = Math.round((spent / cat.budget) * 100);
        }

        const isIncome = cat.type === 'income';
        const budgetLabel = isIncome ? 'Target Goal' : 'Budget Limit';
        
        let statusText = '';
        let badgeClass = 'badge';
        let barColor = cat.color;

        if (isIncome) {
            const progressVal = Math.min(percent, 100);
            statusText = spent >= cat.budget ? 'Goal Achieved!' : `$${(cat.budget - spent).toFixed(0)} remaining`;
            badgeClass = spent >= cat.budget ? 'badge badge-success' : 'badge';
        } else {
            if (percent > 100) {
                statusText = `Over by $${(spent - cat.budget).toFixed(0)}!`;
                badgeClass = 'badge badge-danger';
                barColor = 'var(--danger)';
            } else if (percent > 85) {
                statusText = `$${(cat.budget - spent).toFixed(0)} left (Warning)`;
                badgeClass = 'badge badge-warning';
                barColor = 'var(--warning)';
            } else {
                statusText = `$${(cat.budget - spent).toFixed(0)} left`;
                badgeClass = 'badge badge-success';
            }
        }

        const card = document.createElement('div');
        card.className = 'budget-card';
        card.innerHTML = `
            <div class="budget-card-accent-strip" style="background-color: ${cat.color}"></div>
            <div class="budget-card-header">
                <div class="budget-card-icon-title">
                    <div class="budget-card-icon" style="background-color: ${cat.color}">
                        <i data-lucide="${cat.icon}"></i>
                    </div>
                    <div class="budget-card-title-meta">
                        <span class="budget-card-name">${escapeHTML(cat.name)}</span>
                        <span class="budget-card-count">${count} transaction${count === 1 ? '' : 's'}</span>
                    </div>
                </div>
                <div class="budget-card-actions">
                    <button class="btn-action-row edit-cat-btn" data-cat-id="${cat.id}" title="Edit Category">
                        <i data-lucide="edit-2"></i>
                    </button>
                    ${cat.id !== 'cat-income' && cat.id !== 'cat-other' ? `
                    <button class="btn-action-row delete-cat-btn" data-cat-id="${cat.id}" title="Delete Category">
                        <i data-lucide="trash-2"></i>
                    </button>` : ''}
                </div>
            </div>
            
            <div class="budget-card-values-row">
                <div class="budget-card-spent">$${spent.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
                <div class="budget-card-limit">${budgetLabel}: $${cat.budget.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
            </div>

            <div class="budget-card-progress-wrapper">
                <div class="budget-card-progress-outer">
                    <div class="budget-card-progress-inner" style="width: ${Math.min(percent, 100)}%; background-color: ${barColor}"></div>
                </div>
                <div class="budget-card-status-footer">
                    <span class="${badgeClass}">${percent}%</span>
                    <span>${statusText}</span>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });

    // Wire edit button actions
    grid.querySelectorAll('.edit-cat-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const catId = e.currentTarget.getAttribute('data-cat-id');
            loadCategoryIntoForm(catId);
        });
    });

    // Wire delete button actions
    grid.querySelectorAll('.delete-cat-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const catId = e.currentTarget.getAttribute('data-cat-id');
            handleDeleteCategory(catId);
        });
    });

    lucide.createIcons();
}

// Icon Grid generator
function renderIconSelector() {
    const container = document.getElementById('icon-selector-container');
    if (!container) return;
    container.innerHTML = '';
    
    AVAILABLE_ICONS.forEach(iconName => {
        const item = document.createElement('div');
        item.className = `icon-option ${iconName === 'tag' ? 'selected' : ''}`;
        item.setAttribute('data-icon', iconName);
        item.innerHTML = `<i data-lucide="${iconName}"></i>`;
        
        item.addEventListener('click', () => {
            container.querySelectorAll('.icon-option').forEach(el => el.classList.remove('selected'));
            item.classList.add('selected');
            document.getElementById('category-icon').value = iconName;
        });
        container.appendChild(item);
    });
}

// Color Grid generator
function renderColorSelector() {
    const container = document.getElementById('color-picker-container');
    if (!container) return;
    container.innerHTML = '';

    AVAILABLE_COLORS.forEach(hexColor => {
        const item = document.createElement('div');
        item.className = `color-option ${hexColor === '#6366f1' ? 'selected' : ''}`;
        item.style.backgroundColor = hexColor;
        item.setAttribute('data-color', hexColor);
        
        item.addEventListener('click', () => {
            container.querySelectorAll('.color-option').forEach(el => el.classList.remove('selected'));
            item.classList.add('selected');
            document.getElementById('category-color').value = hexColor;
        });
        container.appendChild(item);
    });
}

// Load a category details to form to perform Edit
function loadCategoryIntoForm(catId) {
    const cat = state.categories.find(c => c.id === catId);
    if (!cat) return;

    document.getElementById('category-edit-id').value = cat.id;
    document.getElementById('category-name').value = cat.name;
    document.getElementById('category-budget').value = cat.budget;
    document.getElementById('category-type').value = cat.type;
    
    // Select Icon
    document.getElementById('category-icon').value = cat.icon;
    const iconGrid = document.getElementById('icon-selector-container');
    iconGrid.querySelectorAll('.icon-option').forEach(el => {
        if (el.getAttribute('data-icon') === cat.icon) el.classList.add('selected');
        else el.classList.remove('selected');
    });

    // Select Color
    document.getElementById('category-color').value = cat.color;
    const colorGrid = document.getElementById('color-picker-container');
    colorGrid.querySelectorAll('.color-option').forEach(el => {
        if (el.getAttribute('data-color') === cat.color) el.classList.add('selected');
        else el.classList.remove('selected');
    });

    // Toggle submit button texts
    document.getElementById('category-submit-text').textContent = 'Update Category';
    document.getElementById('category-submit-icon').setAttribute('data-lucide', 'check-circle');
    document.getElementById('btn-cancel-category-edit').classList.remove('hidden');
    
    lucide.createIcons();
}

function resetCategoryForm() {
    document.getElementById('form-manage-category').reset();
    document.getElementById('category-edit-id').value = '';
    
    document.getElementById('category-submit-text').textContent = 'Add Category';
    document.getElementById('category-submit-icon').setAttribute('data-lucide', 'plus-circle');
    document.getElementById('btn-cancel-category-edit').classList.add('hidden');
    
    // Select default icon/color
    document.getElementById('category-icon').value = 'tag';
    document.getElementById('category-color').value = '#6366f1';
    
    const iconGrid = document.getElementById('icon-selector-container');
    iconGrid.querySelectorAll('.icon-option').forEach(el => {
        if (el.getAttribute('data-icon') === 'tag') el.classList.add('selected');
        else el.classList.remove('selected');
    });
    const colorGrid = document.getElementById('color-picker-container');
    colorGrid.querySelectorAll('.color-option').forEach(el => {
        if (el.getAttribute('data-color') === '#6366f1') el.classList.add('selected');
        else el.classList.remove('selected');
    });

    lucide.createIcons();
}

function handleSaveCategory(e) {
    e.preventDefault();

    const editId = document.getElementById('category-edit-id').value;
    const name = document.getElementById('category-name').value.trim();
    const budget = parseFloat(document.getElementById('category-budget').value);
    const type = document.getElementById('category-type').value;
    const icon = document.getElementById('category-icon').value;
    const color = document.getElementById('category-color').value;

    if (!name || isNaN(budget) || budget < 0) {
        alert('Please fill out a valid category details.');
        return;
    }

    if (editId) {
        // Edit mode
        const cat = state.categories.find(c => c.id === editId);
        if (cat) {
            cat.name = name;
            cat.budget = budget;
            cat.type = type;
            cat.icon = icon;
            cat.color = color;
        }
    } else {
        // Create mode
        const newId = 'cat-' + Date.now();
        state.categories.push({
            id: newId,
            name,
            budget,
            type,
            icon,
            color
        });
    }

    saveState();
    resetCategoryForm();
    renderBudgetsView();
}

function handleDeleteCategory(catId) {
    if (catId === 'cat-income' || catId === 'cat-other') {
        alert('Default categories cannot be deleted.');
        return;
    }

    if (confirm('Are you sure you want to delete this category? All transactions belonging to it will be reassigned to "Other Expenses".')) {
        // Re-assign transactions
        state.transactions.forEach(t => {
            if (t.categoryId === catId) {
                t.categoryId = 'cat-other';
            }
        });
        
        // Re-assign active rules
        state.rules.forEach(r => {
            if (r.categoryId === catId) {
                r.categoryId = 'cat-other';
            }
        });

        // Filter out category
        state.categories = state.categories.filter(c => c.id !== catId);
        
        saveState();
        renderBudgetsView();
    }
}

// ==========================================================================
// VIEW RENDERING: AUTO-RULES & DATA SETTINGS
// ==========================================================================

function renderRulesView() {
    const tbody = document.getElementById('rules-tbody');
    const emptyState = document.getElementById('rules-empty-state');
    if (!tbody) return;
    tbody.innerHTML = '';

    // Populate Category selectors inside Rule form
    const select = document.getElementById('rule-category');
    select.innerHTML = '';
    state.categories.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = `${c.name} (${c.type})`;
        select.appendChild(opt);
    });

    if (state.rules.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    }
    emptyState.classList.add('hidden');

    // Render Rules list
    state.rules.forEach(rule => {
        const cat = state.categories.find(c => c.id === rule.categoryId) || { name: 'Other', color: '#64748b' };
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td style="font-family: monospace; font-weight: 600;">"${escapeHTML(rule.keyword)}"</td>
            <td>
                <span class="inline-flex items-center gap-2">
                    <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${cat.color};"></span>
                    ${escapeHTML(cat.name)}
                </span>
            </td>
            <td class="text-right">
                <button class="btn-action-row delete delete-rule-btn" data-rule-id="${rule.id}">
                    <i data-lucide="trash-2"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });

    // Delete rule binding
    tbody.querySelectorAll('.delete-rule-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const ruleId = e.currentTarget.getAttribute('data-rule-id');
            state.rules = state.rules.filter(r => r.id !== ruleId);
            saveState();
            renderRulesView();
        });
    });

    lucide.createIcons();
}

function handleAddRule(e) {
    e.preventDefault();
    
    const keyword = document.getElementById('rule-keyword').value.trim().toLowerCase();
    const categoryId = document.getElementById('rule-category').value;

    if (!keyword || !categoryId) return;

    // Check duplicate
    if (state.rules.some(r => r.keyword === keyword)) {
        alert('A rule for this keyword already exists.');
        return;
    }

    state.rules.push({
        id: 'rule-' + Date.now(),
        keyword,
        categoryId
    });

    saveState();
    document.getElementById('rule-keyword').value = '';
    renderRulesView();
}

// System Back-up / Restore logic
function exportBackupJSON() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `b2_finance_backup_${new Date().toISOString().substring(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
}

function handleImportBackupJSON(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
        try {
            const parsed = JSON.parse(evt.target.result);
            if (parsed.transactions && parsed.categories && parsed.rules) {
                state = parsed;
                saveState();
                populateMonthSelectors();
                alert('Database Backup Restored Successfully!');
                renderActiveView();
            } else {
                alert('Failed to restore. The JSON file format is invalid.');
            }
        } catch (err) {
            alert('Error parsing the backup file: ' + err.message);
        }
    };
    reader.readAsText(file);
}

function handleClearAllData() {
    if (confirm('CAUTION: This will clear all transactions, custom categories, and rules from your local SQLite database. Are you sure you want to proceed?')) {
        resetStateToDefaults();
        populateMonthSelectors();
        alert('All app data has been reset.');
        navigateToView('dashboard');
    }
}

// Inject Sandbox data to demo stats immediately
function handleInjectMockData() {
    const mockTxs = generateDemoMockTransactions();
    state.transactions = mockTxs;
    state.categories = [...DEFAULT_CATEGORIES];
    state.rules = [...DEFAULT_RULES];
    
    // Inject Mock Net Worth Accounts & Properties over the last 6 months
    const mockAccounts = [];
    const mockProperties = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const mStr = `${yyyy}-${mm}`;
        
        // Incremental growth of savings and investment values
        const checkingVal = 3000 + (5 - i) * 300 + Math.random() * 200;
        const savingsVal = 10000 + (5 - i) * 1000;
        const investmentVal = 15000 + (5 - i) * 1000 + Math.random() * 300;
        const retirementVal = 40000 + (5 - i) * 1500;
        const hsaVal = 2000 + (5 - i) * 200;
        const ccVal = 800 + Math.random() * 500;
        const loanVal = 16000 - (5 - i) * 300;
        
        mockAccounts.push(
            { id: 'acc-1', name: 'Chase Checking', type: 'cash', value: parseFloat(checkingVal.toFixed(2)), month: mStr },
            { id: 'acc-2', name: 'Ally Savings', type: 'cash', value: parseFloat(savingsVal.toFixed(2)), month: mStr },
            { id: 'acc-3', name: 'Vanguard 401(k)', type: 'retirement', value: parseFloat(retirementVal.toFixed(2)), month: mStr },
            { id: 'acc-6', name: 'Fidelity Brokerage', type: 'investment', value: parseFloat(investmentVal.toFixed(2)), month: mStr },
            { id: 'acc-7', name: 'HealthEquity HSA', type: 'hsa', value: parseFloat(hsaVal.toFixed(2)), month: mStr },
            { id: 'acc-4', name: 'Chase Sapphire Credit Card', type: 'liability', value: parseFloat(ccVal.toFixed(2)), month: mStr },
            { id: 'acc-5', name: 'Auto Loan', type: 'liability', value: parseFloat(loanVal.toFixed(2)), month: mStr }
        );
        
        // Real estate appreciation and mortgage paydown
        const houseVal = 420000 + (5 - i) * 1000;
        const mortgageVal = 297000 - (5 - i) * 400;
        const condoVal = 205000 + (5 - i) * 800;
        const condoMortgageVal = 121000 - (5 - i) * 250;
        
        mockProperties.push(
            { id: 'prop-1', name: 'Primary Residence', value: parseFloat(houseVal.toFixed(2)), mortgage: parseFloat(mortgageVal.toFixed(2)), month: mStr },
            { id: 'prop-2', name: 'Beach Condo', value: parseFloat(condoVal.toFixed(2)), mortgage: parseFloat(condoMortgageVal.toFixed(2)), month: mStr }
        );
    }
    
    state.netWorthAccounts = mockAccounts;
    state.netWorthProperties = mockProperties;

    saveState();
    populateMonthSelectors();
    alert('Mock sandbox dataset loaded successfully! Redirecting to Dashboard.');
    navigateToView('dashboard');
}

// Helper to compile a clean list of transaction details
function generateDemoMockTransactions() {
    const d = new Date();
    const mmStr = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const monthPrefix = `${yyyy}-${mmStr}`;
    
    // Also inject some for last month
    const lastD = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    const lastMmStr = String(lastD.getMonth() + 1).padStart(2, '0');
    const lastYyyy = lastD.getFullYear();
    const lastMonthPrefix = `${lastYyyy}-${lastMmStr}`;

    const items = [
        // Income
        { date: `${monthPrefix}-01`, description: 'Paycheck Direct Deposit Corp', amount: -2850.00, categoryId: 'cat-income' },
        { date: `${monthPrefix}-15`, description: 'Paycheck Direct Deposit Corp', amount: -2850.00, categoryId: 'cat-income' },
        { date: `${monthPrefix}-22`, description: 'Venmo Split payment Dinner', amount: -45.00, categoryId: 'cat-income' },
        
        // Housing
        { date: `${monthPrefix}-02`, description: 'Apartment Management rent', amount: 1450.00, categoryId: 'cat-housing' },
        
        // Utilities
        { date: `${monthPrefix}-03`, description: 'Comcast Cable & Internet', amount: 94.50, categoryId: 'cat-utilities' },
        { date: `${monthPrefix}-04`, description: 'Metropolitan Water District', amount: 48.00, categoryId: 'cat-utilities' },
        { date: `${monthPrefix}-08`, description: 'Evergy Electricity bill', amount: 112.40, categoryId: 'cat-utilities' },
        
        // Groceries
        { date: `${monthPrefix}-05`, description: 'Safeway Supermarket #4582', amount: 89.20, categoryId: 'cat-groceries' },
        { date: `${monthPrefix}-12`, description: 'Whole Foods Market Seattle', amount: 124.60, categoryId: 'cat-groceries' },
        { date: `${monthPrefix}-19`, description: 'Trader Joes #520 Groceries', amount: 95.10, categoryId: 'cat-groceries' },
        { date: `${monthPrefix}-26`, description: 'Safeway Supermarket #4582', amount: 62.45, categoryId: 'cat-groceries' },
        
        // Dining & Cafes
        { date: `${monthPrefix}-04`, description: 'Starbucks Coffee #128', amount: 6.85, categoryId: 'cat-dining' },
        { date: `${monthPrefix}-06`, description: 'Mcdonalds Restaurant Fastfood', amount: 14.20, categoryId: 'cat-dining' },
        { date: `${monthPrefix}-10`, description: 'El Limon Mexican Grill dinner', amount: 48.50, categoryId: 'cat-dining' },
        { date: `${monthPrefix}-16`, description: 'Starbucks Coffee #128', amount: 7.20, categoryId: 'cat-dining' },
        { date: `${monthPrefix}-20`, description: 'Olive Garden Dining', amount: 74.80, categoryId: 'cat-dining' },
        { date: `${monthPrefix}-24`, description: 'Joe & The Juice', amount: 15.50, categoryId: 'cat-dining' },
        
        // Transport
        { date: `${monthPrefix}-06`, description: 'Uber Ride Seattle Downtown', amount: 24.30, categoryId: 'cat-transport' },
        { date: `${monthPrefix}-13`, description: 'Chevron Fuel gas station', amount: 45.00, categoryId: 'cat-transport' },
        { date: `${monthPrefix}-22`, description: 'Uber Ride Seattle Downtown', amount: 18.90, categoryId: 'cat-transport' },
        { date: `${monthPrefix}-27`, description: 'Lyft Ride Airport Taxi', amount: 54.20, categoryId: 'cat-transport' },

        // Shopping
        { date: `${monthPrefix}-07`, description: 'Amazon.com orders electronics', amount: 114.99, categoryId: 'cat-shopping' },
        { date: `${monthPrefix}-14`, description: 'Target Store retail shopping', amount: 45.80, categoryId: 'cat-shopping' },
        { date: `${monthPrefix}-25`, description: 'Amazon.com orders shoes', amount: 89.90, categoryId: 'cat-shopping' },
        
        // Entertainment
        { date: `${monthPrefix}-11`, description: 'Netflix.com subscription', amount: 15.49, categoryId: 'cat-entertainment' },
        { date: `${monthPrefix}-15`, description: 'Spotify USA monthly billing', amount: 10.99, categoryId: 'cat-entertainment' },
        { date: `${monthPrefix}-18`, description: 'Regal Cinemas Movie Tickets', amount: 32.00, categoryId: 'cat-entertainment' },

        // Other
        { date: `${monthPrefix}-29`, description: 'Stickers & Crafts Etsy Shop', amount: 18.50, categoryId: 'cat-other' },

        // ==============================
        // PREVIOUS MONTH RECORDS
        // ==============================
        { date: `${lastMonthPrefix}-01`, description: 'Paycheck Direct Deposit Corp', amount: -2850.00, categoryId: 'cat-income' },
        { date: `${lastMonthPrefix}-15`, description: 'Paycheck Direct Deposit Corp', amount: -2850.00, categoryId: 'cat-income' },
        { date: `${lastMonthPrefix}-02`, description: 'Apartment Management rent', amount: 1450.00, categoryId: 'cat-housing' },
        { date: `${lastMonthPrefix}-05`, description: 'Safeway Supermarket #4582', amount: 112.50, categoryId: 'cat-groceries' },
        { date: `${lastMonthPrefix}-12`, description: 'Whole Foods Market Seattle', amount: 154.20, categoryId: 'cat-groceries' },
        { date: `${lastMonthPrefix}-04`, description: 'Starbucks Coffee #128', amount: 6.85, categoryId: 'cat-dining' },
        { date: `${lastMonthPrefix}-08`, description: 'Outback Steakhouse dinner', amount: 86.40, categoryId: 'cat-dining' },
        { date: `${lastMonthPrefix}-07`, description: 'Amazon.com orders', amount: 45.20, categoryId: 'cat-shopping' },
        { date: `${lastMonthPrefix}-14`, description: 'Target Store retail', amount: 79.50, categoryId: 'cat-shopping' },
        { date: `${lastMonthPrefix}-11`, description: 'Netflix.com subscription', amount: 15.49, categoryId: 'cat-entertainment' },
        { date: `${lastMonthPrefix}-15`, description: 'Spotify USA monthly billing', amount: 10.99, categoryId: 'cat-entertainment' }
    ];

    // Generate random unique transaction ids and default to group scope
    return items.map((t, index) => {
        t.id = 'tx-mock-' + index + '-' + Math.floor(Math.random() * 10000);
        t.purchaseType = 'group';
        return t;
    });
}

// ==========================================================================
// STATEMENT IMPORTER LOGIC (CSV / PDF ENGINE)
// ==========================================================================

function resetImporterUI() {
    currentParsedTransactions = [];
    currentCsvData = null;
    currentMapping = { date: -1, desc: -1, amount: -1 };

    document.getElementById('csv-mapping-card').classList.add('hidden');
    document.getElementById('pdf-processing-console').classList.add('hidden');
    
    document.getElementById('dropzone-icon-glyph').setAttribute('data-lucide', 'cloud-upload');
    document.getElementById('file-dropzone').classList.remove('dragover');
    
    // Clear elements
    document.getElementById('file-input').value = '';
    document.getElementById('parsed-transactions-tbody').innerHTML = '';
    
    renderParsedPreview();
    lucide.createIcons();
}

// Core dispatcher for uploaded files
function handleUploadedFile(file) {
    const importType = document.querySelector('input[name="importType"]:checked').value;
    const consoleEl = document.getElementById('pdf-processing-console');
    const logEl = document.getElementById('pdf-console-log');
    
    resetImporterUI();

    if (file.name.endsWith('.pdf') || importType === 'pdf') {
        // PDF parser selected
        consoleEl.classList.remove('hidden');
        logEl.textContent = `File Name: ${file.name}\nFile Size: ${(file.size/1024).toFixed(1)} KB\nType: PDF Statement\n--------------------------\n`;
        
        // Start PDF processor
        extractTransactionsFromPDF(file);
    } else {
        // CSV parser selected
        const reader = new FileReader();
        reader.onload = function(e) {
            const text = e.target.result;
            const parsedRows = parseCSVText(text);
            
            if (parsedRows.length <= 1) {
                alert('No columns or rows found in the uploaded CSV statement.');
                return;
            }
            
            currentCsvData = parsedRows;
            showCsvColumnMapper(parsedRows);
        };
        reader.readAsText(file);
    }
}

// Standard CSV Text parser mapping RFC-4180 rules
function parseCSVText(text) {
    const lines = [];
    let row = [""];
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        let c = text[i];
        let next = text[i+1];
        if (c === '"') {
            if (inQuotes && next === '"') {
                row[row.length - 1] += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (c === ',' && !inQuotes) {
            row.push("");
        } else if ((c === '\r' || c === '\n') && !inQuotes) {
            if (c === '\r' && next === '\n') {
                i++;
            }
            lines.push(row);
            row = [""];
        } else {
            row[row.length - 1] += c;
        }
    }
    if (row.length > 1 || row[0] !== "") {
        lines.push(row);
    }
    
    // Clean spaces and filter empty lines
    return lines.map(r => r.map(cell => cell.trim())).filter(r => r.some(cell => cell !== ""));
}

// Open mapping UI panels
function showCsvColumnMapper(rows) {
    const headers = rows[0];
    const previewTbody = document.getElementById('preview-tbody');
    const previewTheadTr = document.getElementById('preview-thead-tr');
    
    previewTbody.innerHTML = '';
    previewTheadTr.innerHTML = '';

    // Populates mappings selector options
    const selectors = ['map-date', 'map-desc', 'map-amount', 'map-user'];
    selectors.forEach(selId => {
        const select = document.getElementById(selId);
        if (selId === 'map-user') {
            select.innerHTML = '<option value="-1">-- Don\'t Map (Optional) --</option>';
        } else {
            select.innerHTML = '<option value="-1">-- Select Column --</option>';
        }
        headers.forEach((h, index) => {
            const opt = document.createElement('option');
            opt.value = index;
            opt.textContent = `Col ${index+1}: "${h}"`;
            select.appendChild(opt);
        });
    });

    // Smart headers auto detection Heuristics
    let matchedDate = -1, matchedDesc = -1, matchedAmt = -1, matchedUser = -1;
    headers.forEach((h, index) => {
        const lh = h.toLowerCase();
        if (matchedDate === -1 && (lh.includes('date') || lh.includes('day'))) matchedDate = index;
        if (matchedAmt === -1 && (lh.includes('amount') || lh.includes('charge') || lh.includes('spent') || lh.includes('value') || lh.includes('cost') || lh.includes('total'))) matchedAmt = index;
        if (matchedUser === -1 && (lh.includes('user') || lh.includes('cardholder') || lh.includes('member') || lh.includes('owner') || lh.includes('buyer') || lh.includes('purchased') || lh.includes('who'))) matchedUser = index;
    });
    // For description, look for desc, payee, merchant, detail. If not found, fall back to "name" if "name" is not mapped as user
    headers.forEach((h, index) => {
        const lh = h.toLowerCase();
        if (matchedDesc === -1) {
            if (lh.includes('desc') || lh.includes('payee') || lh.includes('merchant') || lh.includes('detail')) {
                matchedDesc = index;
            } else if (lh.includes('name') && matchedUser !== index) {
                matchedDesc = index;
            }
        }
    });

    if (matchedDate !== -1) document.getElementById('map-date').value = matchedDate;
    if (matchedDesc !== -1) document.getElementById('map-desc').value = matchedDesc;
    if (matchedAmt !== -1) document.getElementById('map-amount').value = matchedAmt;
    if (matchedUser !== -1) document.getElementById('map-user').value = matchedUser;

    // Fill table previews (First 3 data rows)
    headers.forEach(h => {
        const th = document.createElement('th');
        th.textContent = h.length > 15 ? h.substring(0,12) + '...' : h;
        previewTheadTr.appendChild(th);
    });

    const previewRows = rows.slice(1, 4);
    previewRows.forEach(row => {
        const tr = document.createElement('tr');
        headers.forEach((h, index) => {
            const td = document.createElement('td');
            td.textContent = row[index] || '';
            tr.appendChild(td);
        });
        previewTbody.appendChild(tr);
    });

    document.getElementById('csv-mapping-card').classList.remove('hidden');
}

// Convert user mapped selections into parsed transaction elements
function processCsvMapping() {
    const colDate = parseInt(document.getElementById('map-date').value);
    const colDesc = parseInt(document.getElementById('map-desc').value);
    const colAmt = parseInt(document.getElementById('map-amount').value);
    const colUser = parseInt(document.getElementById('map-user').value);

    if (colDate === -1 || colDesc === -1 || colAmt === -1) {
        alert('Please map all three columns (Date, Description, Amount) to parse correctly.');
        return;
    }

    currentMapping = { date: colDate, desc: colDesc, amount: colAmt, user: colUser };
    currentParsedTransactions = [];

    const dataRows = currentCsvData.slice(1);
    
    dataRows.forEach((row, index) => {
        const dateVal = row[colDate];
        const descVal = row[colDesc];
        const amtVal = row[colAmt];
        const userVal = colUser !== -1 ? row[colUser] : '';

        if (!dateVal || !descVal || !amtVal) return; // Skip incomplete records

        // Attempt normalization
        const parsedDate = parseStandardDate(dateVal);
        const parsedAmt = parseStandardAmount(amtVal);

        if (!parsedDate || isNaN(parsedAmt)) return; // Skip invalid formats

        // Auto categorisation
        const categoryId = autoCategorize(descVal, parsedAmt);

        currentParsedTransactions.push({
            id: 'parsed-' + index + '-' + Date.now(),
            date: parsedDate,
            description: descVal,
            amount: parsedAmt,
            categoryId: categoryId,
            user: normalizeImportedUser(userVal),
            purchaseType: 'single'
        });
    });

    // Hide Mapper mapping section
    document.getElementById('csv-mapping-card').classList.add('hidden');
    renderParsedPreview();
}

// Normalize uploaded values to users based on their keyword rules
function normalizeImportedUser(val) {
    if (!val) return '';
    const clean = val.replace(/["']/g, '').trim().toLowerCase();
    
    // Scan all users in state
    for (const u of state.users) {
        if (u.keywords) {
            const keywordsList = u.keywords.split(',').map(k => k.trim().toLowerCase()).filter(k => k);
            for (const kw of keywordsList) {
                if (clean.includes(kw)) {
                    return u.name;
                }
            }
        }
    }
    
    // Secondary check: prefix check
    for (const u of state.users) {
        if (clean.startsWith(u.name.toLowerCase().substring(0, 1))) {
            return u.name;
        }
    }
    
    return '';
}

// Normalise dates (Support MM/DD/YYYY, YYYY-MM-DD, and similar)
function parseStandardDate(dateStr) {
    if (!dateStr) return null;
    
    // Remove quotes
    dateStr = dateStr.replace(/["']/g, '').trim();

    // Check if it's already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

    // Check standard slash formats MM/DD/YYYY or DD/MM/YYYY
    const slashParts = dateStr.split('/');
    if (slashParts.length === 3) {
        let m = parseInt(slashParts[0]);
        let d = parseInt(slashParts[1]);
        let y = parseInt(slashParts[2]);
        
        // Fix 2-digit years
        if (y < 100) y += 2000;
        
        // Assuming US MM/DD/YYYY primarily. If month > 12, swap
        if (m > 12 && d <= 12) {
            const temp = m; m = d; d = temp;
        }

        if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
            return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        }
    }

    // Check dash formats MM-DD-YYYY or YYYY-MM-DD
    const dashParts = dateStr.split('-');
    if (dashParts.length === 3) {
        if (dashParts[0].length === 4) {
            // YYYY-MM-DD
            return dateStr;
        }
        let m = parseInt(dashParts[0]);
        let d = parseInt(dashParts[1]);
        let y = parseInt(dashParts[2]);
        if (y < 100) y += 2000;
        if (m > 12 && d <= 12) {
            const temp = m; m = d; d = temp;
        }
        if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
            return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        }
    }

    // Fallback using Native JS Date parser
    const dObj = new Date(dateStr);
    if (!isNaN(dObj.getTime())) {
        const y = dObj.getFullYear();
        const m = String(dObj.getMonth() + 1).padStart(2, '0');
        const d = String(dObj.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    return null;
}

// Clean and Parse amount string into floating value
function parseStandardAmount(amtStr) {
    if (!amtStr) return NaN;
    
    // Remove dollar signs, commas, parenthesis, and spacing
    let clean = amtStr.replace(/[\$\s,]/g, '').trim();
    
    // Handle parenthesis representing negative values e.g., (12.50) -> -12.50
    if (clean.startsWith('(') && clean.endsWith(')')) {
        clean = '-' + clean.substring(1, clean.length - 1);
    }
    
    // Handle Credit card CR suffixes representing payments/credits e.g., 200.00CR -> -200.00
    if (clean.toUpperCase().endsWith('CR')) {
        clean = '-' + clean.substring(0, clean.length - 2);
    }

    return parseFloat(clean);
}

// Rules-based auto-categorization
function autoCategorize(description, amount) {
    // If the transaction amount is negative (credit/refund), default to income unless mapped otherwise
    if (amount < 0) {
        return 'cat-income';
    }

    const descLower = description.toLowerCase();
    for (const rule of state.rules) {
        if (descLower.includes(rule.keyword.toLowerCase())) {
            return rule.categoryId;
        }
    }
    
    return 'cat-other'; // Default catch-all category
}

// Display parsed previews and preview ledger
function renderParsedPreview() {
    const listContainer = document.getElementById('parsed-table-container');
    const emptyState = document.getElementById('importer-empty-state');
    const actionsPanel = document.getElementById('preview-actions-panel');
    const countInfo = document.getElementById('parsed-count-info');
    const countBadge = document.getElementById('import-count-badge');
    const tbody = document.getElementById('parsed-transactions-tbody');

    if (!tbody) return;
    tbody.innerHTML = '';

    if (currentParsedTransactions.length === 0) {
        listContainer.classList.add('hidden');
        emptyState.classList.remove('hidden');
        actionsPanel.classList.add('hidden');
        countInfo.textContent = 'No statements parsed yet. Upload a statement to get started.';
        return;
    }

    emptyState.classList.add('hidden');
    listContainer.classList.remove('hidden');
    actionsPanel.classList.remove('hidden');
    countInfo.textContent = `Confirm and verify the detected transactions.`;
    countBadge.textContent = `(${currentParsedTransactions.length})`;

    currentParsedTransactions.forEach((t, idx) => {
        const tr = document.createElement('tr');
        
        const isIncome = t.amount < 0;
        const displayAmt = Math.abs(t.amount).toFixed(2);
        const amtText = isIncome ? `-$${displayAmt}` : `$${displayAmt}`;
        const amtClass = isIncome ? 'text-success' : '';

        // Category dropdown for individual corrections
        let categorySelectHtml = `<select class="select-row-category" data-index="${idx}">`;
        state.categories.forEach(c => {
            const selected = c.id === t.categoryId ? 'selected' : '';
            categorySelectHtml += `<option value="${c.id}" ${selected}>${escapeHTML(c.name)}</option>`;
        });
        categorySelectHtml += `</select>`;

        // User dropdown for individual corrections
        let parsedUserSelectHtml = `<select class="select-parsed-user" data-index="${idx}">`;
        parsedUserSelectHtml += `<option value="" ${!t.user ? 'selected' : ''}>—</option>`;
        state.users.forEach(u => {
            parsedUserSelectHtml += `<option value="${u.name}" ${t.user === u.name ? 'selected' : ''}>${escapeHTML(u.name)}</option>`;
        });
        parsedUserSelectHtml += `</select>`;

        // Scope dropdown for individual corrections
        let parsedScopeSelectHtml = `<select class="select-parsed-scope" data-index="${idx}">`;
        parsedScopeSelectHtml += `<option value="single" ${(t.purchaseType || 'single') === 'single' ? 'selected' : ''}>Single</option>`;
        parsedScopeSelectHtml += `<option value="group" ${(t.purchaseType || 'single') === 'group' ? 'selected' : ''}>Group</option>`;
        parsedScopeSelectHtml += `</select>`;

        tr.innerHTML = `
            <td>${t.date}</td>
            <td style="font-weight: 500;">${escapeHTML(t.description)}</td>
            <td>${parsedUserSelectHtml}</td>
            <td>${parsedScopeSelectHtml}</td>
            <td class="${amtClass}" style="font-weight:700;">${amtText}</td>
            <td>${categorySelectHtml}</td>
            <td>
                <button class="btn-action-row delete delete-parsed-btn" data-index="${idx}">
                    <i data-lucide="x"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Wire categories selector edits
    tbody.querySelectorAll('.select-row-category').forEach(sel => {
        sel.addEventListener('change', (e) => {
            const index = parseInt(e.target.getAttribute('data-index'));
            currentParsedTransactions[index].categoryId = e.target.value;
        });
    });

    // Wire user selector edits
    tbody.querySelectorAll('.select-parsed-user').forEach(sel => {
        sel.addEventListener('change', (e) => {
            const index = parseInt(e.target.getAttribute('data-index'));
            currentParsedTransactions[index].user = e.target.value;
        });
    });

    // Wire scope selector edits
    tbody.querySelectorAll('.select-parsed-scope').forEach(sel => {
        sel.addEventListener('change', (e) => {
            const index = parseInt(e.target.getAttribute('data-index'));
            currentParsedTransactions[index].purchaseType = e.target.value;
        });
    });

    // Wire delete single item
    tbody.querySelectorAll('.delete-parsed-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.currentTarget.getAttribute('data-index'));
            currentParsedTransactions.splice(index, 1);
            renderParsedPreview();
        });
    });

    lucide.createIcons();
}

// Bulk Save parsed transaction list to transactions ledger
function handleImportParsedTransactions() {
    if (currentParsedTransactions.length === 0) return;

    // Save
    currentParsedTransactions.forEach(t => {
        // Create unique global ID
        t.id = 'tx-' + Date.now() + '-' + Math.floor(Math.random() * 1000000);
        state.transactions.push(t);
    });

    saveState();
    const count = currentParsedTransactions.length;
    
    currentParsedTransactions = [];
    resetImporterUI();
    populateMonthSelectors();
    
    alert(`Successfully imported ${count} transactions into your ledger!`);
    navigateToView('transactions');
}

// ==========================================================================
// CLIENT-SIDE PDF PARSING ENGINE
// ==========================================================================

async function extractTransactionsFromPDF(file) {
    const logEl = document.getElementById('pdf-console-log');
    
    const writeLog = (msg) => {
        logEl.textContent += msg + '\n';
        logEl.scrollTop = logEl.scrollHeight;
    };

    try {
        writeLog('Reading file array buffer...');
        const arrayBuffer = await file.arrayBuffer();
        
        writeLog('Initializing PDF.js document parser...');
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        
        writeLog(`Loaded PDF document. Total Pages: ${pdf.numPages}`);
        writeLog('Reconstructing lines vertically from text items...');
        
        let fullExtractedText = "";
        
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            writeLog(`Scanning page ${pageNum}...`);
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            
            // Reconstruct text horizontally line-by-line using Y height sorting
            const pageText = reconstructTextFromPageItems(textContent.items);
            fullExtractedText += pageText + "\n";
        }
        
        writeLog('Done extracting text. Commencing Heuristic Transaction Scanning...');
        parseTransactionsFromRawText(fullExtractedText, writeLog);

    } catch (err) {
        writeLog(`\n[ERROR] PDF parsing failed: ${err.message}`);
        alert('Failed to parse PDF statement. Please make sure it is a valid, readable text PDF statement.');
    }
}

// Groups individual text items on a page by coordinates to build clear lines
function reconstructTextFromPageItems(items) {
    const tolerance = 4; // Max vertical difference in Y coord to combine onto a single line
    const linesMap = {};

    for (const item of items) {
        if (!item.str.trim()) continue;

        const x = item.transform[4];
        const y = item.transform[5];

        let foundYKey = null;
        for (const existingY of Object.keys(linesMap)) {
            if (Math.abs(parseFloat(existingY) - y) < tolerance) {
                foundYKey = existingY;
                break;
            }
        }

        if (foundYKey !== null) {
            linesMap[foundYKey].push({ x, str: item.str });
        } else {
            linesMap[y] = [{ x, str: item.str }];
        }
    }

    // Sort descending (large Y values are top page headers)
    const sortedYKeys = Object.keys(linesMap).sort((a, b) => parseFloat(b) - parseFloat(a));

    let pageText = "";
    sortedYKeys.forEach(yKey => {
        // Sort items inside a line horizontally by X coordinate ascending
        const rowItems = linesMap[yKey].sort((a, b) => a.x - b.x);
        const lineText = rowItems.map(item => item.str).join(" ");
        pageText += lineText + "\n";
    });

    return pageText;
}

// Search extracted lines for transaction entries (Regex Scans)
function parseTransactionsFromRawText(text, logFn) {
    const lines = text.split('\n');
    logFn(`Total extracted text lines to scan: ${lines.length}`);
    
    // Regex patterns
    // 1. Amount: matches standard pricing labels with digits and double floats e.g., $15.20, -100.40, 20.30CR, 200.00-
    const amountPattern = /(-?\$?\d{1,3}(?:,\d{3})*\.\d{2}(?:\s*CR|-)?)/gi;

    // 2. Dates: Matches common month names or date splits
    const dateRegexes = [
        /\b(\d{1,2})[/\.-](\d{1,2})(?:[/\.-](\d{2,4}))?\b/, // 07/13 or 07/13/2026 or 2026/07/13
        /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2})(?:\s*,?\s*(\d{2,4}))?\b/i, // Jul 13 or July 13, 2026
        /\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\b/i // 13 Jul
    ];

    let detectedCount = 0;
    
    lines.forEach((line, index) => {
        const trimmed = line.trim();
        if (trimmed.length < 10) return; // Ignore very short lines (mostly page numbers, headers)
        
        // Scan line for amounts
        let amountsList = [];
        let match;
        // reset regex index
        amountPattern.lastIndex = 0;
        
        while ((match = amountPattern.exec(trimmed)) !== null) {
            amountsList.push({
                valStr: match[0],
                start: match.index,
                end: amountPattern.lastIndex
            });
        }
        
        if (amountsList.length === 0) return; // No money value on line

        // Find date match
        let dateMatch = null;
        let dateVal = null;
        let dateStart = -1;
        let dateEnd = -1;

        for (const regex of dateRegexes) {
            const dMatch = regex.exec(trimmed);
            if (dMatch) {
                dateMatch = dMatch;
                dateStart = dMatch.index;
                dateEnd = regex.lastIndex;
                break;
            }
        }

        if (!dateMatch) return; // No date found on line

        // Determine if this is a transaction line.
        // Usually, a transaction line contains a Date (typically at the start) and an Amount (typically at the end)
        // Description lies between them.
        
        // Let's pick the last amount on the line for transaction values, 
        // to avoid picking up arbitrary numbers in descriptions
        const targetAmtItem = amountsList[amountsList.length - 1];
        
        // Ensure date and amount do not overlap
        if (dateStart < targetAmtItem.start) {
            // Description is between Date and Amount
            let description = trimmed.substring(dateEnd, targetAmtItem.start).trim();
            
            // Clean up description symbols
            description = description.replace(/^[^a-zA-Z0-9\s]+/, '').replace(/[^a-zA-Z0-9\s\.\*\#\-]+$/, '').trim();
            
            // If the description is empty or too short, let's ignore or adjust
            if (description.length < 3) return;

            // Normalize amount & date
            const cleanAmt = parseStandardAmount(targetAmtItem.valStr);
            const cleanDate = parseStandardDate(dateMatch[0]);

            if (!cleanDate || isNaN(cleanAmt)) return;

            // Auto categorization rules mapping
            const categoryId = autoCategorize(description, cleanAmt);

            currentParsedTransactions.push({
                id: 'parsed-pdf-' + index + '-' + Date.now(),
                date: cleanDate,
                description,
                amount: cleanAmt,
                categoryId: categoryId,
                purchaseType: 'single'
            });

            detectedCount++;
        }
    });

    logFn(`Heuristic Scanning Completed! Auto-detected: ${detectedCount} transactions.`);
    
    // Hide pdf logs console on success
    document.getElementById('pdf-processing-console').classList.add('hidden');
    renderParsedPreview();
}

// Utility to escape HTML tag markers
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/"/g, "&quot;")
              .replace(/'/g, "&#039;");
}

// ==========================================================================
// VIEW RENDERING: NET WORTH CALCULATOR
// ==========================================================================

function formatCurrency(val) {
    const absVal = Math.abs(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return (val < 0 ? '-' : '') + '$' + absVal;
}

function renderNetWorthView() {
    const activeMonth = state.selectedMonth;

    // Filter properties and accounts specifically for the selected month (no carry-forward)
    const activePropertiesList = state.netWorthProperties.filter(p => p.month === activeMonth);
    const activeAccountsList = state.netWorthAccounts.filter(a => a.month === activeMonth);

    // Calculate balances
    const monthData = getNetWorthForMonth(activeMonth);
    const totalAssets = monthData.assets;
    const totalLiabilities = monthData.liabilities;
    const netWorth = monthData.netWorth;

    // Update stats UI
    const nwTotalEl = document.getElementById('networth-total');
    const nwAssetsEl = document.getElementById('networth-assets');
    const nwLiabilitiesEl = document.getElementById('networth-liabilities');
    
    if (nwTotalEl) nwTotalEl.textContent = formatCurrency(netWorth);
    if (nwAssetsEl) nwAssetsEl.textContent = formatCurrency(totalAssets);
    if (nwLiabilitiesEl) nwLiabilitiesEl.textContent = formatCurrency(totalLiabilities);

    const datalist = document.getElementById('existing-properties');
    if (datalist) {
        datalist.innerHTML = '';
        const uniquePropertyNames = Array.from(new Set(state.netWorthProperties.map(p => p.name.trim())));
        uniquePropertyNames.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            datalist.appendChild(option);
        });
    }

    // Render properties table
    const propertiesTbody = document.getElementById('properties-tbody');
    const propertiesEmptyState = document.getElementById('properties-empty-state');
    if (propertiesTbody) {
        propertiesTbody.innerHTML = '';
        if (activePropertiesList.length === 0) {
            if (propertiesEmptyState) propertiesEmptyState.classList.remove('hidden');
        } else {
            if (propertiesEmptyState) propertiesEmptyState.classList.add('hidden');
            activePropertiesList.forEach(prop => {
                const equity = prop.value - prop.mortgage;
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${escapeHTML(prop.name)}</strong></td>
                    <td>${formatCurrency(prop.value)}</td>
                    <td>${formatCurrency(prop.mortgage)}</td>
                    <td><span class="badge ${equity >= 0 ? 'badge-success' : 'badge-danger'}">${formatCurrency(equity)}</span></td>
                    <td class="text-right">
                        <button class="btn-action-row edit-property-btn" data-id="${prop.id}" title="Edit Property (this month)">
                            <i data-lucide="edit-2"></i>
                        </button>
                        <button class="btn-action-row delete-property-btn" data-id="${prop.id}" title="Delete Property (all time)">
                            <i data-lucide="trash-2"></i>
                        </button>
                    </td>
                `;
                propertiesTbody.appendChild(tr);
            });

            // Wire edit/delete click handlers for properties
            propertiesTbody.querySelectorAll('.edit-property-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.currentTarget.getAttribute('data-id');
                    loadPropertyIntoForm(id);
                });
            });
            propertiesTbody.querySelectorAll('.delete-property-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.currentTarget.getAttribute('data-id');
                    handleDeleteProperty(id);
                });
            });
        }
    }

    // Render accounts table grouped by category
    const accountsTbody = document.getElementById('accounts-tbody');
    const accountsEmptyState = document.getElementById('accounts-empty-state');
    if (accountsTbody) {
        accountsTbody.innerHTML = '';
        if (activeAccountsList.length === 0) {
            if (accountsEmptyState) accountsEmptyState.classList.remove('hidden');
        } else {
            if (accountsEmptyState) accountsEmptyState.classList.add('hidden');

            const categoriesConfig = [
                { type: 'cash', label: 'Cash Accounts', dotColor: '#10b981' },
                { type: 'investment', label: 'Investments', dotColor: '#06b6d4' },
                { type: 'retirement', label: 'Retirement Accounts', dotColor: '#a855f7' },
                { type: 'hsa', label: 'Health Savings Accounts (HSA)', dotColor: '#f59e0b' },
                { type: 'liability', label: 'Liabilities', dotColor: '#ef4444' }
            ];

            categoriesConfig.forEach(cat => {
                const catAccounts = activeAccountsList.filter(a => a.type === cat.type || (cat.type === 'cash' && a.type === 'asset'));
                if (catAccounts.length === 0) return;

                // 1. Category header row
                const headerTr = document.createElement('tr');
                headerTr.innerHTML = `
                    <td colspan="4" style="background: rgba(255, 255, 255, 0.02); font-weight: 700; font-size: 0.85rem; padding: 0.75rem 1rem; border-top: 1px solid var(--border-color);">
                        <div style="display: flex; align-items: center; gap: 8px; color: var(--text-primary);">
                            <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${cat.dotColor};"></span>
                            ${cat.label}
                        </div>
                    </td>
                `;
                accountsTbody.appendChild(headerTr);

                // 2. Individual account rows
                let subtotal = 0;
                catAccounts.forEach(acc => {
                    subtotal += acc.value;
                    const tr = document.createElement('tr');
                    
                    let badgeHtml = '';
                    if (acc.type === 'cash') {
                        badgeHtml = '<span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.25); min-width: 90px; text-align: center;">Cash</span>';
                    } else if (acc.type === 'investment') {
                        badgeHtml = '<span class="badge" style="background: rgba(6, 182, 212, 0.15); color: #06b6d4; border: 1px solid rgba(6, 182, 212, 0.25); min-width: 90px; text-align: center;">Investments</span>';
                    } else if (acc.type === 'retirement') {
                        badgeHtml = '<span class="badge" style="background: rgba(168, 85, 247, 0.15); color: #a855f7; border: 1px solid rgba(168, 85, 247, 0.25); min-width: 90px; text-align: center;">Retirement</span>';
                    } else if (acc.type === 'hsa') {
                        badgeHtml = '<span class="badge" style="background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.25); min-width: 90px; text-align: center;">HSA</span>';
                    } else if (acc.type === 'liability') {
                        badgeHtml = '<span class="badge badge-danger" style="min-width: 90px; text-align: center;">Liability</span>';
                    } else {
                        badgeHtml = '<span class="badge badge-success" style="min-width: 90px; text-align: center;">Asset</span>';
                    }

                    tr.innerHTML = `
                        <td style="padding-left: 2rem;"><strong>${escapeHTML(acc.name)}</strong></td>
                        <td>${badgeHtml}</td>
                        <td>${formatCurrency(acc.value)}</td>
                        <td class="text-right">
                            <button class="btn-action-row edit-account-btn" data-id="${acc.id}" title="Edit Account (this month)">
                                <i data-lucide="edit-2"></i>
                            </button>
                            <button class="btn-action-row delete-account-btn" data-id="${acc.id}" title="Delete Account (all time)">
                                <i data-lucide="trash-2"></i>
                            </button>
                        </td>
                    `;
                    accountsTbody.appendChild(tr);
                });

                // 3. Category subtotal row
                const subtotalTr = document.createElement('tr');
                subtotalTr.innerHTML = `
                    <td style="padding-left: 2rem; font-weight: 700; color: var(--text-secondary); font-size: 0.8rem;">Subtotal</td>
                    <td></td>
                    <td style="font-weight: 700; color: var(--text-secondary); font-size: 0.8rem; border-top: 1px dashed var(--border-color);">${formatCurrency(subtotal)}</td>
                    <td></td>
                `;
                accountsTbody.appendChild(subtotalTr);
            });

            // Wire edit/delete click handlers for accounts
            accountsTbody.querySelectorAll('.edit-account-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.currentTarget.getAttribute('data-id');
                    loadAccountIntoForm(id);
                });
            });
            accountsTbody.querySelectorAll('.delete-account-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.currentTarget.getAttribute('data-id');
                    handleDeleteAccount(id);
                });
            });
        }
    }

    renderNetWorthCharts(totalAssets, totalLiabilities, activeAccountsList, activePropertiesList);
    lucide.createIcons();
}

// Net Worth History Calculation Engine
function getNetWorthForMonth(targetMonth) {
    let assetsSum = 0;
    let liabilitiesSum = 0;

    state.netWorthAccounts.forEach(acc => {
        if (acc.month === targetMonth) {
            if (acc.type !== 'liability') {
                assetsSum += acc.value;
            } else {
                liabilitiesSum += acc.value;
            }
        }
    });

    state.netWorthProperties.forEach(prop => {
        if (prop.month === targetMonth) {
            assetsSum += prop.value;
            liabilitiesSum += prop.mortgage;
        }
    });

    return {
        assets: assetsSum,
        liabilities: liabilitiesSum,
        netWorth: assetsSum - liabilitiesSum
    };
}

// Timeline Generator
function getTrendMonths(timeframe) {
    const months = [];
    const [year, month] = state.selectedMonth.split('-').map(Number);
    
    let count = 12;
    if (timeframe === '6') count = 6;
    else if (timeframe === 'all') {
        let earliest = state.selectedMonth;
        state.netWorthAccounts.forEach(a => {
            if (a.month && a.month < earliest) earliest = a.month;
        });
        state.netWorthProperties.forEach(p => {
            if (p.month && p.month < earliest) earliest = p.month;
        });
        state.transactions.forEach(t => {
            if (t.date && t.date.substring(0, 7) < earliest) earliest = t.date.substring(0, 7);
        });

        const [startYear, startMonth] = earliest.split('-').map(Number);
        count = (year - startYear) * 12 + (month - startMonth) + 1;
        if (count < 6) count = 6; // Standard minimum bound
    }

    for (let i = count - 1; i >= 0; i--) {
        const d = new Date(year, (month - 1) - i, 1);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        months.push(`${yyyy}-${mm}`);
    }
    return months;
}

// Active record getters for loading forms
function getActivePropertyRecord(id, targetMonth) {
    return state.netWorthProperties.find(p => p.id === id && p.month === targetMonth) || null;
}

function getActiveAccountRecord(id, targetMonth) {
    return state.netWorthAccounts.find(a => a.id === id && a.month === targetMonth) || null;
}

// Property Form handlers
function loadPropertyIntoForm(id) {
    const prop = getActivePropertyRecord(id, state.selectedMonth);
    if (!prop) return;
    document.getElementById('property-edit-id').value = prop.id;
    document.getElementById('property-name').value = prop.name;
    document.getElementById('property-value').value = prop.value;
    document.getElementById('property-mortgage').value = prop.mortgage;
    
    document.getElementById('property-submit-text').textContent = 'Update Property';
    const submitIcon = document.getElementById('property-submit-icon');
    if (submitIcon) {
        submitIcon.setAttribute('data-lucide', 'check-circle');
    }
    document.getElementById('btn-cancel-property-edit').classList.remove('hidden');
    lucide.createIcons();
}

function resetPropertyForm() {
    document.getElementById('property-edit-id').value = '';
    document.getElementById('form-property').reset();
    document.getElementById('property-submit-text').textContent = 'Add Property';
    const submitIcon = document.getElementById('property-submit-icon');
    if (submitIcon) {
        submitIcon.setAttribute('data-lucide', 'plus-circle');
    }
    document.getElementById('btn-cancel-property-edit').classList.add('hidden');
    lucide.createIcons();
}

function handleSaveProperty(e) {
    e.preventDefault();
    const editId = document.getElementById('property-edit-id').value;
    const name = document.getElementById('property-name').value.trim();
    const value = parseFloat(document.getElementById('property-value').value);
    const mortgage = parseFloat(document.getElementById('property-mortgage').value);
    
    if (!name || isNaN(value) || isNaN(mortgage)) {
        alert('Please fill out all fields with valid numbers.');
        return;
    }

    const currentMonth = state.selectedMonth;
    
    if (editId) {
        // Edit property: Check if a record exists for this specific month
        const existingIdx = state.netWorthProperties.findIndex(p => p.id === editId && p.month === currentMonth);
        if (existingIdx !== -1) {
            state.netWorthProperties[existingIdx].name = name;
            state.netWorthProperties[existingIdx].value = value;
            state.netWorthProperties[existingIdx].mortgage = mortgage;
        } else {
            // Carriage forward: Create a new history point for this month
            state.netWorthProperties.push({
                id: editId,
                name,
                value,
                mortgage,
                month: currentMonth
            });
        }
    } else {
        const newProp = {
            id: 'prop-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
            name,
            value,
            mortgage,
            month: currentMonth
        };
        state.netWorthProperties.push(newProp);
    }
    
    saveState();
    resetPropertyForm();
    renderNetWorthView();
}

function handleDeleteProperty(id) {
    const prop = state.netWorthProperties.find(p => p.id === id);
    if (!prop) return;
    if (confirm(`Are you sure you want to delete property "${prop.name}" from all months?`)) {
        state.netWorthProperties = state.netWorthProperties.filter(p => p.name.trim() !== prop.name.trim());
        saveState();
        renderNetWorthView();
    }
}

// Account Form handlers
function loadAccountIntoForm(id) {
    const acc = getActiveAccountRecord(id, state.selectedMonth);
    if (!acc) return;
    document.getElementById('account-edit-id').value = acc.id;
    document.getElementById('account-name').value = acc.name;
    document.getElementById('account-type').value = acc.type;
    document.getElementById('account-value').value = acc.value;
    
    document.getElementById('account-submit-text').textContent = 'Update Account';
    const submitIcon = document.getElementById('account-submit-icon');
    if (submitIcon) {
        submitIcon.setAttribute('data-lucide', 'check-circle');
    }
    document.getElementById('btn-cancel-account-edit').classList.remove('hidden');
    lucide.createIcons();
}

function resetAccountForm() {
    document.getElementById('account-edit-id').value = '';
    document.getElementById('form-account').reset();
    document.getElementById('account-submit-text').textContent = 'Add Account';
    const submitIcon = document.getElementById('account-submit-icon');
    if (submitIcon) {
        submitIcon.setAttribute('data-lucide', 'plus-circle');
    }
    document.getElementById('btn-cancel-account-edit').classList.add('hidden');
    lucide.createIcons();
}

function handleSaveAccount(e) {
    e.preventDefault();
    const editId = document.getElementById('account-edit-id').value;
    const name = document.getElementById('account-name').value.trim();
    const type = document.getElementById('account-type').value;
    const value = parseFloat(document.getElementById('account-value').value);
    
    if (!name || !type || isNaN(value)) {
        alert('Please fill out all fields with valid values.');
        return;
    }

    const currentMonth = state.selectedMonth;
    
    if (editId) {
        const existingIdx = state.netWorthAccounts.findIndex(a => a.id === editId && a.month === currentMonth);
        if (existingIdx !== -1) {
            state.netWorthAccounts[existingIdx].name = name;
            state.netWorthAccounts[existingIdx].type = type;
            state.netWorthAccounts[existingIdx].value = value;
        } else {
            // Carriage forward: Create a new history point for this month
            state.netWorthAccounts.push({
                id: editId,
                name,
                type,
                value,
                month: currentMonth
            });
        }
    } else {
        const newAcc = {
            id: 'acc-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
            name,
            type,
            value,
            month: currentMonth
        };
        state.netWorthAccounts.push(newAcc);
    }
    
    saveState();
    resetAccountForm();
    renderNetWorthView();
}

function handleDeleteAccount(id) {
    const acc = state.netWorthAccounts.find(a => a.id === id);
    if (!acc) return;
    if (confirm(`Are you sure you want to delete account "${acc.name}" from all months?`)) {
        state.netWorthAccounts = state.netWorthAccounts.filter(a => a.name.trim() !== acc.name.trim());
        saveState();
        renderNetWorthView();
    }
}

// Chart.js renderings for Net Worth
function renderNetWorthCharts(totalAssets, totalLiabilities, accounts, properties) {
    const isDark = document.body.classList.contains('dark-theme');
    const textThemeColor = isDark ? '#9ca3af' : '#475569';
    const gridThemeColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
    
    // 1. Historical Trend Line/Area Chart
    const ctxTrend = document.getElementById('netWorthTrendChart');
    if (ctxTrend) {
        if (netWorthTrendChartInstance) {
            netWorthTrendChartInstance.destroy();
        }

        const timeframe = document.getElementById('trend-timeframe')?.value || '12';
        const trendMonths = getTrendMonths(timeframe);
        
        const netWorthValues = [];
        
        trendMonths.forEach(m => {
            const data = getNetWorthForMonth(m);
            netWorthValues.push(data.netWorth);
        });

        const labels = trendMonths.map(m => {
            const [y, mm] = m.split('-');
            const date = new Date(parseInt(y), parseInt(mm) - 1, 1);
            return date.toLocaleString('default', { month: 'short', year: '2-digit' });
        });

        const ctx = ctxTrend.getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 0, 250);
        gradient.addColorStop(0, 'rgba(99, 102, 241, 0.25)'); // Indigo glow
        gradient.addColorStop(1, 'rgba(99, 102, 241, 0.00)');

        netWorthTrendChartInstance = new Chart(ctxTrend, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Net Worth',
                        data: netWorthValues,
                        borderColor: '#6366f1',
                        borderWidth: 3,
                        backgroundColor: gradient,
                        fill: true,
                        tension: 0.35,
                        pointBackgroundColor: '#6366f1',
                        pointHoverRadius: 6,
                        pointHoverBackgroundColor: '#6366f1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: textThemeColor,
                            font: { family: 'Outfit', size: 11 }
                        }
                    },
                    tooltip: {
                        padding: 10,
                        backgroundColor: isDark ? '#111827' : '#ffffff',
                        titleColor: isDark ? '#ffffff' : '#0f172a',
                        bodyColor: isDark ? '#9ca3af' : '#475569',
                        borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                return ' ' + context.dataset.label + ': $' + context.raw.toLocaleString('en-US', { minimumFractionDigits: 0 });
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: {
                            color: textThemeColor,
                            font: { family: 'Plus Jakarta Sans', size: 9 }
                        }
                    },
                    y: {
                        grid: { color: gridThemeColor },
                        ticks: {
                            color: textThemeColor,
                            font: { family: 'Plus Jakarta Sans', size: 9 },
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    }

    // 2. Net Worth Composition (Assets vs Liabilities bar chart for active month)
    const ctxBar = document.getElementById('netWorthChart');
    if (ctxBar) {
        if (netWorthChartInstance) {
            netWorthChartInstance.destroy();
        }
        
        const netWorth = totalAssets - totalLiabilities;
        
        netWorthChartInstance = new Chart(ctxBar, {
            type: 'bar',
            data: {
                labels: ['Total Assets', 'Total Liabilities', 'Net Worth'],
                datasets: [{
                    label: 'Balance ($)',
                    data: [totalAssets, totalLiabilities, netWorth],
                    backgroundColor: [
                        '#10b981', // Assets - Green
                        '#ef4444', // Liabilities - Red
                        '#6366f1'  // Net Worth - Indigo
                    ],
                    borderRadius: 4,
                    barThickness: 32
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        padding: 10,
                        backgroundColor: isDark ? '#111827' : '#ffffff',
                        titleColor: isDark ? '#ffffff' : '#0f172a',
                        bodyColor: isDark ? '#9ca3af' : '#475569',
                        borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                return ' ' + context.label + ': $' + context.raw.toLocaleString('en-US', { minimumFractionDigits: 2 });
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: {
                            color: textThemeColor,
                            font: { family: 'Plus Jakarta Sans', size: 11, weight: '600' }
                        }
                    },
                    y: {
                        grid: { color: gridThemeColor },
                        ticks: {
                            color: textThemeColor,
                            font: { family: 'Plus Jakarta Sans', size: 10 },
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    }

    // 3. Asset Allocation (Doughnut Chart of Assets and Property Equity for active month)
    const ctxDoughnut = document.getElementById('netWorthAllocationChart');
    if (ctxDoughnut) {
        if (netWorthAllocationChartInstance) {
            netWorthAllocationChartInstance.destroy();
        }
        
        let realEstateSum = 0;
        let cashSum = 0;
        let investmentsSum = 0;
        let retirementSum = 0;
        let hsaSum = 0;

        properties.forEach(prop => {
            const equity = prop.value - prop.mortgage;
            if (equity > 0) {
                realEstateSum += equity;
            }
        });

        accounts.forEach(acc => {
            if (acc.value > 0) {
                if (acc.type === 'cash' || acc.type === 'asset') {
                    cashSum += acc.value;
                } else if (acc.type === 'investment') {
                    investmentsSum += acc.value;
                } else if (acc.type === 'retirement') {
                    retirementSum += acc.value;
                } else if (acc.type === 'hsa') {
                    hsaSum += acc.value;
                }
            }
        });

        const allocationItems = [];
        if (realEstateSum > 0) {
            allocationItems.push({ name: 'Real Estate Equity', value: realEstateSum, color: '#6366f1' });
        }
        if (cashSum > 0) {
            allocationItems.push({ name: 'Cash Equivalents', value: cashSum, color: '#10b981' });
        }
        if (investmentsSum > 0) {
            allocationItems.push({ name: 'Taxable Investments', value: investmentsSum, color: '#06b6d4' });
        }
        if (retirementSum > 0) {
            allocationItems.push({ name: 'Retirement Accounts', value: retirementSum, color: '#a855f7' });
        }
        if (hsaSum > 0) {
            allocationItems.push({ name: 'Health Savings (HSA)', value: hsaSum, color: '#f59e0b' });
        }

        const labels = allocationItems.map(item => item.name);
        const values = allocationItems.map(item => item.value);
        const bgColors = allocationItems.map(item => item.color);

        if (labels.length === 0) {
            labels.push('No Assets');
            values.push(1);
            bgColors.push(isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)');
        }
        
        netWorthAllocationChartInstance = new Chart(ctxDoughnut, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: bgColors,
                    borderWidth: isDark ? 2 : 1,
                    borderColor: isDark ? '#1f2937' : '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: textThemeColor,
                            font: { family: 'Outfit', size: 10 }
                        }
                    },
                    tooltip: {
                        padding: 10,
                        backgroundColor: isDark ? '#111827' : '#ffffff',
                        titleColor: isDark ? '#ffffff' : '#0f172a',
                        bodyColor: isDark ? '#9ca3af' : '#475569',
                        borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                if (context.label === 'No Assets') return ' No Assets';
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((context.raw / total) * 100);
                                return ' ' + context.label + ': $' + context.raw.toLocaleString('en-US', { minimumFractionDigits: 0 }) + ' (' + percentage + '%)';
                            }
                        }
                    }
                },
                cutout: '70%'
            }
        });
    }
}

// ==========================================================================
// VIEW RENDERING: USERS SETUP
// ==========================================================================

function renderUserColorSelector() {
    const container = document.getElementById('user-color-picker');
    if (!container) return;
    container.innerHTML = '';

    AVAILABLE_COLORS.forEach(hexColor => {
        const item = document.createElement('div');
        item.className = 'color-option';
        if (hexColor === '#3b82f6') {
            item.classList.add('selected');
        }
        item.style.backgroundColor = hexColor;
        item.setAttribute('data-color', hexColor);
        
        item.addEventListener('click', () => {
            container.querySelectorAll('.color-option').forEach(el => el.classList.remove('selected'));
            item.classList.add('selected');
            document.getElementById('user-color').value = hexColor;
        });
        container.appendChild(item);
    });
}

function renderUsersView() {
    const tbody = document.getElementById('users-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    state.users.forEach(u => {
        const tr = document.createElement('tr');
        
        // Convert hex to rgba for dynamic glass badge look
        const hex = u.color.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        const bgRgba = `rgba(${r}, ${g}, ${b}, 0.12)`;
        const borderRgba = `rgba(${r}, ${g}, ${b}, 0.25)`;
        
        const userBadge = `<span class="user-badge" style="background: ${bgRgba}; color: ${u.color}; border: 1px solid ${borderRgba}; font-weight: 600;">${escapeHTML(u.name)}</span>`;
        const keywordsText = u.keywords ? escapeHTML(u.keywords) : '<span class="text-muted text-xs">None</span>';

        tr.innerHTML = `
            <td style="font-weight: 500;">${userBadge}</td>
            <td><code>${keywordsText}</code></td>
            <td class="text-right">
                <button class="btn-action-row edit-user-btn" data-user-id="${u.id}" title="Edit User">
                    <i data-lucide="edit-3"></i>
                </button>
                <button class="btn-action-row delete delete-user-btn" data-user-id="${u.id}" title="Delete User">
                    <i data-lucide="trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Wire up events
    tbody.querySelectorAll('.edit-user-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const userId = e.currentTarget.getAttribute('data-user-id');
            loadUserIntoForm(userId);
        });
    });

    tbody.querySelectorAll('.delete-user-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const userId = e.currentTarget.getAttribute('data-user-id');
            handleDeleteUser(userId);
        });
    });

    resetUserForm();
    lucide.createIcons();
}

function handleSaveUser(e) {
    e.preventDefault();

    const editId = document.getElementById('user-edit-id').value;
    const name = document.getElementById('user-name').value.trim();
    const color = document.getElementById('user-color').value;
    const keywords = document.getElementById('user-keywords').value.trim();

    if (!name) {
        alert('Please specify a username.');
        return;
    }

    // Check duplicate name (except if we are editing and name is unchanged)
    const duplicate = state.users.some(u => u.name.toLowerCase() === name.toLowerCase() && u.id !== editId);
    if (duplicate) {
        alert('A user with this name already exists.');
        return;
    }

    if (editId) {
        // Editing existing user
        const user = state.users.find(u => u.id === editId);
        if (user) {
            // Update transactions user tags if name changed
            if (user.name !== name) {
                state.transactions.forEach(t => {
                    if (t.user === user.name) {
                        t.user = name;
                    }
                });
            }
            user.name = name;
            user.color = color;
            user.keywords = keywords;
        }
    } else {
        // Creating new user
        const newUser = {
            id: 'user-' + Date.now(),
            name,
            color,
            keywords
        };
        state.users.push(newUser);
    }

    saveState();
    renderUsersView();
}

function loadUserIntoForm(userId) {
    const user = state.users.find(u => u.id === userId);
    if (!user) return;

    document.getElementById('user-edit-id').value = user.id;
    document.getElementById('user-name').value = user.name;
    document.getElementById('user-color').value = user.color;
    document.getElementById('user-keywords').value = user.keywords || '';

    // Update color picker selection
    const picker = document.getElementById('user-color-picker');
    if (picker) {
        picker.querySelectorAll('.color-option').forEach(el => {
            if (el.getAttribute('data-color') === user.color) {
                el.classList.add('selected');
            } else {
                el.classList.remove('selected');
            }
        });
    }

    document.getElementById('user-editor-title').textContent = 'Edit User: ' + user.name;
    document.getElementById('btn-save-user-text').textContent = 'Save Changes';
    document.getElementById('btn-cancel-user-edit').classList.remove('hidden');
}

function resetUserForm() {
    document.getElementById('user-edit-id').value = '';
    document.getElementById('user-name').value = '';
    document.getElementById('user-color').value = '#3b82f6';
    document.getElementById('user-keywords').value = '';

    // Reset color picker selection
    const picker = document.getElementById('user-color-picker');
    if (picker) {
        picker.querySelectorAll('.color-option').forEach(el => {
            if (el.getAttribute('data-color') === '#3b82f6') {
                el.classList.add('selected');
            } else {
                el.classList.remove('selected');
            }
        });
    }

    document.getElementById('user-editor-title').textContent = 'Create / Edit User';
    document.getElementById('btn-save-user-text').textContent = 'Add User';
    document.getElementById('btn-cancel-user-edit').classList.add('hidden');
}

function handleDeleteUser(userId) {
    const user = state.users.find(u => u.id === userId);
    if (!user) return;

    // Restrict deletion if it's the last user
    if (state.users.length <= 1) {
        alert('You must have at least one user configured.');
        return;
    }

    if (confirm(`Are you sure you want to delete user "${user.name}"? All transactions assigned to this user will be set to Unassigned.`)) {
        // Clear transaction assignments
        state.transactions.forEach(t => {
            if (t.user === user.name) {
                t.user = '';
            }
        });

        // Remove from list
        state.users = state.users.filter(u => u.id !== userId);
        
        // Reset dashboard filter if needed
        if (dashboardUserFilter === user.name.toLowerCase()) {
            dashboardUserFilter = 'all';
        }

        saveState();
        renderUsersView();
    }
}
