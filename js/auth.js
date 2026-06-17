/* ============================================================
   auth.js  —  SplitEase  |  dev-logic
   Handles: form validation, tab switching, error display
   Firebase Auth calls are stubbed with TODO comments for Dev 3
   ============================================================ */

// ── Helpers ──────────────────────────────────────────────────

/**
 * Show an error message inside the auth card.
 * @param {string} msg
 */
function showError(msg) {
  const box = document.getElementById('form-error');
  box.textContent = msg;
  box.classList.add('show');
}

/** Clear the error box */
function clearError() {
  const box = document.getElementById('form-error');
  box.textContent = '';
  box.classList.remove('show');
}

/**
 * Basic email format check (RFC-lite).
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ── Tab Switcher ──────────────────────────────────────────────

/**
 * Toggle between Login and Register tabs.
 * @param {'login'|'register'} tab
 */
function switchTab(tab) {
  clearError();
  const isLogin = tab === 'login';

  document.getElementById('tab-login').classList.toggle('active', isLogin);
  document.getElementById('tab-register').classList.toggle('active', !isLogin);
  document.getElementById('login-form').classList.toggle('active', isLogin);
  document.getElementById('register-form').classList.toggle('active', !isLogin);

  document.getElementById('auth-title').textContent = isLogin
    ? 'Welcome Back'
    : 'Create Account';
  document.getElementById('auth-sub').textContent = isLogin
    ? 'Sign in to manage group expenses'
    : 'Start tracking expenses with your group';
}

// ── Button Loading State ──────────────────────────────────────

function setLoading(btnId, isLoading, defaultText) {
  const btn = document.getElementById(btnId);
  btn.disabled = isLoading;
  btn.textContent = isLoading ? 'Please wait…' : defaultText;
}

// ── Login Handler ─────────────────────────────────────────────

/**
 * Validates login form inputs.
 * TODO (Dev 3): Replace the redirect with Firebase signInWithEmailAndPassword()
 * @param {Event} e
 */
function handleLogin(e) {
  e.preventDefault();
  clearError();

  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-pass').value;

  // ── Validation ──
  if (!email && !pass) return showError('Please enter your email and password.');
  if (!email)          return showError('Please enter your email address.');
  if (!isValidEmail(email)) return showError('Please enter a valid email address.');
  if (!pass)           return showError('Please enter your password.');
  if (pass.length < 6) return showError('Password must be at least 6 characters.');

  // ── TODO: Dev 3 replaces this block with Firebase Auth ──
  // import { signInWithEmailAndPassword } from "firebase/auth";
  // signInWithEmailAndPassword(auth, email, pass)
  //   .then(userCredential => { window.location.href = 'dashboard.html'; })
  //   .catch(err => showError(mapFirebaseError(err.code)));

  setLoading('btn-login', true, 'Sign In');
  // Simulated delay for demo (remove once Firebase is wired)
  setTimeout(() => {
    window.location.href = 'dashboard.html';
  }, 800);
}

// ── Register Handler ──────────────────────────────────────────

/**
 * Validates registration form inputs.
 * TODO (Dev 3): Replace redirect with Firebase createUserWithEmailAndPassword()
 * @param {Event} e
 */
function handleRegister(e) {
  e.preventDefault();
  clearError();

  const name    = document.getElementById('reg-name').value.trim();
  const email   = document.getElementById('reg-email').value.trim();
  const pass    = document.getElementById('reg-pass').value;
  const confirm = document.getElementById('reg-confirm').value;

  // ── Validation ──
  if (!name)                return showError('Please enter your full name.');
  if (name.length < 2)      return showError('Name must be at least 2 characters.');
  if (!email)               return showError('Please enter your email address.');
  if (!isValidEmail(email)) return showError('Please enter a valid email address.');
  if (!pass)                return showError('Please enter a password.');
  if (pass.length < 6)      return showError('Password must be at least 6 characters.');
  if (pass !== confirm)     return showError('Passwords do not match. Please try again.');

  // ── TODO: Dev 3 replaces this block with Firebase Auth ──
  // import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
  // createUserWithEmailAndPassword(auth, email, pass)
  //   .then(userCredential => updateProfile(userCredential.user, { displayName: name }))
  //   .then(() => { window.location.href = 'dashboard.html'; })
  //   .catch(err => showError(mapFirebaseError(err.code)));

  setLoading('btn-register', true, 'Create Account');
  setTimeout(() => {
    window.location.href = 'dashboard.html';
  }, 800);
}

// ── Guest Login ───────────────────────────────────────────────

function guestLogin() {
  sessionStorage.setItem('isGuest', 'true');
  window.location.href = 'dashboard.html';
}

// ── Google Login (UI Demo Stub) ───────────────────────────────

function handleGoogleLogin() {
  clearError();
  setLoading('btn-google', true, 'Signing in…');
  
  // TODO (Dev 3): Replace this block with Firebase Google Auth integration:
  // import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
  // const provider = new GoogleAuthProvider();
  // signInWithPopup(auth, provider).then(...)
  
  setTimeout(() => {
    sessionStorage.setItem('isGuest', 'true');
    window.location.href = 'dashboard.html';
  }, 800);
}

// ── Firebase Error Code Mapper (for Dev 3 to use) ─────────────

/**
 * Converts Firebase Auth error codes to human-friendly messages.
 * @param {string} code  e.g. 'auth/wrong-password'
 * @returns {string}
 */
function mapFirebaseError(code) {
  const map = {
    'auth/user-not-found':      'No account found with this email.',
    'auth/wrong-password':      'Incorrect password. Please try again.',
    'auth/email-already-in-use':'This email is already registered. Try signing in.',
    'auth/too-many-requests':   'Too many attempts. Please wait and try again.',
    'auth/network-request-failed': 'Network error. Check your connection.',
    'auth/invalid-email':       'Invalid email address.',
  };
  return map[code] || 'Something went wrong. Please try again.';
}
