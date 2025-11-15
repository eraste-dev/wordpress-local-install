// Type definitions (inline to avoid module issues in browser context)
interface StatusUpdate {
  step: string;
  message: string;
  success?: boolean;
}

// Theme Management (initialize before DOM)
function initTheme(): void {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  console.log('[THEME] Initializing theme:', savedTheme);
  document.documentElement.setAttribute('data-theme', savedTheme);
}

// Initialize theme immediately
console.log('[APP] Application starting...');
initTheme();

// DOM elements (will be initialized in DOMContentLoaded)
let form: HTMLFormElement;
let projectNameInput: HTMLInputElement;
let databaseNameInput: HTMLInputElement;
let destinationPathInput: HTMLInputElement;
let generateBtn: HTMLButtonElement;
let browseBtn: HTMLButtonElement;
let fullPathSpan: HTMLSpanElement;
let statusSection: HTMLDivElement;
let statusMessage: HTMLDivElement;
let dbStatusText: HTMLSpanElement;
let dbIndicator: HTMLSpanElement;
let testDbBtn: HTMLButtonElement;

// Titlebar controls
let themeToggle: HTMLButtonElement;
let minimizeBtn: HTMLButtonElement;
let maximizeBtn: HTMLButtonElement;
let closeBtn: HTMLButtonElement;

// Status items
let statusCopy: HTMLDivElement;
let statusConfig: HTMLDivElement;
let statusDatabase: HTMLDivElement;

function toggleTheme(): void {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  console.log('[THEME] Switching theme from', currentTheme, 'to', newTheme);
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  console.log('[THEME] Theme changed successfully to:', newTheme);
}

// Update full path preview
function updateFullPath(): void {
  const projectName = projectNameInput.value || '<nom-projet>';
  const destination = destinationPathInput.value || '<destination>';
  const fullPath = `${destination}/${projectName}`;
  fullPathSpan.textContent = fullPath;
  console.log('[PATH] Full path updated:', fullPath);
}

// Update status item
function updateStatusItem(step: string, message: string, success?: boolean): void {
  console.log('[STATUS] Updating status item:', { step, message, success });
  let statusItem: HTMLDivElement | null = null;

  switch (step) {
    case 'copy':
      statusItem = statusCopy;
      break;
    case 'config':
      statusItem = statusConfig;
      break;
    case 'database':
      statusItem = statusDatabase;
      break;
    default:
      console.warn('[STATUS] Unknown step:', step);
      return;
  }

  if (!statusItem) {
    console.error('[STATUS] Status item not found for step:', step);
    return;
  }

  const iconElement = statusItem.querySelector('.status-icon') as HTMLSpanElement;
  if (!iconElement) {
    console.error('[STATUS] Icon element not found');
    return;
  }

  if (success === undefined) {
    // In progress
    console.log('[STATUS] Setting status to in-progress for:', step);
    statusItem.classList.remove('pending', 'success', 'error');
    statusItem.classList.add('in-progress');
    iconElement.textContent = '◐';
  } else if (success) {
    // Success
    console.log('[STATUS] Setting status to success for:', step);
    statusItem.classList.remove('pending', 'in-progress', 'error');
    statusItem.classList.add('success');
    iconElement.textContent = '●';
  } else {
    // Error
    console.error('[STATUS] Setting status to error for:', step);
    statusItem.classList.remove('pending', 'in-progress', 'success');
    statusItem.classList.add('error');
    iconElement.textContent = '✕';
  }
}

// Show message
function showMessage(text: string, type: 'info' | 'error' | 'success' = 'info'): void {
  console.log('[MESSAGE]', type.toUpperCase() + ':', text);
  statusMessage.textContent = text;
  statusMessage.className = 'status-message';
  if (type === 'error') {
    statusMessage.classList.add('error');
  } else if (type === 'success') {
    statusMessage.classList.add('success');
  }
}

// Reset status
function resetStatus(): void {
  console.log('[STATUS] Resetting all status items');
  [statusCopy, statusConfig, statusDatabase].forEach(item => {
    item.classList.remove('in-progress', 'success', 'error');
    item.classList.add('pending');
    const iconElement = item.querySelector('.status-icon') as HTMLSpanElement;
    if (iconElement) {
      iconElement.textContent = '○';
    }
  });
  statusMessage.textContent = '';
  statusMessage.className = 'status-message';
}

// Enable/disable form
function setFormEnabled(enabled: boolean): void {
  console.log('[FORM] Setting form enabled:', enabled);
  generateBtn.disabled = !enabled;
  projectNameInput.disabled = !enabled;
  databaseNameInput.disabled = !enabled;
  destinationPathInput.disabled = !enabled;
  browseBtn.disabled = !enabled;
}

