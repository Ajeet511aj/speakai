import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Mic, Upload, BarChart3, History, Settings, LayoutDashboard, LogOut, Play, Square, Loader2, ChevronRight, TrendingUp, MessageSquare, Smile, Zap, CheckCircle2, AlertCircle, X, Clock, FileAudio, User, ShieldCheck, ArrowRight, Sparkles, Search, Filter, Bell, CreditCard, Lock, Globe, Moon, Sun, Mail, Camera, Trash2, Eye, EyeOff, Key, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { cn } from '../lib/utils';
import { auth, loginWithGoogle, logout, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, updateProfile, db, collection, query, where, orderBy, onSnapshot, doc, setDoc, getDoc, getDocFromServer, getDocs, updateDoc, deleteDoc, FirebaseUser } from '../firebase';
import { AppState, AnalysisResult } from '../types';
import { analyzeAudio, generateScript } from '../services/gemini';
import { OperationType, handleFirestoreError } from '../lib/firestore-errors';

const OnboardingFlow = ({ onComplete }: { onComplete: () => void }) => {
  const [step, setStep] = useState(0);
  const steps = [
    {
      title: "Welcome to SpeakAI",
      description: "Your AI-powered speech coach. Let's take a quick tour of how we can help you master your vocal delivery.",
      icon: <Sparkles className="w-12 h-12 text-indigo-600" />,
      image: "https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&q=80&w=800"
    },
    {
      title: "Record & Practice",
      description: "Use our smart teleprompter to practice your speeches. We'll monitor your pace, tone, and clarity in real-time.",
      icon: <Mic className="w-12 h-12 text-indigo-600" />,
      image: "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?auto=format&fit=crop&q=80&w=800"
    },
    {
      title: "Deep Analysis",
      description: "Get instant feedback on your WPM, filler words, emotional resonance, and vocal variety using advanced AI models.",
      icon: <BarChart3 className="w-12 h-12 text-indigo-600" />,
      image: "https://images.unsplash.com/photo-1551288049-bbda48658a7d?auto=format&fit=crop&q=80&w=800"
    },
    {
      title: "Actionable Insights",
      description: "Receive personalized recommendations to improve your public speaking skills and track your progress over time.",
      icon: <Zap className="w-12 h-12 text-indigo-600" />,
      image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800"
    }
  ];

  const next = () => {
    if (step < steps.length - 1) setStep(step + 1);
    else onComplete();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-[40px] overflow-hidden shadow-2xl flex flex-col md:flex-row h-[600px]"
      >
        <div className="flex-1 p-12 flex flex-col justify-between">
          <div>
            <div className="mb-8">{steps[step].icon}</div>
            <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-4 leading-tight">
              {steps[step].title}
            </h2>
            <p className="text-xl text-slate-500 dark:text-slate-400 leading-relaxed">
              {steps[step].description}
            </p>
          </div>

          <div className="flex items-center justify-between mt-12">
            <div className="flex gap-2">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-2 rounded-full transition-all duration-300",
                    i === step ? "w-8 bg-indigo-600" : "w-2 bg-slate-200 dark:bg-slate-800"
                  )}
                />
              ))}
            </div>
            <button
              onClick={next}
              className="px-8 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-500 transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20"
            >
              {step === steps.length - 1 ? "Get Started" : "Next Step"}
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="hidden md:block w-1/2 relative bg-slate-100 dark:bg-slate-800">
          <AnimatePresence mode="wait">
            <motion.img
              key={step}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              src={steps[step].image}
              className="absolute inset-0 w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </AnimatePresence>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent" />
        </div>
      </motion.div>
    </div>
  );
};

export default OnboardingFlow;
