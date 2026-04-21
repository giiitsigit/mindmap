import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  useNodesState, 
  useEdgesState,
  Panel,
  ReactFlowProvider
} from 'reactflow';
import 'reactflow/dist/style.css';
import { 
  Share2, 
  Save, 
  Cloud, 
  CloudOff, 
  Plus, 
  BrainCircuit, 
  Zap, 
  Sidebar as SidebarIcon,
  LogOut,
  ChevronRight,
  Menu,
  Palette,
  Layout
} from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { auth } from './firebase';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { db as ldb } from './localDb';
import { useLiveQuery } from 'dexie-react-hooks';
import { nanoid } from 'nanoid';
import { MindMap, Theme } from './types';
import { parseTextToFlow } from './parser';
import { useSync } from './sync';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const GEN_AI_MODEL = 'gemini-3-flash-preview';

export default function App() {
  const { isOnline, user } = useSync();
  const [activeMapId, setActiveMapId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [theme, setTheme] = useState<Theme>('organic'); // Default to organic for natural tones
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const maps = useLiveQuery(() => ldb.mindmaps.toArray()) || [];
  const activeMap = useMemo(() => maps.find(m => m.id === activeMapId), [maps, activeMapId]);

  useEffect(() => {
    if (activeMap) {
      setNodes(activeMap.data.nodes);
      setEdges(activeMap.data.edges);
      setTheme(activeMap.theme);
      // Re-construct text if needed, but for now we trust the flow data
    } else {
      setNodes([]);
      setEdges([]);
    }
  }, [activeMapId, activeMap, setNodes, setEdges]);

  const handleCreateNew = () => {
    const id = nanoid();
    const newMap: MindMap = {
      id,
      title: 'Untilted Map',
      theme: 'modern',
      data: { nodes: [], edges: [] },
      updatedAt: Date.now(),
      ownerId: user?.uid || 'local',
      isDirty: 1
    };
    ldb.mindmaps.add(newMap);
    setActiveMapId(id);
    setInputText('');
  };

  const handleGenerateFromText = useCallback((text: string, currentTheme: Theme) => {
    const { nodes: newNodes, edges: newEdges } = parseTextToFlow(text, currentTheme);
    setNodes(newNodes);
    setEdges(newEdges);
    
    if (activeMapId) {
      ldb.mindmaps.update(activeMapId, {
        data: { nodes: newNodes, edges: newEdges },
        updatedAt: Date.now(),
        isDirty: 1
      });
    }
  }, [activeMapId, setNodes, setEdges]);

  const handleAiGenerate = async () => {
    if (!inputText) return;
    setIsAiLoading(true);
    try {
      const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await genAI.models.generateContent({
        model: GEN_AI_MODEL,
        contents: `Buat struktur mindmap hierarkis untuk topik berikut: "${inputText}". 
        Hanya berikan dalam format teks terindentasi (indentasi 2 spasi untuk subtopik). 
        Topik utama di baris pertama tanpa indentasi.`,
      });
      const generatedText = response.text || '';
      setInputText(generatedText);
      handleGenerateFromText(generatedText, theme);
    } catch (error) {
      console.error('AI error:', error);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  return (
    <div className="flex h-screen w-full bg-natural-bg text-natural-text font-sans overflow-hidden">
      {/* Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 300, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="flex-shrink-0 bg-white border-r border-natural-border flex flex-col h-full shadow-xl z-20"
          >
            <div className="p-6 flex items-center justify-between border-b border-natural-surface">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-natural-sage rounded-xl flex items-center justify-center shadow-lg shadow-natural-sage/20">
                  <BrainCircuit className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-xl font-bold tracking-tight text-natural-ink">AuraMap</h1>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-natural-surface rounded-lg transition-colors">
                <SidebarIcon className="w-5 h-5 text-natural-meta" />
              </button>
            </div>

            <div className="p-4 flex flex-col gap-4 overflow-y-auto flex-grow">
              <button 
                onClick={handleCreateNew}
                className="w-full flex items-center justify-center gap-2 py-3 bg-natural-sage text-white rounded-xl font-medium hover:opacity-90 transition-all shadow-lg shadow-natural-sage/20 active:scale-95"
              >
                <Plus className="w-5 h-5" /> New Mindmap
              </button>

              <div className="mt-4">
                <h2 className="text-[10px] uppercase font-bold text-natural-meta tracking-widest px-2 mb-3">Recent Maps</h2>
                <div className="space-y-1">
                  {maps.map(map => (
                    <button
                      key={map.id}
                      onClick={() => setActiveMapId(map.id)}
                      className={cn(
                        "w-full text-left px-3 py-3 rounded-lg flex items-center gap-3 transition-all truncate group text-sm",
                        activeMapId === map.id ? "bg-natural-hover text-natural-ink border-l-4 border-natural-sage font-semibold" : "hover:bg-natural-surface text-natural-muted"
                      )}
                    >
                      <Layout className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate flex-grow">{map.title}</span>
                      <ChevronRight className={cn("w-4 h-4 opacity-0 transition-opacity", activeMapId === map.id && "opacity-100")} />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-auto p-4 border-t border-natural-border bg-natural-surface/50">
              {user ? (
                <div className="flex items-center gap-3">
                  <img src={user.photoURL || ''} className="w-10 h-10 rounded-full border-2 border-white shadow-sm" alt="" referrerPolicy="no-referrer" />
                  <div className="flex-grow min-w-0">
                    <p className="text-sm font-semibold truncate text-natural-ink">{user.displayName}</p>
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-natural-hover rounded-full w-fit mt-1">
                      <div className={cn("w-1.5 h-1.5 rounded-full", isOnline ? "bg-natural-sage" : "bg-natural-meta")} />
                      <span className="text-[10px] font-bold uppercase tracking-tighter text-natural-muted leading-none">
                        {isOnline ? 'Synced' : 'Offline'}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => signOut(auth)} className="p-2 hover:text-red-600 transition-colors">
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button 
                  onClick={handleLogin}
                  className="w-full flex items-center justify-center gap-2 py-3 border-2 border-natural-border rounded-xl font-medium hover:bg-white transition-all hover:border-natural-sage/30 text-natural-muted"
                >
                  <Cloud className="w-5 h-5 text-natural-sage" /> Sync with Cloud
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-grow flex flex-col h-full bg-natural-bg relative">
        {/* Top Header */}
        <header className="h-16 flex-shrink-0 bg-white/50 backdrop-blur-md border-b border-natural-border px-6 flex items-center justify-between z-10 text-natural-ink">
          <div className="flex items-center gap-4">
            {!isSidebarOpen && (
              <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-natural-surface rounded-lg transition-colors">
                <Menu className="w-5 h-5" />
              </button>
            )}
            {activeMapId ? (
              <input 
                value={activeMap?.title || ''} 
                onChange={(e) => ldb.mindmaps.update(activeMapId, { title: e.target.value, updatedAt: Date.now(), isDirty: 1 })}
                className="text-lg font-semibold bg-transparent border-none focus:ring-0 w-64 px-1 text-natural-ink"
                placeholder="Name your map..."
              />
            ) : (
              <p className="text-natural-meta italic">Select or create a map to start</p>
            )}
          </div>
          
          <div className="flex items-center gap-2">
             {activeMapId && (
              <div className="flex bg-natural-surface p-1 rounded-xl gap-1 border border-natural-border">
                {(['modern', 'cyberpunk', 'organic', 'brutalist', 'minimal'] as Theme[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setTheme(t);
                      ldb.mindmaps.update(activeMapId, { theme: t, updatedAt: Date.now(), isDirty: 1 });
                      handleGenerateFromText(inputText, t);
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider font-bold transition-all",
                      theme === t ? "bg-white text-natural-sage shadow-sm border border-natural-border" : "text-natural-meta hover:bg-white/50"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
             )}
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-grow flex relative">
          {/* Controls Panel (Overlay) */}
          {activeMapId && (
            <div className="absolute left-6 top-6 w-80 z-10 flex flex-col gap-4">
              <div className="bg-white/90 backdrop-blur shadow-2xl rounded-2xl p-5 border border-natural-border flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest text-natural-ink flex items-center gap-2">
                    <Palette className="w-4 h-4 text-natural-sage" /> Map Data
                  </h3>
                  <button 
                    disabled={isAiLoading || !inputText}
                    onClick={handleAiGenerate}
                    className="p-2 text-natural-sage hover:bg-natural-surface rounded-lg transition-all disabled:opacity-50"
                    title="Generate with AI"
                  >
                    <BrainCircuit className={cn("w-5 h-5", isAiLoading && "animate-pulse")} />
                  </button>
                </div>
                <textarea 
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="w-full h-48 bg-natural-surface/50 border border-natural-border rounded-xl p-3 text-sm font-medium focus:ring-2 focus:ring-natural-sage/20 focus:border-natural-sage/40 transition-all outline-none"
                  placeholder="Root Topic&#10;  Subtopic 1&#10;    Concept A&#10;    Concept B&#10;  Subtopic 2"
                />
                <button 
                  onClick={() => handleGenerateFromText(inputText, theme)}
                  className="w-full py-3 bg-natural-ink text-white rounded-xl text-sm font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" /> Apply Changes
                </button>
              </div>

              {/* Status Info */}
              <div className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 border shadow-lg backdrop-blur bg-white/90",
                isOnline ? "border-natural-sage/20 text-natural-sage" : "border-natural-meta/20 text-natural-meta"
              )}>
                <div className={cn("w-2 h-2 rounded-full", isOnline ? "bg-natural-sage shadow-[0_0_8px_#829281]" : "bg-natural-meta animate-pulse")} />
                {isOnline ? 'Cloud Synced' : 'Offline Persistence'}
              </div>
            </div>
          )}

          {/* Visual Canvas */}
          <div className={cn("flex-grow h-full bg-slate-50", `theme-${theme}`)}>
            {activeMapId ? (
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                fitView
              >
                <Background 
                  style={{ backgroundImage: 'radial-gradient(#E8E2D9 1px, transparent 1px)', backgroundSize: '32px 32px' }}
                />
                <Controls className="bg-white border-natural-border rounded-lg shadow-xl" />
              </ReactFlow>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
                <div className="w-24 h-24 bg-blue-100 rounded-3xl flex items-center justify-center mb-6">
                  <BrainCircuit className="w-12 h-12 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold mb-3">Welcome to MindSync</h2>
                <p className="text-slate-500 mb-8 leading-relaxed">
                  Start visualizing your ideas with offline-first brain maps. Create a new map to begin your journey.
                </p>
                <button 
                  onClick={handleCreateNew}
                  className="flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-xl hover:shadow-blue-200 active:scale-95"
                >
                  <Plus className="w-6 h-6" /> Create My First Map
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
