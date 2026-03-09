import { useState, useEffect, useRef, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { Subject, UserProfile } from '../App';

interface RevisaoViewProps {
  subjects: Subject[];
  onAddStudyTime: (min: number) => void;
  userProfile: UserProfile;
  setGlobalActivity?: (activity: string | null) => void;
}

const ALARM_SOUND = '/alarme.mp3';

export default function RevisaoView({ subjects, onAddStudyTime, userProfile, setGlobalActivity }: RevisaoViewProps) {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [accumulatedTime, setAccumulatedTime] = useState(0); // seconds
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [displayTime, setDisplayTime] = useState(0);
  
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'timer' | 'stats'>('timer');
  
  const [isResting, setIsResting] = useState(false);
  const [restStartTime, setRestStartTime] = useState<number | null>(null);
  const [restAccumulated, setRestAccumulated] = useState(0);
  const [displayRestTime, setDisplayRestTime] = useState(0);
  
  const alarmAudio = useRef(new Audio(ALARM_SOUND));

  useEffect(() => {
    if (setGlobalActivity) {
      if (isSessionActive) {
        if (isResting) {
          setGlobalActivity('Pausa da Revisão ☕');
        } else {
          setGlobalActivity('Ciclo de Revisão Ativo');
        }
      } else {
        setGlobalActivity(null);
      }
    }
  }, [isSessionActive, isResting, setGlobalActivity]);

  useEffect(() => {
    return () => {
      if (setGlobalActivity) setGlobalActivity(null);
    };
  }, [setGlobalActivity]);

  // Lógica de tempo "Inicio x Atual" para precisão total
  useEffect(() => {
    if (isSessionActive && !isResting) {
      const interval = window.setInterval(() => {
        if (sessionStartTime) {
          const now = Date.now();
          const elapsedSinceStart = Math.floor((now - sessionStartTime) / 1000);
          setDisplayTime(accumulatedTime + elapsedSinceStart);
        }
      }, 100);
      return () => clearInterval(interval);
    } else if (isResting) {
      const interval = window.setInterval(() => {
        if (restStartTime) {
          const now = Date.now();
          const elapsedRest = Math.floor((now - restStartTime) / 1000);
          const timeLeft = (userProfile.restMinutesGoal || 30) * 60 - (restAccumulated + elapsedRest);
          
          if (timeLeft <= 0) {
            handleStopRest();
            alarmAudio.current.play().catch(() => {});
            toast.success('Descanso concluído! De volta à revisão.', { duration: 10000 });
            setDisplayRestTime(0);
          } else {
            setDisplayRestTime(timeLeft);
          }
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [isSessionActive, isResting, sessionStartTime, restStartTime, accumulatedTime, restAccumulated, userProfile.restMinutesGoal]);

  const handleStartSession = () => {
    setSessionStartTime(Date.now());
    setIsSessionActive(true);
    setIsResting(false);
  };

  const handleStartRest = () => {
    // Salva o que foi acumulado até agora no estudo
    if (sessionStartTime) {
      setAccumulatedTime(prev => prev + Math.floor((Date.now() - sessionStartTime) / 1000));
    }
    setSessionStartTime(null);
    setRestStartTime(Date.now());
    setIsResting(true);
  };

  const handleStopRest = () => {
    if (restStartTime) {
      setRestAccumulated(prev => prev + Math.floor((Date.now() - restStartTime) / 1000));
    }
    setRestStartTime(null);
    setSessionStartTime(Date.now());
    setIsResting(false);
  };

  const handleFinishSession = () => {
    let finalSeconds = displayTime;
    if (sessionStartTime) {
      finalSeconds = accumulatedTime + Math.floor((Date.now() - sessionStartTime) / 1000);
    }
    
    const sessionMinutes = Math.floor(finalSeconds / 60) || 1;
    onAddStudyTime(sessionMinutes);
    
    setIsSessionActive(false);
    setAccumulatedTime(0);
    setSessionStartTime(null);
    setDisplayTime(0);
    toast.success(`Sessão de revisão salva: ${sessionMinutes} min!`);
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ':' : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Cálculo de dados para o gráfico
  const statsData = useMemo(() => {
    let hits = 0;
    let total = 0;

    if (selectedSubjectId) {
      const subject = subjects.find(s => s.id === selectedSubjectId);
      if (subject) {
        hits = subject.topics.reduce((acc, t) => acc + (t.questionsCorrect || 0), 0);
        total = subject.topics.reduce((acc, t) => acc + (t.questionsDone || 0), 0);
      }
    } else {
      subjects.forEach(s => {
        hits += s.topics.reduce((acc, t) => acc + (t.questionsCorrect || 0), 0);
        total += s.topics.reduce((acc, t) => acc + (t.questionsDone || 0), 0);
      });
    }

    const errors = Math.max(0, total - hits);
    const accuracy = total > 0 ? Math.round((hits / total) * 100) : 0;

    return [
      { name: 'Acertos', value: hits, color: '#00f2ff' },
      { name: 'Erros', value: errors, color: '#f44336' },
      { accuracy, total }
    ];
  }, [selectedSubjectId, subjects]);

  return (
    <div className="revisao-view">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '36px', fontWeight: '900' }}>🏆 Ciclo de Revisão</h1>
        <div style={{ display: 'flex', gap: '10px', background: 'rgba(255,255,255,0.05)', padding: '5px', borderRadius: '12px' }}>
          <button 
            className={`btn-secondary ${activeTab === 'timer' ? 'active' : ''}`}
            style={{ padding: '8px 20px', fontSize: '12px', background: activeTab === 'timer' ? 'var(--primary)' : 'transparent', border: 'none' }}
            onClick={() => setActiveTab('timer')}
          >CRONÔMETRO</button>
          <button 
            className={`btn-secondary ${activeTab === 'stats' ? 'active' : ''}`}
            style={{ padding: '8px 20px', fontSize: '12px', background: activeTab === 'stats' ? 'var(--primary)' : 'transparent', border: 'none' }}
            onClick={() => setActiveTab('stats')}
          >DESEMPENHO</button>
        </div>
      </div>

      <div className="card" style={{ maxWidth: '800px', margin: '0 auto', padding: '40px' }}>
        {activeTab === 'timer' ? (
          <div style={{ textAlign: 'center' }}>
            {isResting ? (
              <>
                <h2 style={{ fontSize: '32px', color: 'var(--success)', marginBottom: '20px' }}>☕ Descanso</h2>
                <div style={{ fontSize: '80px', fontWeight: '900', color: '#fff', fontFamily: 'monospace' }}>
                  {formatTime(displayRestTime)}
                </div>
                <button className="btn-start" style={{ marginTop: '40px' }} onClick={handleStopRest}>
                  VOLTAR AGORA
                </button>
              </>
            ) : isSessionActive ? (
              <>
                <h2 style={{ color: 'var(--primary-light)', marginBottom: '10px' }}>Revisão em Andamento</h2>
                <div style={{ fontSize: '96px', fontWeight: '900', color: '#fff', marginBottom: '30px', fontFamily: 'monospace' }}>
                  {formatTime(displayTime)}
                </div>
                
                <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                  <button className="btn-secondary" onClick={handleStartRest}>PAUSAR (CAFÉ) ☕</button>
                  <button className="btn-start" style={{ background: 'var(--success)' }} onClick={handleFinishSession}>CONCLUIR SESSÃO ✅</button>
                </div>
                
                <button className="btn-secondary" style={{ marginTop: '20px', color: 'var(--danger)', borderColor: 'rgba(244,67,54,0.2)' }} onClick={() => { if(confirm('Descartar tempo?')) { setIsSessionActive(false); setAccumulatedTime(0); setSessionStartTime(null); setDisplayTime(0); } }}>
                  DESCARTAR
                </button>
              </>
            ) : (
              <>
                <div style={{ fontSize: '64px', marginBottom: '20px' }}>📚</div>
                <h2 style={{ color: '#fff', marginBottom: '20px' }}>Pronto para revisar?</h2>
                <p style={{ color: 'var(--text-dim)', marginBottom: '40px' }}>
                  A precisão do cronômetro é mantida comparando o tempo de início com o atual.
                </p>
                
                <div style={{ marginBottom: '30px', maxWidth: '400px', margin: '0 auto 30px auto' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-dim)', marginBottom: '10px', textAlign: 'left' }}>
                    DISCIPLINA FOCO (OPCIONAL)
                  </label>
                  <select 
                    className="modern-input" 
                    value={selectedSubjectId} 
                    onChange={e => setSelectedSubjectId(e.target.value)}
                  >
                    <option value="">Geral / Todas</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                <button className="btn-start" style={{ padding: '20px 60px', fontSize: '18px' }} onClick={handleStartSession}>
                  INICIAR CRONÔMETRO ⏱️
                </button>
              </>
            )}
          </div>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ color: '#fff', marginBottom: '10px' }}>Análise de Precisão</h2>
            <div style={{ marginBottom: '30px' }}>
              <select 
                className="modern-input" 
                style={{ maxWidth: '300px', margin: '0 auto' }}
                value={selectedSubjectId} 
                onChange={e => setSelectedSubjectId(e.target.value)}
              >
                <option value="">Geral (Média de Tudo)</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div style={{ height: '300px', position: 'relative' }}>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                <div style={{ fontSize: '42px', fontWeight: '900', color: '#fff' }}>{statsData[2].accuracy}%</div>
                <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>ACERTOS</div>
              </div>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[statsData[0], statsData[1]]}
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {statsData.slice(0, 2).map((entry: any, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ background: 'var(--bg-surface)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
              <div className="card" style={{ background: 'rgba(0, 242, 255, 0.05)', border: '1px solid rgba(0, 242, 255, 0.1)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>ACERTOS</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--success)' }}>{statsData[0].value}</div>
              </div>
              <div className="card" style={{ background: 'rgba(244, 67, 54, 0.05)', border: '1px solid rgba(244, 67, 54, 0.1)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>ERROS</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--danger)' }}>{statsData[1].value as number}</div>
              </div>
            </div>
            
            <p style={{ marginTop: '30px', color: 'var(--text-dim)', fontSize: '13px' }}>
              Baseado em <strong>{statsData[2].total}</strong> questões resolvidas nesta disciplina.
            </p>
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: '40px' }}>
        <h3 style={{ marginBottom: '15px' }}>💡 Dica de Revisão</h3>
        <p style={{ fontSize: '14px', color: 'var(--text-dim)', lineHeight: '1.6' }}>
          A revisão é fundamental para a memorização de longo prazo. O gráfico acima ajuda a identificar quais matérias precisam de mais atenção devido ao alto índice de erros.
        </p>
      </div>
    </div>
  );
}
