const fs = require('fs');

const content = fs.readFileSync('c:\\SpeakAI\\src\\App.tsx', 'utf-8');
const lines = content.split('\n');

if (!fs.existsSync('c:\\SpeakAI\\src\\components')) fs.mkdirSync('c:\\SpeakAI\\src\\components');

// 1. Write firestore-errors.ts
let errorsCode = `import { auth } from '../firebase';\n\n`;
errorsCode += lines.slice(105, 166).join('\n')
  .replace('enum OperationType', 'export enum OperationType')
  .replace('interface FirestoreErrorInfo', 'export interface FirestoreErrorInfo')
  .replace('function handleFirestoreError', 'export function handleFirestoreError');

fs.writeFileSync('c:\\SpeakAI\\src\\lib\\firestore-errors.ts', errorsCode);

const commonImports = `import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Mic, Upload, BarChart3, History, Settings, LayoutDashboard, LogOut, Play, Square, Loader2, ChevronRight, TrendingUp, MessageSquare, Smile, Zap, CheckCircle2, AlertCircle, X, Clock, FileAudio, User, ShieldCheck, ArrowRight, Sparkles, Search, Filter, Bell, CreditCard, Lock, Globe, Moon, Sun, Mail, Camera, Trash2, Eye, EyeOff, Key, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { cn } from '../lib/utils';
import { auth, loginWithGoogle, logout, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, updateProfile, db, collection, query, where, orderBy, onSnapshot, doc, setDoc, getDoc, getDocFromServer, getDocs, updateDoc, deleteDoc, FirebaseUser } from '../firebase';
import { AppState, AnalysisResult } from '../types';
import { analyzeAudio, generateScript } from '../services/gemini';
import { OperationType, handleFirestoreError } from '../lib/firestore-errors';`;

const boundaries = [
  { name: 'ConfirmModal', start: 169 },
  { name: 'Sidebar', start: 219 },
  { name: 'HistoryView', start: 310 },
  { name: 'LoginModal', start: 501 },
  { name: 'LandingPage', start: 792 },
  { name: 'OnboardingFlow', start: 998 },
  { name: 'SettingsView', start: 1091 },
  { name: 'ProfileView', start: 1203 },
  { name: 'Dashboard', start: 1438 },
  { name: 'RecordingSetup', start: 1610 },
  { name: 'RecordingScreen', start: 1741 },
  { name: 'ProcessingScreen', start: 1905 },
  { name: 'ResultsDashboard', start: 1973 },
  { name: 'App', start: 2663 }
];

for (let i = 0; i < boundaries.length - 1; i++) {
  const current = boundaries[i];
  const next = boundaries[i+1];
  let componentLines = lines.slice(current.start - 1, next.start - 1);
  let fileContent = commonImports + '\n\n' + componentLines.join('\n') + '\nexport default ' + current.name + ';\n';
  fs.writeFileSync('c:\\SpeakAI\\src\\components\\' + current.name + '.tsx', fileContent);
}

// Write the new App.tsx
let newAppContent = `/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */\n\n` + commonImports + '\n\n';

for (let i=0; i<boundaries.length - 1; i++) {
  newAppContent += `import ${boundaries[i].name} from './components/${boundaries[i].name}';\n`;
}

newAppContent += '\n' + lines.slice(90, 105).join('\n') + '\n\n';
newAppContent += lines.slice(2662).join('\n');

fs.renameSync('c:\\SpeakAI\\src\\App.tsx', 'c:\\SpeakAI\\src\\App.backup.tsx');
fs.writeFileSync('c:\\SpeakAI\\src\\App.tsx', newAppContent);

console.log("Splitting finished successfully.");
