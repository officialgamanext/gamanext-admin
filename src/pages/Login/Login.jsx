import { useState } from 'react';
import {
  signInWithEmailAndPassword, signOut
} from 'firebase/auth';
import {
  collection, getDocs, query, where
} from 'firebase/firestore';
import { auth, db } from '../../firebase';
import './Login.css';

export default function Login() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) { setError('Please enter both username and password.'); return; }
    setLoading(true);
    setError('');

    try {
      // Step 1 — Firebase email/password sign-in
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);

      // Step 2 — Check if this email matches any employee's username in Firestore
      const q    = query(collection(db, 'employees'), where('username', '==', email.trim().toLowerCase()));
      const snap = await getDocs(q);

      if (!snap.empty) {
        // This is an employee account — deny access
        await signOut(auth);
        setError(
          'Access denied. Employee accounts cannot log in to the admin panel. ' +
          'Please use an admin account.'
        );
        return;
      }

      // Step 3 — Not an employee → access granted (AuthContext will pick this up)
      // No need to do anything here; onAuthStateChanged in AuthContext handles it.

    } catch (err) {
      console.error('Login error:', err);
      switch (err.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          setError('Invalid username or password. Please try again.');
          break;
        case 'auth/invalid-email':
          setError('Please enter a valid email address.');
          break;
        case 'auth/too-many-requests':
          setError('Too many failed attempts. Account temporarily locked. Try again later.');
          break;
        case 'auth/user-disabled':
          setError('This account has been disabled. Contact your administrator.');
          break;
        default:
          setError('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-root">
      <div className="login-card">
        {/* Brand */}
        <div className="login-brand">
          <div className="login-logo">🚀</div>
          <span className="login-company-name">GamaNext</span>
        </div>
        <p className="login-tagline">Admin Management Portal</p>

        <div className="login-heading">Welcome back</div>
        <p className="login-sub">Sign in to access the admin panel</p>

        {/* Error */}
        {error && (
          <div className="login-error">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} autoComplete="off">
          {/* Username / Email */}
          <div className="login-field">
            <label className="login-label" htmlFor="login-email">Username / Email</label>
            <div className="login-input-wrap">
              <span className="login-input-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </span>
              <input
                id="login-email"
                className="login-input"
                type="text"
                placeholder="admin@gamanext.com"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                disabled={loading}
                autoComplete="username"
              />
            </div>
          </div>

          {/* Password */}
          <div className="login-field">
            <label className="login-label" htmlFor="login-password">Password</label>
            <div className="login-input-wrap">
              <span className="login-input-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </span>
              <input
                id="login-password"
                className="login-input"
                type={showPwd ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                disabled={loading}
                autoComplete="current-password"
              />
              <button type="button" className="login-show-btn" onClick={() => setShowPwd(v => !v)} tabIndex={-1} title={showPwd ? 'Hide password' : 'Show password'}>
                {showPwd ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? (
              <><span className="login-spinner" /> Signing in…</>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                  <polyline points="10 17 15 12 10 7"/>
                  <line x1="15" y1="12" x2="3" y2="12"/>
                </svg>
                Sign In
              </>
            )}
          </button>
        </form>

        <div className="login-footer">
          <strong>GamaNext Admin Panel</strong> · Admin access only
        </div>
      </div>
    </div>
  );
}
