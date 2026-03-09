import { useState, useEffect, useMemo, Component, Suspense } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import localforage from 'localforage';
import './App.css';

import Dashboard from './components/Dashboard';
import TaskExecution from './components/TaskExecution';
import SummaryViewer from './components/SummaryViewer';
import MaterialsView from './components/MaterialsView';
import StatsDashboard from './components/StatsDashboard';
import ProfileView from './components/ProfileView';
import CalendarView from './components/CalendarView';
import SimuladoView from './components/SimuladoView';
import RedacaoView from './components/RedacaoView';
import TafView, { type TafExercise } from './components/TafView';
import RevisaoView from './components/RevisaoView';
import P2PGroupView from './components/P2PGroupView';
import { useP2P } from './hooks/useP2P';

class ErrorBoundary extends Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{padding: '50px', color: '#fff', textAlign: 'center', background: '#08080c', height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'}}>
          <h2>🏮 Ops! O sistema falhou.</h2>
          <p style={{color: 'var(--text-dim)', marginBottom: '20px'}}>Um erro crítico impediu a renderização desta aba.</p>
          <button onClick={() => window.location.reload()} className="btn-secondary" style={{marginTop: '10px'}}>
            Tentar Recarregar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export interface TopicMaterial {
  id: string;
  name: string;
  url: string;
}

export interface Topic {
  id: string;
  name: string;
  status: 'todo' | 'base_done' | 'completed';
  materials: TopicMaterial[]; 
  minutesSpent: number;
  questionsDone: number;
  questionsCorrect: number;
  summaryLocation?: string;
}

export interface Subject {
  id: string;
  name: string;
  topics: Topic[];
  rating?: number;
}

export interface Task {
  id: string;
  subjectId: string;
  subjectName: string;
  topic: Topic;
  type: string;
}

export interface Essay {
  id: string;
  date: string;
  title: string;
  pdfUrl: string; // key for localforage
  corrections: string;
  score: number;
  timeMinutes: number;
}

export interface Simulado {
  id: string;
  date: string;
  description: string;
  totalQuestions: number;
  hits: number;
  timeMinutes: number;
}

export interface UserProfile {
  name: string;
  username?: string;
  targetJob: string;
  weeklyHours: number;
  badgeUrl2?: string;
  studyMinutesGoal?: number;
  restMinutesGoal?: number;
  enablePomodoro?: boolean;
}

export interface StudySession {
  date: string;
  count: number;
}

export interface CycleConfig {
  numDays: number;
  schedule: Record<string, string[]>;
  startDate: string;
  simInterval: number;
  currentDay?: number;
}

function AppContent() {
  const [currentView, setCurrentView] = useState<'stats' | 'dashboard' | 'task' | 'summary' | 'materials' | 'profile' | 'calendar' | 'simulado' | 'redacao' | 'taf' | 'revisao' | 'p2p'>(() => {
    const saved = localStorage.getItem('pobruja-current-view');
    const validViews = ['stats', 'dashboard', 'task', 'summary', 'materials', 'profile', 'calendar', 'simulado', 'redacao', 'taf', 'revisao', 'p2p'];
    return (saved && validViews.includes(saved)) ? (saved as any) : 'stats';
  });

  const [selectedTask, setSelectedTask] = useState<Task | null>(() => {
    try {
      const saved = localStorage.getItem('pobruja-selected-task');
      if (saved && saved !== 'undefined' && saved !== 'null') {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && parsed.id) return parsed;
      }
    } catch (e) { console.error('Task restore error', e); }
    return null;
  });

