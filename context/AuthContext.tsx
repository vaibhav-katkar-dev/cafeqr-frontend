"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { auth } from "@/lib/firebase";
import {
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  User,
  UserCredential,
} from "firebase/auth";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  login: (email: string, password: string) => Promise<UserCredential>;
  signup: (email: string, password: string) => Promise<UserCredential>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const logout = () => signOut(auth);
  
  const login = (email: string, password: string) =>
    signInWithEmailAndPassword(auth, email, password);
    
  const signup = (email: string, password: string) =>
    createUserWithEmailAndPassword(auth, email, password);
    
  const resetPassword = (email: string) => sendPasswordResetEmail(auth, email);

  return (
    <AuthContext.Provider value={{ user, loading, logout, login, signup, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