// Initial DB connection test and theme init
window.addEventListener('DOMContentLoaded', async () => {
  console.log('[DOM] DOMContentLoaded event fired');

  // Initialize all DOM elements
  console.log('[DOM] Initializing DOM elements...');
  form = document.getElementById('generateForm') as HTMLFormElement;
  projectNameInput = document.getElementById('projectName') as HTMLInputElement;
  databaseNameInput = document.getElementById('databaseName') as HTMLInputElement;
  destinationPathInput = document.getElementById('destinationPath') as HTMLInputElement;
  generateBtn = document.getElementById('generateBtn') as HTMLButtonElement;
  browseBtn = document.getElementById('browseBtn') as HTMLButtonElement;
  fullPathSpan = document.getElementById('fullPath') as HTMLSpanElement;
  statusSection = document.getElementById('statusSection') as HTMLDivElement;
  statusMessage = document.getElementById('statusMessage') as HTMLDivElement;
  dbStatusText = document.getElementById('dbStatusText') as HTMLSpanElement;
  dbIndicator = document.getElementById('dbIndicator') as HTMLSpanElement;
  testDbBtn = document.getElementById('testDbBtn') as HTMLButtonElement;

  // Titlebar controls
  themeToggle = document.getElementById('themeToggle') as HTMLButtonElement;
  minimizeBtn = document.getElementById('minimizeBtn') as HTMLButtonElement;
  maximizeBtn = document.getElementById('maximizeBtn') as HTMLButtonElement;
  closeBtn = document.getElementById('closeBtn') as HTMLButtonElement;

  // Status items
  statusCopy = document.getElementById('status-copy') as HTMLDivElement;
  statusConfig = document.getElementById('status-config') as HTMLDivElement;
  statusDatabase = document.getElementById('status-database') as HTMLDivElement;

  console.log('[DOM] All DOM elements initialized');
  console.log('[DOM] Theme toggle button:', themeToggle ? 'Found' : 'NOT FOUND');

  // Setup event listeners
  console.log('[EVENTS] Setting up event listeners...');
  setupEventListeners();
  console.log('[EVENTS] Event listeners setup complete');

  // Auto-test DB connection on load
  console.log('[DB] Scheduling automatic DB connection test in 500ms');
  setTimeout(() => {
    console.log('[DB] Triggering automatic DB connection test');
    testDbBtn.click();
  }, 500);
});

function setupEventListeners(): void {
  // Theme toggle
  console.log('[EVENTS] Setting up theme toggle listener');
  themeToggle.addEventListener('click', (e) => {
    e.preventDefault();
    console.log('[THEME] Theme button clicked!');
    toggleTheme();
  });

  // Window controls
  console.log('[EVENTS] Setting up window control listeners');
  minimizeBtn.addEventListener('click', () => {
    console.log('[WINDOW] Minimize button clicked');
    window.electronAPI.minimizeWindow();
  });

  maximizeBtn.addEventListener('click', () => {
    console.log('[WINDOW] Maximize button clicked');
    window.electronAPI.maximizeWindow();
  });

  closeBtn.addEventListener('click', () => {
    console.log('[WINDOW] Close button clicked');
    window.electronAPI.closeWindow();
  });

  // Form event listeners
  console.log('[EVENTS] Setting up form listeners');
  projectNameInput.addEventListener('input', updateFullPath);
  destinationPathInput.addEventListener('input', updateFullPath);

  browseBtn.addEventListener('click', async () => {
    console.log('[BROWSE] Browse button clicked');
    const path = await window.electronAPI.selectDirectory();
    console.log('[BROWSE] Selected directory:', path);
    if (path) {
      destinationPathInput.value = path;
      updateFullPath();
    }
  });

  testDbBtn.addEventListener('click', async () => {
    console.log('[DB] Test DB button clicked');
    testDbBtn.disabled = true;
    dbStatusText.textContent = 'Test en cours...';
    dbIndicator.className = 'status-indicator unknown';

    try {
      console.log('[DB] Testing database connection...');
      const result = await window.electronAPI.testDbConnection();
      console.log('[DB] Connection test result:', result);

      if (result.success) {
        console.log('[DB] Connection successful!');
        dbStatusText.textContent = 'MySQL connecté';
        dbIndicator.className = 'status-indicator connected';
      } else {
        console.error('[DB] Connection failed:', result.message);
        dbStatusText.textContent = `Erreur: ${result.message}`;
        dbIndicator.className = 'status-indicator disconnected';
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error('[DB] Connection error:', errorMessage);
      dbStatusText.textContent = `Erreur: ${errorMessage}`;
      dbIndicator.className = 'status-indicator disconnected';
    } finally {
      testDbBtn.disabled = false;
    }
  });

  form.addEventListener('submit', async (e: Event) => {
    e.preventDefault();
    console.log('[FORM] Form submitted');

    const projectName = projectNameInput.value.trim();
    const databaseName = databaseNameInput.value.trim();
    const destinationPath = destinationPathInput.value.trim();

    console.log('[FORM] Form data:', { projectName, databaseName, destinationPath });

    if (!projectName || !databaseName || !destinationPath) {
      console.warn('[FORM] Validation failed: missing fields');
      showMessage('Veuillez remplir tous les champs', 'error');
      return;
    }

    console.log('[FORM] Validation passed, starting generation...');
    resetStatus();
    statusSection.classList.remove('hidden');
    setFormEnabled(false);

    try {
      console.log('[GENERATE] Calling generateWordPress...');
      const result = await window.electronAPI.generateWordPress({
        projectName,
        databaseName,
        destinationPath
      });

      console.log('[GENERATE] Result:', result);

      if (result.success) {
        console.log('[GENERATE] Success!');
        showMessage(result.message || 'Projet généré avec succès', 'success');
      } else {
        console.error('[GENERATE] Failed:', result.message);
        showMessage(result.message || 'Erreur lors de la génération', 'error');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error('[GENERATE] Exception:', errorMessage);
      showMessage(`Erreur inattendue: ${errorMessage}`, 'error');
    } finally {
      setFormEnabled(true);
    }
  });

  console.log('[EVENTS] Setting up status update listener');
  window.electronAPI.onStatusUpdate((data: StatusUpdate) => {
    console.log('[IPC] Received status update:', data);
    const { step, message, success } = data;
    updateStatusItem(step, message, success);
    if (step !== 'error') {
      showMessage(message, success ? 'info' : 'info');
    }
  });
  console.log('[EVENTS] All form listeners set up');
}
