import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import type { Task } from '../App';
import PdfViewer from './PdfViewer';

interface TaskExecutionProps {
  task: Task;
  onComplete: (minutesSpent: number, qDone?: number, qCorrect?: number, sLocation?: string, sText?: string) => void;
  onSaveProgress: (minutesSpent: number) => void;
  onRenameSubject?: (newName: string) => void;
}

const ALARM_SOUND = '/alarme.mp3';

export default function TaskExecution({ task, onComplete, onSaveProgress, onRenameSubject }: TaskExecutionProps) {
  const isBase = task.type.includes('1 e 2');
  const [isEditingSubject, setIsEditingSubject] = useState(false);
  const [tempSubjectName, setTempSubjectName] = useState(task.subjectName);
  const [step, setStep] = useState(() => {
    const saved = localStorage.getItem(`step-${task.topic.id}`);
    return saved ? Number(saved) : 1;
  });
  
  const [summaryLoc, setSummaryLoc] = useState(() => task.topic?.summaryLocation || '');
  const [summaryText, setSummaryText] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('pobruja-summaries') || '{}');
      return saved[task.subjectId]?.[task.topic.id] || '';
    } catch { return ''; }
  });
  const [qDone, setQDone] = useState(() => task.topic?.questionsDone || 0);
  const [qCorrect, setQCorrect] = useState(() => task.topic?.questionsCorrect || 0);
  
  const [timeSpent, setTimeSpent] = useState(() => {
    const saved = localStorage.getItem(`timer-${task.topic.id}`);
    return saved ? Number(saved) : 0;
  }); 
  const [manualTime, setManualTime] = useState('');
  const [isResting, setIsResting] = useState(() => {
    return localStorage.getItem(`isResting-${task.topic.id}`) === 'true';
  });
  const [restTimeLeft, setRestTimeLeft] = useState(() => {
    const saved = localStorage.getItem(`restTimeLeft-${task.topic.id}`);
    return saved ? Number(saved) : 600;
  }); 
  const [restInput, setRestInput] = useState(() => {
    const saved = localStorage.getItem(`restInput-${task.topic.id}`);
    return saved ? Number(saved) : 10;
  }); 

  const [isVideoMode, setIsVideoMode] = useState(() => {
    return localStorage.getItem(`isVideoMode-${task.topic.id}`) === 'true';
  });

  const lastTickRef = useRef<number>(0);

  const [selectedMaterialUrl, setSelectedMaterialUrl] = useState(() => {
    const forced = localStorage.getItem(`initialMaterial-${task.topic.id}`);
    if (forced) {
      localStorage.removeItem(`initialMaterial-${task.topic.id}`);
      return forced;
    }
    return (task.topic?.materials && task.topic.materials.length > 0) ? task.topic.materials[0].url : '';
  });

  const [initialPage] = useState<number | undefined>(() => {
    const forced = localStorage.getItem(`initialPage-${task.topic.id}`);
    if (forced) {
      localStorage.removeItem(`initialPage-${task.topic.id}`);
      return Number(forced);
    }
    return undefined;
  });

  const [dominioTab, setDominioTab] = useState<'performance' | 'summary'>(() => {
    return (localStorage.getItem(`dominioTab-${task.topic.id}`) as any) || 'performance';
  });

  useEffect(() => {
    localStorage.setItem(`step-${task.topic.id}`, step.toString());
    localStorage.setItem(`isResting-${task.topic.id}`, isResting.toString());
    localStorage.setItem(`restTimeLeft-${task.topic.id}`, restTimeLeft.toString());
    localStorage.setItem(`restInput-${task.topic.id}`, restInput.toString());
    localStorage.setItem(`isVideoMode-${task.topic.id}`, isVideoMode.toString());
    localStorage.setItem(`dominioTab-${task.topic.id}`, dominioTab);
  }, [step, isResting, restTimeLeft, restInput, isVideoMode, dominioTab, task.topic.id]);

  const playAlarm = () => {
    const audio = new Audio(ALARM_SOUND);
    audio.play().catch(() => console.log('Erro ao tocar alarme'));
  };

  useEffect(() => {
    lastTickRef.current = Date.now();
    const timer = window.setInterval(() => {
      const now = Date.now();
      const deltaMs = now - lastTickRef.current;
      const deltaSec = Math.floor(deltaMs / 1000);

      if (deltaSec >= 1) {
        lastTickRef.current = now; 

        if (isResting) {
          setRestTimeLeft(t => {
            const next = t - deltaSec;
            if (next <= 0) {
              setIsResting(false);
              playAlarm();
              toast.success('Descanso concluído! De volta aos estudos.');
              return 0;
            }
            return next;
          });
        } else {
          setTimeSpent(t => {
            const next = t + deltaSec;
            localStorage.setItem(`timer-${task.topic.id}`, next.toString());
            return next;
          });
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isResting, task.topic.id]);

  const clearPersistentState = () => {
    ['timer', 'step', 'isResting', 'restTimeLeft', 'restInput', 'isVideoMode', 'dominioTab'].forEach(k => {
      localStorage.removeItem(`${k}-${task.topic.id}`);
    });
  };

  const handleFinish = () => {
    const minutes = manualTime ? Number(manualTime) : Math.floor(timeSpent / 60) || 1; 
    clearPersistentState();
    toast.success(`Sessão Concluída! ${minutes} min.`);
    onComplete(minutes, qDone, qCorrect, summaryLoc, summaryText);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${('0' + s).slice(-2)}`;
  };

  if (isResting) {
    return (
      <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#08080c' }}>
        <h1 style={{fontSize: '48px', color: 'var(--success)', marginBottom: '20px'}}>☕ Descanso</h1>
        <div style={{fontSize: '120px', fontWeight: '900', color: '#fff'}}>{formatTime(restTimeLeft)}</div>
        <button className="btn-start" style={{marginTop: '40px', padding: '20px 50px'}} onClick={() => setIsResting(false)}>Retornar aos Estudos</button>
      </div>
    );
  }

  // Layout para Leitura (Passo 1 e 2)
  if ((step === 1 || step === 2) && !isVideoMode) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0f0f0f', position: 'relative' }}>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <PdfViewer 
            url={selectedMaterialUrl} 
            materialId={task.topic.materials.find(m => m.url === selectedMaterialUrl)?.id} 
            initialPage={initialPage}
          />
        </div>

        <div style={{ padding: '12px 25px', background: '#1a1a1a', borderTop: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {isEditingSubject ? (
                <input 
                  autoFocus
                  className="modern-input"
                  style={{ padding: '2px 8px', fontSize: '10px', height: '20px', width: '120px' }}
                  value={tempSubjectName}
                  onChange={e => setTempSubjectName(e.target.value)}
                  onBlur={() => {
                    setIsEditingSubject(false);
                    if (tempSubjectName && tempSubjectName !== task.subjectName) onRenameSubject?.(tempSubjectName);
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      setIsEditingSubject(false);
                      if (tempSubjectName && tempSubjectName !== task.subjectName) onRenameSubject?.(tempSubjectName);
                    }
                  }}
                />
              ) : (
                <div 
                  style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', cursor: 'pointer' }}
                  onClick={() => setIsEditingSubject(true)}
                  title="Clique para renomear disciplina"
                >
                  {task.subjectName} ✏️
                </div>
              )}
              <div style={{ fontSize: '14px', color: '#fff', fontWeight: 'bold' }}>{formatTime(timeSpent)}</div>
            </div>
            <div style={{ width: '1px', height: '30px', background: '#333' }} />
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: 'var(--primary-light)', fontWeight: 'bold' }}>PASSO {step}: {step === 1 ? 'TEORIA' : 'FIXAÇÃO'}</span>
              <button 
                className="btn-start" 
                style={{ padding: '8px 20px', fontSize: '12px' }} 
                onClick={() => setStep(step + 1)}
              >
                {step === 1 ? 'PROX: FIXAÇÃO →' : 'IR PARA DOMÍNIO →'}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            {task.topic.materials.length > 1 && (
              <select 
                className="modern-input" 
                style={{ padding: '2px 8px', fontSize: '11px', height: '28px', background: '#000', border: '1px solid #444', color: '#fff', width: '150px' }}
                value={selectedMaterialUrl}
                onChange={(e) => setSelectedMaterialUrl(e.target.value)}
              >
                {task.topic.materials.map(m => <option key={m.id} value={m.url}>{m.name}</option>)}
              </select>
            )}
            <button className="btn-secondary" style={{ padding: '8px 15px', fontSize: '11px' }} onClick={() => setIsVideoMode(true)}>VIDEOAULA 🎬</button>
            <button className="btn-secondary" style={{ padding: '8px 15px', fontSize: '11px' }} onClick={() => { setRestTimeLeft(restInput * 60); setIsResting(true); }}>PAUSAR ☕</button>
            <button className="btn-secondary" style={{ padding: '8px 15px', fontSize: '11px', color: 'var(--primary-light)' }} onClick={() => onSaveProgress(Math.floor(timeSpent/60))}>SALVAR & SAIR</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="task-execution" style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: isVideoMode ? '0' : '20px' }}>
      {isVideoMode ? (
        <div style={{flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#000'}}>
          <div style={{fontSize: '80px', marginBottom: '20px'}}>🎬</div>
          <h3 style={{color: '#fff', fontSize: '28px'}}>Modo Videoaula</h3>
          <p style={{color: '#666', marginTop: '10px'}}>{formatTime(timeSpent)} estudados nesta sessão</p>
          
          <div style={{marginTop: '30px', display: 'flex', alignItems: 'center', gap: '15px', background: 'rgba(255,255,255,0.05)', padding: '15px 30px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)'}}>
             <span style={{fontSize: '12px', color: '#888', fontWeight: 'bold'}}>PAUSA (MIN):</span>
             <input 
               type="number" 
               value={restInput} 
               onChange={e => setRestInput(Number(e.target.value))} 
               style={{width: '50px', background: 'transparent', border: 'none', color: '#fff', fontSize: '18px', fontWeight: 'bold', textAlign: 'center', outline: 'none'}} 
             />
             <button 
               className="btn-secondary" 
               style={{padding: '10px 25px', fontSize: '12px'}} 
               onClick={() => { setRestTimeLeft(restInput * 60); setIsResting(true); }}
             >
               PAUSAR AGORA ☕
             </button>
          </div>

          <div style={{ display: 'flex', gap: '15px', marginTop: '40px' }}>
            <button className="btn-secondary" style={{padding: '15px 30px'}} onClick={() => setIsVideoMode(false)}>VOLTAR AO PDF 📖</button>
            <button className="btn-start" style={{padding: '15px 30px'}} onClick={() => { setIsVideoMode(false); setStep(3); }}>FINALIZAR AULA & LANÇAR DADOS</button>
          </div>
        </div>
      ) : (
        <div style={{ maxWidth: '900px', margin: '0 auto', width: '100%' }}>
          <div className="card" style={{ marginBottom: '30px' }}>
            {isEditingSubject ? (
              <input 
                autoFocus
                className="modern-input"
                style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '10px' }}
                value={tempSubjectName}
                onChange={e => setTempSubjectName(e.target.value)}
                onBlur={() => {
                  setIsEditingSubject(false);
                  if (tempSubjectName && tempSubjectName !== task.subjectName) onRenameSubject?.(tempSubjectName);
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    setIsEditingSubject(false);
                    if (tempSubjectName && tempSubjectName !== task.subjectName) onRenameSubject?.(tempSubjectName);
                  }
                }}
              />
            ) : (
              <h2 
                style={{ color: 'var(--primary-light)', cursor: 'pointer' }}
                onClick={() => setIsEditingSubject(true)}
                title="Clique para renomear disciplina"
              >
                {task.subjectName} ✏️
              </h2>
            )}
            <p style={{ color: '#fff', fontSize: '18px', fontWeight: 'bold' }}>{task.topic?.name}</p>
            <div style={{ marginTop: '20px', fontSize: '32px', fontWeight: '900', color: 'var(--success)' }}>{formatTime(timeSpent)}</div>
          </div>

          <div className="card">
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <button className="btn-secondary" onClick={() => setStep(1)} style={{ flex: 1, fontSize: '11px', borderColor: 'rgba(255,255,255,0.1)' }}>⏪ VOLTAR PARA TEORIA (PASSO 1)</button>
              <button className="btn-secondary" onClick={() => setStep(2)} style={{ flex: 1, fontSize: '11px', borderColor: 'rgba(255,255,255,0.1)' }}>⏪ VOLTAR PARA FIXAÇÃO (PASSO 2)</button>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
              <button className={`btn-secondary ${dominioTab === 'performance' ? 'active' : ''}`} onClick={() => setDominioTab('performance')} style={{ flex: 1, background: dominioTab === 'performance' ? 'var(--primary)' : '' }}>QUESTÕES</button>
              <button className={`btn-secondary ${dominioTab === 'summary' ? 'active' : ''}`} onClick={() => setDominioTab('summary')} style={{ flex: 1, background: dominioTab === 'summary' ? 'var(--primary)' : '' }}>ANOTAÇÕES</button>
            </div>

            {dominioTab === 'performance' ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '10px', fontSize: '12px' }}>RESOLVIDAS</label>
                  <input type="number" className="modern-input" value={qDone} onChange={e => setQDone(Number(e.target.value))} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '10px', fontSize: '12px' }}>ACERTOS</label>
                  <input type="number" className="modern-input" value={qCorrect} onChange={e => setQCorrect(Number(e.target.value))} />
                </div>
              </div>
            ) : (
              <textarea 
                className="modern-input" 
                style={{ minHeight: '300px' }} 
                placeholder="Suas anotações importantes..."
                value={summaryText}
                onChange={e => setSummaryText(e.target.value)}
              />
            )}

            <div style={{ marginTop: '30px' }}>
              <label style={{ display: 'block', marginBottom: '10px', fontSize: '12px' }}>AJUSTE MANUAL (MINUTOS)</label>
              <input type="number" className="modern-input" value={manualTime} onChange={e => setManualTime(e.target.value)} placeholder="Opcional" />
            </div>

            <button className="btn-start" style={{ width: '100%', marginTop: '40px', padding: '20px' }} onClick={handleFinish}>
              FINALIZAR SESSÃO E SALVAR
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
