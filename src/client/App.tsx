import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Shell } from './components/Shell';

const Today=lazy(()=>import('./routes/Today').then((module)=>({default:module.Today})));
const DailySession=lazy(()=>import('./routes/DailySession').then((module)=>({default:module.DailySession})));
const Assessment=lazy(()=>import('./routes/Assessment').then((module)=>({default:module.Assessment})));
const Review=lazy(()=>import('./routes/Review').then((module)=>({default:module.Review})));
const Learn=lazy(()=>import('./routes/Learn').then((module)=>({default:module.Learn})));
const Drill=lazy(()=>import('./routes/Drill').then((module)=>({default:module.Drill})));
const Speak=lazy(()=>import('./routes/Speak').then((module)=>({default:module.Speak})));
const SpeakSession=lazy(()=>import('./routes/Speak').then((module)=>({default:module.SpeakSession})));
const Write=lazy(()=>import('./routes/Write').then((module)=>({default:module.Write})));
const Prepare=lazy(()=>import('./routes/Prepare').then((module)=>({default:module.Prepare})));
const Capture=lazy(()=>import('./routes/Capture').then((module)=>({default:module.Capture})));
const Patterns=lazy(()=>import('./routes/Patterns').then((module)=>({default:module.Patterns})));
const Library=lazy(()=>import('./routes/Library').then((module)=>({default:module.Library})));
const Progress=lazy(()=>import('./routes/Progress').then((module)=>({default:module.Progress})));
const Report=lazy(()=>import('./routes/Reports').then((module)=>({default:module.Report})));
const Settings=lazy(()=>import('./routes/Settings').then((module)=>({default:module.Settings})));

export function App(){return <Suspense fallback={<div className="page narrow"><p>Loading workspace…</p></div>}><Routes><Route element={<Shell/>}><Route index element={<Navigate to="/today" replace/>}/><Route path="today" element={<Today/>}/><Route path="session" element={<DailySession/>}/><Route path="assessment" element={<Assessment/>}/><Route path="review" element={<Review/>}/><Route path="learn/:unitId" element={<Learn/>}/><Route path="drill" element={<Drill/>}/><Route path="speak" element={<Speak/>}/><Route path="speak/:sessionId" element={<SpeakSession/>}/><Route path="write" element={<Write/>}/><Route path="prepare" element={<Prepare/>}/><Route path="capture" element={<Capture/>}/><Route path="patterns" element={<Patterns/>}/><Route path="library" element={<Library/>}/><Route path="progress" element={<Progress/>}/><Route path="reports/:id" element={<Report/>}/><Route path="settings" element={<Settings/>}/><Route path="*" element={<Navigate to="/today" replace/>}/></Route></Routes></Suspense>}
