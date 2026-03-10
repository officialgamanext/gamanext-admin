import { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]               = useState(null);
  const [loading, setLoading]         = useState(true);
  const [isAdmin, setIsAdmin]         = useState(false);
  const [isEmployee, setIsEmployee]   = useState(false);
  const [employeeData, setEmployeeData] = useState(null); // the Firestore employee record

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const q    = query(
            collection(db, 'employees'),
            where('username', '==', firebaseUser.email)
          );
          const snap = await getDocs(q);

          if (!snap.empty) {
            // ✅ Employee account — allow login, set employee context
            const empDoc = snap.docs[0];
            setUser(firebaseUser);
            setIsAdmin(false);
            setIsEmployee(true);
            setEmployeeData({ id: empDoc.id, ...empDoc.data() });
          } else {
            // ✅ Not an employee → admin
            setUser(firebaseUser);
            setIsAdmin(true);
            setIsEmployee(false);
            setEmployeeData(null);
          }
        } catch (e) {
          console.error('Auth check error:', e);
          // On error, default to admin (existing behaviour)
          setUser(firebaseUser);
          setIsAdmin(true);
          setIsEmployee(false);
          setEmployeeData(null);
        }
      } else {
        setUser(null);
        setIsAdmin(false);
        setIsEmployee(false);
        setEmployeeData(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, isEmployee, employeeData, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
