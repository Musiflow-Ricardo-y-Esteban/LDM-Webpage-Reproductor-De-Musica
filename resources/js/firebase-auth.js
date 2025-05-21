// Firebase-auth.js - Gestión centralizada de autenticación con Firebase

/**
 * Configuración de Firebase para la aplicación
 * Contiene las claves y endpoints necesarios para conectar con los servicios
 */
const firebaseConfig = {
  apiKey: "AIzaSyBCtn83ZMoWCZaL1QSuzTpOv-hJmXI-o8k",
  authDomain: "musiflow-42411.firebaseapp.com",
  databaseURL: "https://musiflow-42411-default-rtdb.firebaseio.com",
  projectId: "musiflow-42411",
  storageBucket: "musiflow-42411.appspot.com", // URL del bucket corregida
  messagingSenderId: "619733935410",
  appId: "1:619733935410:web:11cb4a60a7de4fcd30a32b",
  measurementId: "G-FFVMTR5LVM"
};

/**
 * Inicialización de Firebase usando modo de compatibilidad
 * Previene inicializaciones duplicadas verificando si ya existe una instancia
 */
if (typeof firebase !== 'undefined') {
  if (!firebase.apps || !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  } else {
    firebase.app(); // Usa la app existente si ya está inicializada
  }
} else {
  console.error("Firebase SDK not loaded. Please check your script inclusions.");
}

// Obtener servicios de Firebase
const auth = firebase.auth();
const database = firebase.database();

/**
 * Registra un nuevo usuario en Firebase
 * @param {string} email - Correo electrónico del usuario
 * @param {string} password - Contraseña del usuario
 * @param {string} username - Nombre de usuario (opcional)
 * @return {Object} Resultado de la operación
 */
async function registerUser(email, password, username) {
  try {
    // Mostrar indicador de carga
    showLoading(true);
    
    // Crear usuario con email y contraseña
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;
    
    // Guardar datos adicionales en Firebase Realtime Database
    await database.ref('users/' + user.uid).set({
      username: username || email.split('@')[0], // Nombre por defecto es prefijo de email
      email: email,
      profile_picture: '',
      created_at: new Date().toISOString(),
      last_login: new Date().toISOString()
    });
    
    // Actualizar perfil
    await user.updateProfile({
      displayName: username || email.split('@')[0]
    });
    
    // Ocultar indicador de carga
    showLoading(false);
    
    return {
      success: true,
      user: user
    };
  } catch (error) {
    // Ocultar indicador de carga
    showLoading(false);
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Inicia sesión de un usuario existente
 * @param {string} email - Correo electrónico del usuario
 * @param {string} password - Contraseña del usuario
 * @return {Object} Resultado de la operación
 */
async function loginUser(email, password) {
  try {
    // Mostrar indicador de carga
    showLoading(true);
    
    // Iniciar sesión con email y contraseña
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    const user = userCredential.user;
    
    // Actualizar fecha de último login
    await database.ref('users/' + user.uid + '/last_login').set(new Date().toISOString());
    
    // Ocultar indicador de carga
    showLoading(false);
    
    return {
      success: true,
      user: user
    };
  } catch (error) {
    // Ocultar indicador de carga
    showLoading(false);
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Cierra la sesión del usuario actual
 * @return {Object} Resultado de la operación
 */
async function logoutUser() {
  try {
    // Mostrar indicador de carga
    showLoading(true);
    
    // Cerrar sesión
    await auth.signOut();
    
    // Ocultar indicador de carga
    showLoading(false);
    
    return {
      success: true
    };
  } catch (error) {
    // Ocultar indicador de carga
    showLoading(false);
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Obtiene los datos del usuario actual incluyendo su perfil de la base de datos
 * @return {Promise<Object|null>} Datos completos del usuario o null si no hay sesión
 */
async function getCurrentUser() {
  return new Promise((resolve, reject) => {
    const user = auth.currentUser;
    
    if (!user) {
      resolve(null);
      return;
    }
    
    // Obtener datos adicionales de usuario desde la base de datos
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

/**
 * Actualiza el perfil del usuario
 * @param {string} displayName - Nombre a mostrar del usuario
 * @param {string} photoURL - URL de la imagen de perfil
 * @return {Object} Resultado de la operación
 */
async function updateUserProfile(displayName, photoURL) {
  try {
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('No user logged in');
    }
    
    // Mostrar indicador de carga
    showLoading(true);
    
    // Actualizar perfil en Authentication
    await user.updateProfile({
      displayName: displayName,
      photoURL: photoURL
    });
    
    // Actualizar perfil en Database
    await database.ref('users/' + user.uid).update({
      username: displayName,
      profile_picture: photoURL
    });
    
    // Ocultar indicador de carga
    showLoading(false);
    
    return {
      success: true
    };
  } catch (error) {
    // Ocultar indicador de carga
    showLoading(false);
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Verifica si hay un usuario con sesión activa
 * @return {boolean} true si hay un usuario logueado
 */
function isUserLoggedIn() {
  return !!auth.currentUser;
}

/**
 * Observador de cambios en el estado de autenticación
 * @param {Function} callback - Función a llamar cuando cambia el estado
 * @return {Function} Función para eliminar el observador
 */
function onAuthStateChanged(callback) {
  return auth.onAuthStateChanged(user => {
    if (user) {
      // Usuario conectado
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
      // Usuario desconectado
      callback({
        user: null,
        loggedIn: false
      });
    }
  });
}

/**
 * Envía un correo para restablecer la contraseña
 * @param {string} email - Correo electrónico del usuario
 * @return {Object} Resultado de la operación
 */
async function resetPassword(email) {
  try {
    // Mostrar indicador de carga
    showLoading(true);
    
    await auth.sendPasswordResetEmail(email);
    
    // Ocultar indicador de carga
    showLoading(false);
    
    return {
      success: true
    };
  } catch (error) {
    // Ocultar indicador de carga
    showLoading(false);
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Muestra u oculta el indicador de carga
 * @param {boolean} show - Indica si mostrar u ocultar
 */
function showLoading(show) {
  const loadingOverlay = document.getElementById('loadingOverlay');
  if (!loadingOverlay) return;
  
  if (show) {
    loadingOverlay.classList.add('show');
  } else {
    loadingOverlay.classList.remove('show');
  }
}

// Exportar las funciones para uso global
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