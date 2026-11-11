import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, refreshSession } from '../api/client';
import { fetchProfile, saveProfile } from '../api/attendflow';
import { startRealtime, stopRealtime } from '../api/realtime';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

// Accounts live in the platform's auth-service (the same accounts as the career website).
const toUser = (account) => ({
  uid: account.id,
  email: account.email,
  displayName: account.full_name,
});

const DEFAULT_PROFILE = { displayName: '', totalExpectedStudents: 40 };

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [teacherProfile, setTeacherProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (account) => {
    try {
      const profile = await fetchProfile();
      setTeacherProfile({ ...profile, displayName: profile.displayName || account.displayName });
    } catch (err) {
      console.error('Error loading teacher profile:', err);
      setTeacherProfile({ ...DEFAULT_PROFILE, displayName: account.displayName });
    }
  };

  const signedIn = async (account) => {
    const next = toUser(account);
    setUser(next);
    await loadProfile(next);
    startRealtime();
    return next;
  };

  useEffect(() => {
    const restore = async () => {
      try {
        let account;
        try {
          account = await api('/api/v1/auth/me');
        } catch (err) {
          if (err.status !== 401) throw err;
          // The access token expired; the refresh cookie may still be valid.
          account = (await refreshSession()).user;
        }
        await signedIn(account);
      } catch {
        setUser(null);
        setTeacherProfile(null);
      } finally {
        setLoading(false);
      }
    };
    restore();
    return () => stopRealtime();
  }, []);

  const login = async (email, password) => {
    const session = await api('/api/v1/auth/login', { method: 'POST', body: { email, password } });
    return signedIn(session.user);
  };

  const registerTeacher = async (name, email, password, totalExpectedStudents = 40) => {
    const session = await api('/api/v1/auth/register', {
      method: 'POST',
      body: { full_name: name, email, password, account_type: 'worker', accept_terms: true },
    });
    const next = toUser(session.user);
    setUser(next);
    try {
      setTeacherProfile(await saveProfile({ displayName: name, totalExpectedStudents }));
    } catch {
      setTeacherProfile({ displayName: name, totalExpectedStudents: Number(totalExpectedStudents) || 40 });
    }
    startRealtime();
    return next;
  };

  const logout = async () => {
    stopRealtime();
    try {
      await api('/api/v1/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
      setTeacherProfile(null);
    }
  };

  const refreshProfile = async () => {
    if (user) await loadProfile(user);
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
