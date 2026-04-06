import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Mic, Upload, BarChart3, History, Settings, LayoutDashboard, LogOut, Play, Square, Loader2, ChevronRight, TrendingUp, MessageSquare, Smile, Zap, CheckCircle2, AlertCircle, X, Clock, FileAudio, User, ShieldCheck, ArrowRight, Sparkles, Search, Filter, Bell, CreditCard, Lock, Globe, Moon, Sun, Mail, Camera, Trash2, Eye, EyeOff, Key, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { cn } from '../lib/utils';
import { auth, loginWithGoogle, logout, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, updateProfile, db, collection, query, where, orderBy, onSnapshot, doc, setDoc, getDoc, getDocFromServer, getDocs, updateDoc, deleteDoc, FirebaseUser } from '../firebase';
import { AppState, AnalysisResult } from '../types';
import { analyzeAudio, generateScript } from '../services/gemini';
import { OperationType, handleFirestoreError } from '../lib/firestore-errors';

const SettingsView = ({ onLogout, darkMode, setDarkMode, language, setLanguage, onSignInClick, isDemoMode }: {
  onLogout: () => void,
  darkMode: boolean,
  setDarkMode: (v: boolean) => void,
  language: string,
  setLanguage: (v: string) => void,
  onSignInClick: () => void,
  isDemoMode: boolean
}) => {
  const [notifications, setNotifications] = useState(true);

  const sections = [
    {
      title: language === 'Hindi' ? 'सामान्य' : 'General',
      icon: Settings,
      options: [
        { label: language === 'Hindi' ? 'पुश नोटिफिकेशन' : 'Push Notifications', description: language === 'Hindi' ? 'विश्लेषण पूरा होने पर अलर्ट प्राप्त करें' : 'Get alerts for analysis completion', type: 'toggle', value: notifications, onChange: setNotifications },
        { label: language === 'Hindi' ? 'डार्क मोड' : 'Dark Mode', description: language === 'Hindi' ? 'डार्क इंटरफेस पर स्विच करें' : 'Switch to a darker interface', type: 'toggle', value: darkMode, onChange: setDarkMode }
      ]
    },
    {
      title: language === 'Hindi' ? 'सदस्यता' : 'Subscription',
      icon: CreditCard,
      options: [
        { label: language === 'Hindi' ? 'वर्तमान योजना' : 'Current Plan', description: language === 'Hindi' ? 'आप प्रो प्लान ($19/mo) पर हैं' : 'You are on the Pro Plan ($19/mo)', type: 'button', actionLabel: language === 'Hindi' ? 'योजना प्रबंधित करें' : 'Manage Plan' },
        { label: language === 'Hindi' ? 'बिलिंग इतिहास' : 'Billing History', description: language === 'Hindi' ? 'अपने पिछले चालान देखें और डाउनलोड करें' : 'View and download your past invoices', type: 'button', actionLabel: language === 'Hindi' ? 'चालान देखें' : 'View Invoices' },
      ]
    }
  ];

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-12 flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
            {language === 'Hindi' ? 'सेटिंग्स' : 'Settings'}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">
            {language === 'Hindi' ? 'अपनी खाता प्राथमिकताएं और सदस्यता प्रबंधित करें।' : 'Manage your account preferences and subscription.'}
          </p>
        </div>
        {isDemoMode ? (
          <button
            onClick={onSignInClick}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20"
          >
            <User className="w-5 h-5" />
            {language === 'Hindi' ? 'साइन इन करें' : 'Sign In'}
          </button>
        ) : (
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-6 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold rounded-2xl hover:bg-red-100 transition-all"
          >
            <LogOut className="w-5 h-5" />
            {language === 'Hindi' ? 'लॉग आउट' : 'Log Out'}
          </button>
        )}
      </div>

      <div className="space-y-8">
        {sections.map((section, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center gap-3">
              <section.icon className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-slate-900 dark:text-white">{section.title}</h3>
            </div>
            <div className="divide-y divide-slate-50 dark:divide-slate-800">
              {section.options.map((opt, i) => (
                <div key={i} className="px-8 py-6 flex items-center justify-between gap-6">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white mb-0.5">{opt.label}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{opt.description}</p>
                  </div>
                  {opt.type === 'toggle' && (
                    <button
                      onClick={() => opt.onChange?.(!opt.value)}
                      className={cn(
                        "w-12 h-6 rounded-full transition-colors relative",
                        opt.value ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-700"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 w-4 h-4 bg-white rounded-full transition-transform",
                        opt.value ? "left-7" : "left-1"
                      )} />
                    </button>
                  )}
                  {opt.type === 'select' && (
                    <select
                      value={opt.value as string}
                      onChange={(e) => opt.onChange?.(e.target.value)}
                      className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      {opt.options?.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  )}
                  {opt.type === 'button' && (
                    <button className="px-4 py-2 bg-slate-900 dark:bg-slate-800 text-white text-sm font-bold rounded-xl hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors border border-transparent dark:border-slate-700">
                      {opt.actionLabel}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SettingsView;
