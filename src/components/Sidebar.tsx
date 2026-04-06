import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Mic, Upload, BarChart3, History, Settings, LayoutDashboard, LogOut, Play, Square, Loader2, ChevronRight, TrendingUp, MessageSquare, Smile, Zap, CheckCircle2, AlertCircle, X, Clock, FileAudio, User, ShieldCheck, ArrowRight, Sparkles, Search, Filter, Bell, CreditCard, Lock, Globe, Moon, Sun, Mail, Camera, Trash2, Eye, EyeOff, Key, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { cn } from '../lib/utils';
import { auth, loginWithGoogle, logout, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, updateProfile, db, collection, query, where, orderBy, onSnapshot, doc, setDoc, getDoc, getDocFromServer, getDocs, updateDoc, deleteDoc, FirebaseUser } from '../firebase';
import { AppState, AnalysisResult } from '../types';
import { analyzeAudio, generateScript } from '../services/gemini';
import { OperationType, handleFirestoreError } from '../lib/firestore-errors';

const Sidebar = ({ active, onChange, isOpen, onToggle, user, onLogout, onSignInClick }: {
  active: AppState,
  onChange: (s: AppState) => void,
  isOpen: boolean,
  onToggle: () => void,
  user: FirebaseUser | null,
  onLogout: () => void,
  onSignInClick: () => void
}) => {
  const items = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'history', icon: History, label: 'History' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <motion.div
      animate={{ width: isOpen ? 256 : 80 }}
      className="bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 h-screen flex flex-col border-r border-slate-100 dark:border-slate-800 relative transition-colors duration-300"
    >
      <div className="p-6 flex items-center gap-3 overflow-hidden">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0">
          <Zap className="text-white w-6 h-6 fill-current" />
        </div>
        {isOpen && <span className="text-xl font-bold text-slate-900 dark:text-white tracking-tight truncate">SpeakAI</span>}
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2 overflow-hidden">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onChange(item.id as AppState)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
              active === item.id
                ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-medium"
                : "hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <item.icon className={cn("w-5 h-5 shrink-0", active === item.id ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300")} />
            {isOpen && <span className="truncate">{item.label}</span>}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-100 dark:border-slate-800 overflow-hidden">
        {user ? (
          <div
            onClick={() => onChange('profile')}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors group relative",
              active === 'profile' && "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400"
            )}
          >
            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
              {user.photoURL ? <img src={user.photoURL} alt="" className="w-full h-full object-cover" /> : <User className="w-4 h-4 text-slate-400 dark:text-slate-500" />}
            </div>
            {isOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{user.displayName || 'User'}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">Pro Plan</p>
              </div>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLogout();
              }}
              className="absolute right-4 text-slate-400 hover:text-red-500 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button onClick={onSignInClick} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 transition-colors">
            <User className="w-4 h-4" />
            {isOpen && <span className="text-sm font-bold">Sign In</span>}
          </button>
        )}
      </div>

      <button
        onClick={onToggle}
        className="absolute -right-3 top-20 w-6 h-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors z-50 shadow-sm"
      >
        <ChevronRight className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
      </button>
    </motion.div>
  );
};

export default Sidebar;
