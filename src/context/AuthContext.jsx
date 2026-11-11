import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [teacherProfile, setTeacherProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchTeacherProfile = async (uid, email, displayName) => {
    try {
      const ref = doc(db, 'users', uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setTeacherProfile(snap.data());
      } else {
        const defaultProfile = {
          email,
          displayName: displayName || email?.split('@')[0] || 'Teacher',
          totalExpectedStudents: 40,
          updatedAt: serverTimestamp(),
        };
        await setDoc(ref, defaultProfile);
        setTeacherProfile(defaultProfile);
      }
    } catch (err) {
      console.error('Error loading teacher profile:', err);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await fetchTeacherProfile(currentUser.uid, currentUser.email, currentUser.displayName);
      } else {
        setTeacherProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = (email, password) => signInWithEmailAndPassword(auth, email, password);

  const registerTeacher = async (name, email, password, totalExpectedStudents = 40) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    const profileData = {
      email,
      displayName: name,
      totalExpectedStudents: Number(totalExpectedStudents) || 40,
      updatedAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'users', cred.user.uid), profileData);
    setTeacherProfile(profileData);
    return cred;
  };

  const logout = () => signOut(auth);

  const refreshProfile = async () => {
    if (user) {
      await fetchTeacherProfile(user.uid, user.email, user.displayName);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        teacherProfile,
        loading,
        login,
        registerTeacher,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};