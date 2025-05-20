// firebase-init.js - Ensures proper Firebase initialization

// Load Firebase scripts in correct sequence
function loadFirebaseScripts() {
  return new Promise((resolve, reject) => {
    // Check if Firebase is already loaded
    if (typeof firebase !== 'undefined') {
      console.log('Firebase already loaded');
      resolve();
      return;
    }

    console.log('Loading Firebase scripts...');
    
    // Create script elements for each Firebase library
    const scripts = [
      { src: 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js', id: 'firebase-app-script' },
      { src: 'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth-compat.js', id: 'firebase-auth-script' },
      { src: 'https://www.gstatic.com/firebasejs/9.22.1/firebase-database-compat.js', id: 'firebase-database-script' }
    ];
    
    // Keep track of how many scripts have loaded
    let loadedScripts = 0;
    const totalScripts = scripts.length;
    
    // Function to handle script load
    const handleScriptLoad = () => {
      loadedScripts++;
      if (loadedScripts === totalScripts) {
        // All scripts loaded, initialize Firebase
        const firebaseConfig = {
          apiKey: "AIzaSyBCtn83ZMoWCZaL1QSuzTpOv-hJmXI-o8k",
          authDomain: "musiflow-42411.firebaseapp.com",
          databaseURL: "https://musiflow-42411-default-rtdb.firebaseio.com",
          projectId: "musiflow-42411",
          storageBucket: "musiflow-42411.appspot.com",
          messagingSenderId: "619733935410",
          appId: "1:619733935410:web:11cb4a60a7de4fcd30a32b",
          measurementId: "G-FFVMTR5LVM"
        };
        
        // Initialize Firebase
        if (!firebase.apps || !firebase.apps.length) {
          firebase.initializeApp(firebaseConfig);
          console.log('Firebase initialized successfully');
        }
        
        // Load auth service file
        const authScript = document.createElement('script');
        authScript.src = 'resources/js/firebase-auth.js';
        authScript.onload = () => {
          console.log('Firebase Auth Service loaded');
          resolve();
        };
        authScript.onerror = (error) => {
          console.error('Error loading Firebase Auth Service:', error);
          reject(error);
        };
        document.head.appendChild(authScript);
      }
    };
    
    // Function to handle script error
    const handleScriptError = (script, error) => {
      console.error(`Error loading ${script.src}:`, error);
      reject(error);
    };
    
    // Load each script in sequence
    scripts.forEach(script => {
      // Skip if script already exists
      if (document.getElementById(script.id)) {
        loadedScripts++;
        if (loadedScripts === totalScripts) {
          handleScriptLoad();
        }
        return;
      }
      
      const scriptElement = document.createElement('script');
      scriptElement.id = script.id;
      scriptElement.src = script.src;
      scriptElement.async = true;
      scriptElement.onload = handleScriptLoad;
      scriptElement.onerror = (error) => handleScriptError(script, error);
      document.head.appendChild(scriptElement);
    });
  });
}

// Initialize Firebase when the document is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    loadFirebaseScripts().then(() => {
      console.log('Firebase and Auth Service initialized');
    }).catch(error => {
      console.error('Failed to initialize Firebase:', error);
    });
  });
} else {
  // Document already loaded
  loadFirebaseScripts().then(() => {
    console.log('Firebase and Auth Service initialized');
  }).catch(error => {
    console.error('Failed to initialize Firebase:', error);
  });
}