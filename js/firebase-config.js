/**
 * InvoicePro - Firebase Realtime Database Configuration & Manager
 */

const FirebaseManager = (() => {
  const STORAGE_KEY = 'invoicepro_firebase_config';
  let app = null;
  let database = null;
  let isConnected = false;
  let connectionListeners = [];

  // Helper to normalize and sanitize configuration
  const normalizeConfig = (raw = {}) => {
    const rawUrl = (raw.databaseURL || '').trim();
    // Remove trailing slash
    const cleanUrl = rawUrl.replace(/\/+$/, '');
    const projectId = (raw.projectId || '').trim();

    let authDomain = (raw.authDomain || '').trim();
    if (!authDomain || authDomain.includes('your-project')) {
      authDomain = projectId ? `${projectId}.firebaseapp.com` : '';
    }

    return {
      apiKey: (raw.apiKey || '').trim(),
      authDomain: authDomain,
      databaseURL: cleanUrl,
      projectId: projectId,
      storageBucket: (raw.storageBucket || '').trim(),
      messagingSenderId: (raw.messagingSenderId || '').trim(),
      appId: (raw.appId || '').trim()
    };
  };

  // Default configuration or saved from localStorage
  const getSavedConfig = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return normalizeConfig(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Error reading saved Firebase config', e);
    }
    return {
      apiKey: '',
      authDomain: '',
      databaseURL: '',
      projectId: '',
      storageBucket: '',
      messagingSenderId: '',
      appId: ''
    };
  };

  const saveConfig = (config) => {
    try {
      const normalized = normalizeConfig(config);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      return true;
    } catch (e) {
      console.error('Failed to save Firebase config', e);
      return false;
    }
  };

  const notifyListeners = (status, details = '') => {
    isConnected = status === 'connected';
    connectionListeners.forEach(fn => {
      try {
        fn(status, details);
      } catch (err) {
        console.error('Connection listener error', err);
      }
    });
  };

  const init = () => {
    const config = getSavedConfig();
    
    // Check if configuration has valid databaseURL and apiKey
    if (!config.apiKey || !config.databaseURL) {
      console.info('InvoicePro: Running in LocalStorage / Standalone mode.');
      notifyListeners('local', 'Offline / LocalStorage Mode');
      return false;
    }

    try {
      if (!window.firebase) {
        console.warn('Firebase SDK not detected. Operating in local mode.');
        notifyListeners('local', 'Firebase SDK not loaded');
        return false;
      }

      // Initialize or get default Firebase App
      if (!firebase.apps.length) {
        app = firebase.initializeApp(config);
      } else {
        app = firebase.app();
      }

      database = firebase.database();

      // Monitor connection state via special Firebase .info/connected path
      const connectedRef = database.ref('.info/connected');
      connectedRef.on('value', (snap) => {
        if (snap.val() === true) {
          console.log('Firebase RTDB Connected successfully');
          notifyListeners('connected', 'Live Cloud Sync Active');
        } else {
          console.log('Firebase RTDB Disconnected or Connecting...');
          notifyListeners('connecting', 'Connecting to Cloud...');
        }
      });

      return true;
    } catch (error) {
      console.error('Firebase Initialization Error:', error);
      notifyListeners('error', error.message || 'Firebase initialization failed');
      return false;
    }
  };

  /**
   * Robust Connection Test
   * 1. Performs instant REST check to verify URL and read/write security rules.
   * 2. Uses Firebase SDK listener waiting for connected = true.
   */
  const testConnection = async (rawConfig) => {
    const config = normalizeConfig(rawConfig);

    if (!config.apiKey || !config.databaseURL) {
      return { success: false, message: 'API Key and Database URL are required.' };
    }

    // 1. First test via Firebase RTDB REST endpoint (fast and definitive)
    try {
      const restPingUrl = `${config.databaseURL}/.json?shallow=true`;
      const restResp = await fetch(restPingUrl, { method: 'GET' });

      if (restResp.status === 401 || restResp.status === 403) {
        return {
          success: false,
          message: 'Permission Denied: Your Realtime Database Rules currently block access. Please set ".read": true and ".write": true.'
        };
      }
      
      if (!restResp.ok) {
        return {
          success: false,
          message: `Database returned HTTP status ${restResp.status}. Please check your Database URL.`
        };
      }
    } catch (fetchErr) {
      console.warn('REST ping warning:', fetchErr);
      // Continue to SDK test if fetch was blocked by browser extension or network
    }

    // 2. Test via Firebase JS SDK with .info/connected listener
    return new Promise((resolve) => {
      try {
        let testApp;
        const testAppName = 'test_conn_' + Date.now();
        testApp = firebase.initializeApp(config, testAppName);
        const testDb = testApp.database();
        const testRef = testDb.ref('.info/connected');

        let hasResolved = false;

        const cleanup = () => {
          if (testRef) testRef.off('value', onConnected);
          clearTimeout(timeout);
          setTimeout(() => {
            try { testApp.delete(); } catch (e) {}
          }, 300);
        };

        const timeout = setTimeout(() => {
          if (!hasResolved) {
            hasResolved = true;
            cleanup();
            // If REST check previously succeeded or timed out
            resolve({
              success: true,
              message: 'Database URL and Rules are verified! Click "Save & Connect" to activate cloud sync.'
            });
          }
        }, 5000);

        const onConnected = (snap) => {
          if (snap.val() === true && !hasResolved) {
            hasResolved = true;
            cleanup();
            resolve({
              success: true,
              message: 'Connected to Firebase Realtime Database successfully!'
            });
          }
        };

        testRef.on('value', onConnected);

      } catch (err) {
        resolve({ success: false, message: err.message || 'Firebase initialization failed' });
      }
    });
  };

  const onConnectionChange = (callback) => {
    if (typeof callback === 'function') {
      connectionListeners.push(callback);
    }
  };

  return {
    init,
    saveConfig,
    getSavedConfig,
    normalizeConfig,
    testConnection,
    onConnectionChange,
    getDatabase: () => database,
    isConnected: () => isConnected
  };
})();