  const [badgeUrl, setBadgeUrl] = useState<string | null>(null);
  const [badgeUrl2, setBadgeUrl2] = useState<string | null>(null);
  
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('pobruja-profile');
      if (saved && saved !== 'undefined' && saved !== 'null') {
        const parsed = JSON.parse(saved);
        return { 
          studyMinutesGoal: 90, 
          restMinutesGoal: 30, 
          enablePomodoro: true,
          ...parsed 
        };
      }
    } catch (e) { console.error(e); }
    return { name: '', username: '', targetJob: '', weeklyHours: 0, studyMinutesGoal: 90, restMinutesGoal: 30, enablePomodoro: true };
  });
  
  const [subjects, setSubjects] = useState<Subject[]>(() => {
    try {
      const saved = localStorage.getItem('pobruja-subjects');
      if (saved && saved !== 'undefined' && saved !== 'null') {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Migração automática de horas para minutos
          return parsed.map((s: any) => ({
            ...s,
            topics: (s.topics || []).map((t: any) => {
              if (t.hoursSpent !== undefined && t.minutesSpent === undefined) {
                const mins = Math.round(t.hoursSpent * 60);
                const { hoursSpent, ...rest } = t;
                return { ...rest, minutesSpent: mins };
              }
              return t;
            })
          }));
        }
      }
    } catch (e) { console.error('Subject restore error', e); }
    return [];
  });

  const [essays, setEssays] = useState<Essay[]>(() => {
    try {
      const saved = localStorage.getItem('pobruja-essays');
      if (saved && saved !== 'undefined' && saved !== 'null') return JSON.parse(saved);
    } catch (e) { console.error(e); }
    return [];
  });

  const [simulados, setSimulados] = useState<Simulado[]>(() => {
    try {
      const saved = localStorage.getItem('pobruja-simulados');
      if (saved && saved !== 'undefined' && saved !== 'null') return JSON.parse(saved);
    } catch (e) { console.error(e); }
    return [];
  });

  const [tafExercises, setTafExercises] = useState<TafExercise[]>(() => {
    try {
      const saved = localStorage.getItem('pobruja-taf');
      if (saved && saved !== 'undefined' && saved !== 'null') return JSON.parse(saved);
    } catch (e) { console.error(e); }
    return [];
  });

  const [studySessions, setStudySessions] = useState<StudySession[]>(() => {
    try {
      const saved = localStorage.getItem('pobruja-sessions');
      if (saved && saved !== 'undefined' && saved !== 'null') {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) { console.error(e); }
    return [];
  });

  const [cycleConfig, setCycleConfig] = useState<CycleConfig>(() => {
    const defaultVal = { numDays: 10, schedule: {}, startDate: new Date().toISOString(), simInterval: 30 };
    try {
      const saved = localStorage.getItem('pobruja-cycle-config');
      if (saved && saved !== 'undefined' && saved !== 'null') {
        const parsed = JSON.parse(saved);
        return { ...defaultVal, ...parsed };
      }
    } catch (e) { console.error(e); }
    return defaultVal;
  });

  const [onboardData, setOnboardData] = useState({ name: '', username: '', targetJob: '', weeklyHours: 20 });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [globalActivity, setGlobalActivity] = useState<string | null>(null);

  const globalAccuracy = useMemo(() => {
    const done = subjects.reduce((acc, s) => acc + (s.topics?.reduce((a, t) => a + (t.questionsDone || 0), 0) || 0), 0);
    const hits = subjects.reduce((acc, s) => acc + (s.topics?.reduce((a, t) => a + (t.questionsCorrect || 0), 0) || 0), 0);
    return done > 0 ? (hits / done) * 100 : 0;
  }, [subjects]);

  const totalHoursAll = useMemo(() => {
    const subjectsTime = (subjects || []).reduce((acc, s) => acc + (s.topics || []).reduce((tAcc, t) => tAcc + (t.minutesSpent || 0), 0), 0);
    const essaysTime = (essays || []).reduce((acc, e) => acc + (e.timeMinutes || 0), 0);
    const simuladosTime = (simulados || []).reduce((acc, s) => acc + (s.timeMinutes || 0), 0);
    return (subjectsTime + essaysTime + simuladosTime) / 60;
  }, [subjects, essays, simulados]);

  const { peerId, peersData, connectToPeer, disconnectPeer } = useP2P(
    userProfile, 
    currentView, 
    selectedTask, 
    totalHoursAll, 
    globalAccuracy, 
    globalActivity,
    subjects,
    essays,
    simulados,
    tafExercises
  );

  const isRevisionDay = useMemo(() => {
    const day = cycleConfig.currentDay || 1;
    const schedule = cycleConfig.schedule[day.toString()] || [];
    return schedule.includes('🏆 REVISÃO');
  }, [cycleConfig]);

  useEffect(() => {

    const theme = localStorage.getItem('pobruja-theme-id');
    const isCustom = localStorage.getItem('pobruja-is-custom') === 'true';
    
    if (isCustom) {
      try {
        const customVars = JSON.parse(localStorage.getItem('pobruja-custom-theme') || '{}');
        const root = document.documentElement;
        if (customVars['--primary']) {
          Object.entries(customVars).forEach(([key, value]) => {
            root.style.setProperty(key, value as string);
          });
          root.style.setProperty('--primary-light', (customVars['--primary'] as string) + '88');
        }
      } catch (e) { console.error('Theme load error', e); }
    } else if (theme && theme !== 'default') {
      document.body.className = `theme-${theme}`;
    }

    const loadBadges = async () => {
      try {
        const b1 = await localforage.getItem<string>('pobruja-badge');
        const b2 = await localforage.getItem<string>('pobruja-badge2');
        if (b1) setBadgeUrl(b1);
        if (b2) setBadgeUrl2(b2);
      } catch (e) { console.error('Badge load error', e); }
    };
    loadBadges();
  }, []);

  useEffect(() => {
    if (currentView === 'task' && !selectedTask) {
      setCurrentView('dashboard');
    }
  }, [currentView, selectedTask]);

  useEffect(() => {
    try {
      localStorage.setItem('pobruja-profile', JSON.stringify(userProfile));
      localStorage.setItem('pobruja-subjects', JSON.stringify(subjects || []));
      localStorage.setItem('pobruja-essays', JSON.stringify(essays || []));
      localStorage.setItem('pobruja-simulados', JSON.stringify(simulados || []));
      localStorage.setItem('pobruja-taf', JSON.stringify(tafExercises || []));
      localStorage.setItem('pobruja-sessions', JSON.stringify(studySessions || []));
      localStorage.setItem('pobruja-cycle-config', JSON.stringify(cycleConfig));
      localStorage.setItem('pobruja-current-view', currentView);
      localStorage.setItem('pobruja-selected-task', JSON.stringify(selectedTask));
    } catch (e) { console.error('Storage error', e); }
  }, [userProfile, subjects, essays, simulados, tafExercises, studySessions, cycleConfig, currentView, selectedTask]);

  const addStudyTime = (minutes: number, subjectId: string, topicId: string) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    setSubjects(prev => (prev || []).map(s => s.id === subjectId ? { ...s, topics: (s.topics || []).map(t => t.id === topicId ? { ...t, minutesSpent: (t.minutesSpent || 0) + minutes } : t) } : s));
    setStudySessions(prev => {
      const existing = (prev || []).find(p => p.date === today);
      if (existing) return prev.map(p => p.date === today ? { ...p, count: p.count + minutes } : p);
      return [...(prev || []), { date: today, count: minutes }];
    });
  };

  const addGlobalStudyTime = (minutes: number) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    setStudySessions(prev => {
      const existing = (prev || []).find(p => p.date === today);
      if (existing) return prev.map(p => p.date === today ? { ...p, count: p.count + minutes } : p);
      return [...(prev || []), { date: today, count: minutes }];
    });
  };

  const updateTopicPerformance = (subjectId: string, topicId: string, qDone: number, qCorrect: number, sLocation?: string, sText?: string) => {
    setSubjects(prev => (prev || []).map(s => s.id === subjectId ? {
      ...s, topics: (s.topics || []).map(t => t.id === topicId ? { 
        ...t, 
        questionsDone: qDone, 
        questionsCorrect: qCorrect, 
        summaryLocation: sLocation || t.summaryLocation 
      } : t)
    } : s));

    if (sText) {
      try {
        const summaries = JSON.parse(localStorage.getItem('pobruja-summaries') || '{}');
        if (!summaries[subjectId]) summaries[subjectId] = {};
        summaries[subjectId][topicId] = sText;
        localStorage.setItem('pobruja-summaries', JSON.stringify(summaries));
      } catch (e) { console.error(e); }
    }
  };

  const handleFinishTask = (minutesSpent: number, qDone: number = 0, qCorrect: number = 0, sLocation?: string, sText?: string) => {
    if (!selectedTask) return;
    const task = selectedTask;

    if (minutesSpent > 0) addStudyTime(minutesSpent, task.subjectId, task.topic.id);
    updateTopicPerformance(task.subjectId, task.topic.id, qDone, qCorrect, sLocation, sText);
    
    setCurrentView('dashboard');
    setSelectedTask(null);
  };

  const handleSaveProgressOnly = (minutesSpent: number) => {
    if (!selectedTask) return;
    addStudyTime(minutesSpent, selectedTask.subjectId, selectedTask.topic.id);
    setCurrentView('dashboard');
    setSelectedTask(null);
  };

  const handleStartTask = (task: Task, initialPage?: number, materialUrl?: string) => {
    setSelectedTask(task);
    if (initialPage) {
      localStorage.setItem(`initialPage-${task.topic.id}`, initialPage.toString());
    }
    if (materialUrl) {
      localStorage.setItem(`initialMaterial-${task.topic.id}`, materialUrl);
    }
    setCurrentView('task');
  };



  const importBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          if (data.userProfile) setUserProfile(data.userProfile);
          if (data.subjects) setSubjects(data.subjects);
          if (data.essays) setEssays(data.essays);
          if (data.simulados) setSimulados(data.simulados);
          if (data.tafExercises) setTafExercises(data.tafExercises);
          if (data.studySessions) setStudySessions(data.studySessions);
          if (data.cycleConfig) setCycleConfig(data.cycleConfig);
          if (data.summaries) localStorage.setItem('pobruja-summaries', JSON.stringify(data.summaries));
          toast.success('Backup restaurado!');
          window.location.reload();
        } catch { toast.error('Falha no arquivo.'); }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="app-container">
      <Toaster position="top-right" />
      
      <button className="mobile-menu-toggle" onClick={() => setIsSidebarOpen(true)}>☰</button>
      <div className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`} onClick={() => setIsSidebarOpen(false)}></div>

      {(!userProfile.name || userProfile.weeklyHours <= 0) && (
        <div className="onboarding-overlay">
          <div className="onboarding-window">
            <h2 style={{fontSize: '32px', marginBottom: '10px', fontFamily: 'RomanUncialModern'}}>VERITAS</h2>
            <p style={{color: 'var(--text-dim)', marginBottom: '40px'}}>Cadastre seu perfil de estudo.</p>
            
            <input type="text" className="modern-input" placeholder="Seu Nome" onChange={e => setOnboardData({...onboardData, name: e.target.value})} style={{marginBottom: '15px'}} />
            <input type="text" className="modern-input" placeholder="Username (@apelido)" onChange={e => setOnboardData({...onboardData, username: e.target.value})} style={{marginBottom: '15px'}} />
            <input type="text" className="modern-input" placeholder="Cargo Alvo" onChange={e => setOnboardData({...onboardData, targetJob: e.target.value})} style={{marginBottom: '15px'}} />
            <input type="number" className="modern-input" placeholder="Horas por Semana" onChange={e => setOnboardData({...onboardData, weeklyHours: Number(e.target.value)})} style={{marginBottom: '30px'}} />

            <div style={{display: 'flex', gap: '10px'}}>
              <button className="btn-start" style={{flex: 1}} onClick={() => {
                if (onboardData.name && onboardData.username && onboardData.weeklyHours > 0) setUserProfile(onboardData);
                else toast.error('Preencha os campos obrigatórios (Nome, Username e Horas)');
              }}>COMEÇAR</button>
              <label className="btn-secondary" style={{cursor: 'pointer'}}>
                IMPORTAR
                <input type="file" hidden accept=".json" onChange={importBackup} />
              </label>
            </div>
          </div>
        </div>
      )}

      <nav className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="logo-area" style={{ flexDirection: 'row', justifyContent: 'center', gap: '10px' }}>
          {badgeUrl ? <img src={badgeUrl} alt="Badge" className="sidebar-badge" /> : <div style={{fontSize: '40px'}}>🛡️</div>}
          {badgeUrl2 && <img src={badgeUrl2} alt="Badge 2" className="sidebar-badge" />}
        </div>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <span className="brand-name">VERITAS</span>
        </div>
        
        {userProfile.name && (
          <div style={{marginBottom: '20px', background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '15px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)'}}>
            <h4 style={{color: '#fff', fontSize: '16px', margin: 0}}>{userProfile.name}</h4>
            <p style={{color: 'var(--primary-light)', fontSize: '12px', margin: '2px 0 0 0', fontWeight: 'bold'}}>@{userProfile.username || userProfile.name.toLowerCase().replace(/\s/g, '')}</p>
            <p style={{color: '#fff', fontSize: '11px', margin: '4px 0 0 0', opacity: 0.9}}>🎯 {userProfile.targetJob}</p>
          </div>
        )}

        <button onClick={() => { setCurrentView('stats'); setIsSidebarOpen(false); }} className={currentView === 'stats' ? 'active' : ''}>📊 Desempenho</button>
        <button onClick={() => { setCurrentView('dashboard'); setIsSidebarOpen(false); }} className={currentView === 'dashboard' ? 'active' : ''}>🛡️ Painel de Estudos</button>
        <button onClick={() => { setCurrentView('revisao'); setIsSidebarOpen(false); }} className={currentView === 'revisao' ? 'active' : ''} style={isRevisionDay ? { border: '2px solid var(--accent)', boxShadow: '0 0 10px var(--accent)' } : {}}>🏆 Ciclo de Revisão</button>
        <button onClick={() => { setCurrentView('calendar'); setIsSidebarOpen(false); }} className={currentView === 'calendar' ? 'active' : ''}>📅 Calendário / Ciclo</button>
        <button onClick={() => { setCurrentView('simulado'); setIsSidebarOpen(false); }} className={currentView === 'simulado' ? 'active' : ''}>📝 Simulados</button>
        <button onClick={() => { setCurrentView('redacao'); setIsSidebarOpen(false); }} className={currentView === 'redacao' ? 'active' : ''}>🖋️ Redação</button>
        <button onClick={() => { setCurrentView('taf'); setIsSidebarOpen(false); }} className={currentView === 'taf' ? 'active' : ''}>🏃 Treinamento TAF</button>
        <button onClick={() => { setCurrentView('materials'); setIsSidebarOpen(false); }} className={currentView === 'materials' ? 'active' : ''}>📖 Biblioteca</button>
        <button onClick={() => { setCurrentView('summary'); setIsSidebarOpen(false); }} className={currentView === 'summary' ? 'active' : ''}>📜 Anotações</button>
        <button onClick={() => { setCurrentView('p2p'); setIsSidebarOpen(false); }} className={currentView === 'p2p' ? 'active' : ''}>🌐 Sala P2P</button>
        <button onClick={() => { setCurrentView('profile'); setIsSidebarOpen(false); }} className={currentView === 'profile' ? 'active' : ''}>👤 Perfil & Temas</button>
        
        <div style={{marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.05)'}}>
          <button className="btn-secondary" style={{fontSize: '11px', textAlign: 'center', padding: '10px'}} onClick={() => {
            try {
              const data = { subjects, essays, simulados, tafExercises, studySessions, userProfile, cycleConfig, summaries: JSON.parse(localStorage.getItem('pobruja-summaries') || '{}') };
              saveAs(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), `veritas_backup.json`);
            } catch (e) { toast.error('Erro no backup'); }
          }}>💾 Backup</button>
          <button className="btn-secondary" style={{fontSize: '11px', color: 'var(--danger)', textAlign: 'center', padding: '10px'}} onClick={() => { if(window.confirm('Resetar?')) { localStorage.clear(); window.location.reload(); } }}>⚠️ Reset</button>
        </div>
      </nav>

      <main className="content">
        <Suspense fallback={<div style={{color: '#fff', textAlign: 'center', padding: '100px', fontSize: '24px', fontWeight: 'bold'}}>⚡ INICIANDO SISTEMA...</div>}>
          {currentView === 'stats' && <StatsDashboard userProfile={userProfile} subjects={subjects} studySessions={studySessions} setStudySessions={setStudySessions} peersData={peersData} />}
          {currentView === 'calendar' && <CalendarView subjects={subjects} cycleConfig={cycleConfig} setCycleConfig={setCycleConfig} />}
          {currentView === 'dashboard' && <Dashboard subjects={subjects} onStartTask={handleStartTask} setSubjects={setSubjects} cycleConfig={cycleConfig} setCycleConfig={setCycleConfig} userProfile={userProfile} setUserProfile={setUserProfile} onViewChange={setCurrentView} peersData={peersData} />}
          {currentView === 'task' && selectedTask && (
            <TaskExecution 
              task={selectedTask} 
              onComplete={handleFinishTask} 
              onSaveProgress={handleSaveProgressOnly} 
              userProfile={userProfile}
              onRenameSubject={(newName) => {
                setSubjects(prev => prev.map(s => s.id === selectedTask.subjectId ? { ...s, name: newName } : s));
                setSelectedTask(prev => prev ? { ...prev, subjectName: newName } : null);
              }}
              setGlobalActivity={setGlobalActivity}
            />
          )}
          {currentView === 'materials' && <MaterialsView subjects={subjects} setSubjects={setSubjects} handleRemoveSubject={(id) => setSubjects(s => s.filter(x => x.id !== id))} handleRemoveTopic={(sid, tid) => setSubjects(s => s.map(x => x.id === sid ? {...x, topics: x.topics.filter(t => t.id !== tid)} : x))} />}
          {currentView === 'summary' && <SummaryViewer />}
          {currentView === 'revisao' && <RevisaoView subjects={subjects} onAddStudyTime={addGlobalStudyTime} userProfile={userProfile} setGlobalActivity={setGlobalActivity} />}
          {currentView === 'profile' && <ProfileView userProfile={userProfile} setUserProfile={setUserProfile} subjects={subjects} totalHours={totalHoursAll} onThemeChange={() => setCurrentView('stats')} />}
          {currentView === 'simulado' && <SimuladoView simulados={simulados} setSimulados={setSimulados} onAddStudyTime={addGlobalStudyTime} peersData={peersData} />}
          {currentView === 'redacao' && <RedacaoView essays={essays} setEssays={setEssays} onAddStudyTime={addGlobalStudyTime} peersData={peersData} />}
          {currentView === 'taf' && <TafView tafExercises={tafExercises} setTafExercises={setTafExercises} peersData={peersData} />}
          {currentView === 'p2p' && <P2PGroupView peerId={peerId} peersData={peersData} connectToPeer={connectToPeer} disconnectPeer={disconnectPeer} />}
          {!['stats', 'calendar', 'dashboard', 'task', 'materials', 'summary', 'profile', 'simulado', 'redacao', 'taf', 'revisao', 'p2p'].includes(currentView) && (
            <div style={{color: '#fff'}}>Erro de Navegação. <button onClick={() => setCurrentView('stats')}>Voltar ao Início</button></div>
          )}
        </Suspense>
      </main>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

export default App;

