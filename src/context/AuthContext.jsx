import { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]           = useState(null);   // Firebase user
  const [loading, setLoading]     = useState(true);   // Checking auth state
  const [isAdmin, setIsAdmin]     = useState(false);  // Passed employee check

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Check: is this user's email in the employees collection as 'username'?
        // If YES → employee account → not allowed → sign out immediately
        try {
          const q    = query(
            collection(db, 'employees'),
            where('username', '==', firebaseUser.email)
          );
          const snap = await getDocs(q);
          if (!snap.empty) {
            // This is an employee account — block access
            await signOut(auth);
            setUser(null);
            setIsAdmin(false);
          } else {
            // Not an employee → admin access granted
            setUser(firebaseUser);
            setIsAdmin(true);
          }
        } catch (e) {
          console.error('Auth check error:', e);
          setUser(firebaseUser);
          setIsAdmin(true);
        }
      } else {
        setUser(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
