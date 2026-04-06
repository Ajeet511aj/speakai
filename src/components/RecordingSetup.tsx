import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Mic, Upload, BarChart3, History, Settings, LayoutDashboard, LogOut, Play, Square, Loader2, ChevronRight, TrendingUp, MessageSquare, Smile, Zap, CheckCircle2, AlertCircle, X, Clock, FileAudio, User, ShieldCheck, ArrowRight, Sparkles, Search, Filter, Bell, CreditCard, Lock, Globe, Moon, Sun, Mail, Camera, Trash2, Eye, EyeOff, Key, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { cn } from '../lib/utils';
import { auth, loginWithGoogle, logout, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, updateProfile, db, collection, query, where, orderBy, onSnapshot, doc, setDoc, getDoc, getDocFromServer, getDocs, updateDoc, deleteDoc, FirebaseUser } from '../firebase';
import { AppState, AnalysisResult } from '../types';
import { analyzeAudio, generateScript } from '../services/gemini';
import { OperationType, handleFirestoreError } from '../lib/firestore-errors';

const RecordingSetup = ({ onStart, onCancel, isDemoMode }: {
  onStart: (script: string, wpm: number) => void,
  onCancel: () => void,
  isDemoMode: boolean
}) => {
  const [script, setScript] = useState('');
  const [topic, setTopic] = useState('');
  const [wpm, setWpm] = useState(150);
  const [language, setLanguage] = useState('English');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateScript = async () => {
    if (!topic) return;
    setIsGenerating(true);
    try {
      const generated = await generateScript(topic, language);
      setScript(generated);
    } catch (err) {
      console.error("Failed to generate script", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const languages = ['English', 'Hindi'];

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <header className="mb-10 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Recording Setup</h2>
          <p className="text-slate-500 dark:text-slate-400">Prepare your script and settings before you start.</p>
        </div>
        <button onClick={onCancel} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
          <X className="w-6 h-6 text-slate-400" />
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="flex flex-col gap-4 mb-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-indigo-600" />
                  Teleprompter Script
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {!script && (
                  <>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="bg-slate-50 dark:bg-slate-800 border-none text-sm rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 min-w-[100px]"
                    >
                      {languages.map(lang => (
                        <option key={lang} value={lang}>{lang}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Enter topic..."
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="flex-1 bg-slate-50 dark:bg-slate-800 border-none text-sm rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                    />
                  </>
                )}
                <button
                  onClick={handleGenerateScript}
                  disabled={isGenerating || !topic}
                  className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-all disabled:opacity-50 shrink-0"
                  title="Generate Script with AI"
                >
                  {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder="Paste your script here or generate one using a topic..."
              className="w-full h-64 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              Speech Pace
            </h3>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-sm font-medium text-slate-500 mb-2">
                  <span>Target WPM</span>
                  <span className="text-indigo-600 font-bold">{wpm} WPM</span>
                </div>
                <input
                  type="range"
                  min="80"
                  max="250"
                  step="5"
                  value={wpm}
                  onChange={(e) => setWpm(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full appearance-none cursor-pointer accent-indigo-600"
                />
                <p className="mt-2 text-[10px] text-slate-400 italic">Average speaking speed is 130-160 WPM.</p>
              </div>
            </div>
          </div>

          <div className="bg-indigo-600 p-8 rounded-[32px] text-white shadow-xl shadow-indigo-600/20">
            <h4 className="text-xl font-bold mb-2">Ready to practice?</h4>
            <p className="text-indigo-100 text-sm mb-6">The teleprompter will follow your {wpm} WPM target.</p>
            <button
              onClick={() => onStart(script, wpm)}
              className="w-full py-4 bg-white text-indigo-600 font-bold rounded-2xl hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5 fill-current" />
              {script ? 'Start Practice' : 'Start Recording'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecordingSetup;
