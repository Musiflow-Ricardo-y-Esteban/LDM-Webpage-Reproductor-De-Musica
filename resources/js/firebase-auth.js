// Firebase Authentication Service
// This file handles all Firebase authentication functions

// Initialize Firebase with your specific configuration
const firebaseConfig = {
  apiKey: "AIzaSyBCtn83ZMoWCZaL1QSuzTpOv-hJmXI-o8k",
  authDomain: "musiflow-42411.firebaseapp.com",
  databaseURL: "https://musiflow-42411-default-rtdb.firebaseio.com",
  projectId: "musiflow-42411",
  storageBucket: "musiflow-42411.appspot.com", // Fixed storage bucket URL
  messagingSenderId: "619733935410",
  appId: "1:619733935410:web:11cb4a60a7de4fcd30a32b",
  measurementId: "G-FFVMTR5LVM"
};

// Initialize Firebase - using proper compatibility mode initialization
if (typeof firebase !== 'undefined') {
  if (!firebase.apps || !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  } else {
    firebase.app(); // Use existing app if already initialized
  }
} else {
  console.error("Firebase SDK not loaded. Please check your script inclusions.");
}

// Get the Auth service
const auth = firebase.auth();
const database = firebase.database();

// User registration function
async function registerUser(email, password, username) {
  try {
    // Show loading spinner
    showLoading(true);
    
    // Create user with email and password
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;
    
    // Save additional user data to Firebase Realtime Database
    await database.ref('users/' + user.uid).set({
      username: username || email.split('@')[0], // Default username is email prefix
      email: email,
      profile_picture: '',
      created_at: new Date().toISOString(),
      last_login: new Date().toISOString()
    });
    
    // Update profile
    await user.updateProfile({
      displayName: username || email.split('@')[0]
    });
    
    // Hide loading spinner
    showLoading(false);
    
    return {
      success: true,
      user: user
    };
  } catch (error) {
    // Hide loading spinner
    showLoading(false);
    
    return {
      success: false,
      error: error.message
    };
  }
}

// User login function
async function loginUser(email, password) {
  try {
    // Show loading spinner
    showLoading(true);
    
    // Sign in with email and password
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    const user = userCredential.user;
    
    // Update last login timestamp
    await database.ref('users/' + user.uid + '/last_login').set(new Date().toISOString());
    
    // Hide loading spinner
    showLoading(false);
    
    return {
      success: true,
      user: user
    };
  } catch (error) {
    // Hide loading spinner
    showLoading(false);
    
    return {
      success: false,
      error: error.message
    };
  }
}

// Logout function
async function logoutUser() {
  try {
    // Show loading spinner
    showLoading(true);
    
    // Sign out
    await auth.signOut();
    
    // Hide loading spinner
    showLoading(false);
    
    return {
      success: true
    };
  } catch (error) {
    // Hide loading spinner
    showLoading(false);
    
    return {
      success: false,
      error: error.message
    };
  }
}

// Get current user data including DB profile
async function getCurrentUser() {
  return new Promise((resolve, reject) => {
    const user = auth.currentUser;
    
    if (!user) {
      resolve(null);
      return;
    }
    
    // Get additional user data from database
    database.ref('users/' + user.uid).once('value')
      .then(snapshot => {
        const userData = snapshot.val();
        resolve({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          emailVerified: user.emailVerified,
          ...userData
        });
      })
      .catch(error => {
        reject(error);
      });
  });
}

// Update user profile
async function updateUserProfile(displayName, photoURL) {
  try {
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('No user logged in');
    }
    
    // Show loading spinner
    showLoading(true);
    
    // Update auth profile
    await user.updateProfile({
      displayName: displayName,
      photoURL: photoURL
    });
    
    // Update database profile
    await database.ref('users/' + user.uid).update({
      username: displayName,
      profile_picture: photoURL
    });
    
    // Hide loading spinner
    showLoading(false);
    
    return {
      success: true
    };
  } catch (error) {
    // Hide loading spinner
    showLoading(false);
    
    return {
      success: false,
      error: error.message
    };
  }
}

// Check if user is logged in
function isUserLoggedIn() {
  return !!auth.currentUser;
}

// Auth state observer
function onAuthStateChanged(callback) {
  return auth.onAuthStateChanged(user => {
    if (user) {
      // User is signed in
      database.ref('users/' + user.uid).once('value')
        .then(snapshot => {
          const userData = snapshot.val();
          callback({
            user: {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName || userData?.username,
              photoURL: user.photoURL,
              emailVerified: user.emailVerified,
              ...userData
            },
            loggedIn: true
          });
        })
        .catch(error => {
          console.error('Error fetching user data:', error);
          callback({
            user: {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
              photoURL: user.photoURL,
              emailVerified: user.emailVerified
            },
            loggedIn: true
          });
        });
    } else {
      // User is signed out
      callback({
        user: null,
        loggedIn: false
      });
    }
  });
}

// Reset password
async function resetPassword(email) {
  try {
    // Show loading spinner
    showLoading(true);
    
    await auth.sendPasswordResetEmail(email);
    
    // Hide loading spinner
    showLoading(false);
    
    return {
      success: true
    };
  } catch (error) {
    // Hide loading spinner
    showLoading(false);
    
    return {
      success: false,
      error: error.message
    };
  }
}

// Helper function to show/hide loading overlay
function showLoading(show) {
  const loadingOverlay = document.getElementById('loadingOverlay');
  if (!loadingOverlay) return;
  
  if (show) {
    loadingOverlay.classList.add('show');
  } else {
    loadingOverlay.classList.remove('show');
  }
}

// Export the functions
window.firebaseAuth = {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  updateUserProfile,
  isUserLoggedIn,
  onAuthStateChanged,
  resetPassword
};