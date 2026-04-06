import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Mic, Upload, BarChart3, History, Settings, LayoutDashboard, LogOut, Play, Square, Loader2, ChevronRight, TrendingUp, MessageSquare, Smile, Zap, CheckCircle2, AlertCircle, X, Clock, FileAudio, User, ShieldCheck, ArrowRight, Sparkles, Search, Filter, Bell, CreditCard, Lock, Globe, Moon, Sun, Mail, Camera, Trash2, Eye, EyeOff, Key, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { cn } from '../lib/utils';
import { auth, loginWithGoogle, logout, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, updateProfile, db, collection, query, where, orderBy, onSnapshot, doc, setDoc, getDoc, getDocFromServer, getDocs, updateDoc, deleteDoc, FirebaseUser } from '../firebase';
import { AppState, AnalysisResult } from '../types';
import { analyzeAudio, generateScript } from '../services/gemini';
import { OperationType, handleFirestoreError } from '../lib/firestore-errors';

const LandingPage = ({ onStart, onDemo }: { onStart: () => void, onDemo: () => void }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden relative scroll-smooth">
      {/* Background Glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] translate-y-1/2 pointer-events-none" />

      <nav className="max-w-7xl mx-auto px-6 py-8 flex justify-between items-center relative z-10">
        <div className="flex items-center gap-2">
          <Zap className="w-8 h-8 text-indigo-500 fill-current" />
          <span className="text-2xl font-bold tracking-tight">SpeakAI</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-slate-400 font-medium">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          <button onClick={onStart} className="bg-white text-slate-950 px-6 py-2.5 rounded-full font-bold hover:bg-indigo-50 transition-all active:scale-95">
            Sign In
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 pt-20 pb-32 relative z-10">
        <div className="max-w-3xl mb-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              <span>New: Enterprise Emotion AI v2.0</span>
            </div>
            <h1 className="text-7xl font-bold leading-[1.1] tracking-tight mb-8">
              Analyze Your Voice <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-blue-400">Like a Professional.</span>
            </h1>
            <p className="text-xl text-slate-400 leading-relaxed mb-10 max-w-2xl">
              The world's most advanced AI-powered voice coaching platform.
              Get instant feedback on emotion, pacing, and clarity to transform
              your communication skills.
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={onStart}
                className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-indigo-500 transition-all flex items-center gap-3 group shadow-lg shadow-indigo-600/20"
              >
                Sign In to Start
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={onDemo}
                className="bg-slate-900 border border-slate-800 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-slate-800 transition-all"
              >
                Try Demo Mode
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.8, duration: 1 }}
            className="mt-20 flex items-center gap-12 grayscale opacity-50"
          >
            <span className="text-sm font-bold uppercase tracking-widest text-slate-500">Trusted By</span>
            <div className="flex gap-8 items-center">
              <div className="text-xl font-black">TECHCORP</div>
              <div className="text-xl font-black">GLOBALEDU</div>
              <div className="text-xl font-black">VOICEMEDIA</div>
            </div>
          </motion.div>
        </div>

        {/* Features Section */}
        <section id="features" className="py-32 border-t border-slate-900">
          <div className="mb-16">
            <h2 className="text-4xl font-bold mb-4">Powerful Features</h2>
            <p className="text-slate-400 text-lg max-w-2xl">Everything you need to master your vocal presence and communication style.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Mic, title: "Real-time Analysis", desc: "Get instant feedback as you speak, with low-latency processing." },
              { icon: Smile, title: "Emotion Detection", desc: "Understand the emotional impact of your voice with advanced AI." },
              { icon: BarChart3, title: "Deep Metrics", desc: "Track WPM, filler words, pitch variance, and vocal professionality." },
              { icon: MessageSquare, title: "Smart Transcripts", desc: "AI-generated transcripts with key insight highlighting." },
              { icon: TrendingUp, title: "Progress Tracking", desc: "Visualize your improvement over time with detailed history." },
              { icon: ShieldCheck, title: "Enterprise Security", desc: "Your data is encrypted and private, following strict security standards." }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-8 bg-slate-900/50 border border-slate-800 rounded-[32px] hover:border-indigo-500/50 transition-all group"
              >
                <div className="w-12 h-12 bg-indigo-600/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 transition-colors">
                  <feature.icon className="w-6 h-6 text-indigo-400 group-hover:text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-slate-400 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>



        {/* Pricing Section */}
        <section id="pricing" className="py-32 border-t border-slate-900">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-slate-400 text-lg">Choose the plan that's right for your communication goals.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                name: "Free",
                price: "₹0",
                features: [
                  "2 analyses / month",
                  "Basic emotion detection",
                  "24-hour history",
                  "Standard support"
                ]
              },
              {
                name: "Pro",
                price: "₹49",
                popular: true,
                features: [
                  "Unlimited analyses",
                  "Advanced vocal metrics",
                  "Lifetime history",
                  "Priority support",
                  "PDF & HTML reports",
                  "Smart teleprompter"
                ]
              },
              {
                name: "Enterprise",
                price: "₹99",
                features: [
                  "Everything in Pro",
                  "Team collaboration",
                  "API access",
                  "Custom AI training",
                  "Dedicated account manager",
                  "SLA guarantee",
                  "Bulk data export"
                ]
              }
            ].map((plan, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={cn(
                  "p-10 rounded-[40px] border flex flex-col relative",
                  plan.popular ? "bg-indigo-600 border-indigo-500 shadow-2xl shadow-indigo-600/20" : "bg-slate-900 border-slate-800"
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-white text-indigo-600 px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest">
                    Most Popular
                  </div>
                )}
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-5xl font-black">{plan.price}</span>
                  {plan.price !== "Custom" && <span className="text-slate-400">/mo</span>}
                </div>
                <ul className="space-y-4 mb-10 flex-1">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-3 text-sm">
                      <CheckCircle2 className={cn("w-5 h-5", plan.popular ? "text-indigo-200" : "text-indigo-500")} />
                      <span className={plan.popular ? "text-indigo-50" : "text-slate-300"}>{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={onStart}
                  className={cn(
                    "w-full py-4 rounded-2xl font-bold transition-all active:scale-95",
                    plan.popular ? "bg-white text-indigo-600 hover:bg-indigo-50" : "bg-slate-800 text-white hover:bg-slate-700"
                  )}
                >
                  {plan.price === "Custom" ? "Contact Sales" : "Get Started"}
                </button>
              </motion.div>
            ))}
          </div>
        </section>
      </main>

      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-slate-900 text-center text-slate-500 text-sm">
        <p>&copy; 2026 SpeakAI. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
