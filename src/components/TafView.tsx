import { useState, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from 'date-fns';

export interface TafExercise {
  id: string;
  name: string;
  type: 'reps' | 'time' | 'distance';
  unit: string;
  goal?: number;
  history: { id: string; date: string; value: number }[];
}

interface TafViewProps {
  tafExercises: TafExercise[];
  setTafExercises: React.Dispatch<React.SetStateAction<TafExercise[]>>;
  peersData?: Record<string, any>;
}

const COMMON_EXERCISES = [
  { name: 'Corrida (12 min)', type: 'distance', unit: 'm' },
  { name: 'Barra Fixa', type: 'reps', unit: 'reps' },
  { name: 'Flexão de Braços', type: 'reps', unit: 'reps' },
  { name: 'Abdominal', type: 'reps', unit: 'reps' },
  { name: 'Shuttle Run', type: 'time', unit: 's' },
  { name: 'Salto Horizontal', type: 'distance', unit: 'cm' },
  { name: 'Natação', type: 'time', unit: 's' },
];

export default function TafView({ tafExercises, setTafExercises, peersData = {} }: TafViewProps) {
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [newValue, setValue] = useState('');
  const [newGoal, setGoal] = useState('');
  const [isAddingExercise, setIsAddingExercise] = useState(false);

  const activeExercise = useMemo(() => 
    tafExercises.find(e => e.id === selectedExerciseId), 
    [tafExercises, selectedExerciseId]
  );

  const handleAddExercise = (base: typeof COMMON_EXERCISES[0]) => {
    const newEx: TafExercise = {
      id: Date.now().toString(),
      name: base.name,
      type: base.type as any,
      unit: base.unit,
      history: []
    };
    setTafExercises(prev => [...prev, newEx]);
    setIsAddingExercise(false);
    toast.success(`${base.name} adicionado ao seu TAF!`);
  };

  const handleAddRecord = () => {
    if (!activeExercise || !newValue) return;
    
    const record = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      value: Number(newValue)
    };

    setTafExercises(prev => prev.map(e => 
      e.id === activeExercise.id 
        ? { ...e, history: [record, ...e.history].sort((a,b) => b.date.localeCompare(a.date)) } 
        : e
    ));
    
    setValue('');
    toast.success('Progresso registrado! 💪');
  };

  const handleUpdateGoal = () => {
    if (!activeExercise || !newGoal) return;
    setTafExercises(prev => prev.map(e => 
      e.id === activeExercise.id ? { ...e, goal: Number(newGoal) } : e
    ));
    setGoal('');
    toast.success('Meta atualizada!');
  };

  const chartData = useMemo(() => {
    if (!activeExercise) return [];
    
    const allDates = new Set<string>();
    activeExercise.history.forEach(h => allDates.add(h.date.slice(0, 10)));
    
    Object.values(peersData).forEach(p => {
      const peerEx = (p.tafHistory || []).find((ex: any) => ex.name === activeExercise.name);
      if (peerEx) {
        peerEx.history.forEach((h: any) => allDates.add(h.date.slice(0, 10)));
      }
    });

    const sortedDates = Array.from(allDates).sort();

    return sortedDates.map(fullDate => {
      const displayDate = format(new Date(fullDate + 'T12:00:00'), 'dd/MM');
      const res: any = { date: displayDate, meta: activeExercise.goal };
      
      const myHistOnDate = activeExercise.history.filter(h => h.date.startsWith(fullDate));
      if (myHistOnDate.length > 0) {
        res['Você'] = myHistOnDate[0].value;
      }

      Object.values(peersData).forEach(p => {
        const peerEx = (p.tafHistory || []).find((ex: any) => ex.name === activeExercise.name);
        if (peerEx) {
          const peerHistOnDate = peerEx.history.filter((h: any) => h.date.startsWith(fullDate));
          if (peerHistOnDate.length > 0) {
            res[p.name || p.username] = peerHistOnDate[0].value;
          }
        }
      });

      return res;
    });
  }, [activeExercise, peersData]);

  return (
    <div className="taf-view">
      <h1 style={{ fontSize: '36px', fontWeight: '900', marginBottom: '40px' }}>🏃 Treinamento TAF</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '30px' }}>
        {/* Sidebar de Exercícios */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <h3 style={{ fontSize: '18px', color: 'var(--primary-light)' }}>Meus Exercícios</h3>
          
          {tafExercises.map(ex => (
            <button 
              key={ex.id}
              className={`btn-secondary ${selectedExerciseId === ex.id ? 'active' : ''}`}
              onClick={() => setSelectedExerciseId(ex.id)}
              style={{ 
                textAlign: 'left', 
                padding: '15px', 
                background: selectedExerciseId === ex.id ? 'var(--primary)' : 'rgba(255,255,255,0.03)',
                color: selectedExerciseId === ex.id ? '#fff' : 'var(--text-main)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <span>{ex.name}</span>
              <span style={{ fontSize: '10px', opacity: 0.7 }}>{ex.history.length > 0 ? ex.history[0].value + ex.unit : '--'}</span>
            </button>
          ))}

          <button 
            className="btn-start" 
            style={{ marginTop: '10px', padding: '12px' }}
            onClick={() => setIsAddingExercise(true)}
          >
            + ADICIONAR EXERCÍCIO
          </button>
        </div>

        {/* Painel de Detalhes / Gráficos */}
        <div className="card" style={{ minHeight: '500px' }}>
          {activeExercise ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' }}>
                <div>
                  <h2 style={{ fontSize: '28px', color: '#fff' }}>{activeExercise.name}</h2>
                  <p style={{ color: 'var(--text-dim)' }}>Unidade: {activeExercise.unit} | Meta Atual: {activeExercise.goal || 'Não definida'}</p>
                </div>
                <button 
                  className="btn-secondary" 
                  style={{ color: 'var(--danger)', fontSize: '12px' }}
                  onClick={() => {
                    if(confirm('Remover exercício?')) {
                      setTafExercises(prev => prev.filter(e => e.id !== activeExercise.id));
                      setSelectedExerciseId(null);
                    }
                  }}
                >Excluir 🗑️</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '40px' }}>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-dim)', marginBottom: '10px' }}>NOVO RESULTADO ({activeExercise.unit})</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input 
                      type="number" 
                      className="modern-input" 
                      value={newValue} 
                      onChange={e => setValue(e.target.value)}
                      placeholder="0"
                    />
                    <button className="btn-start" onClick={handleAddRecord}>SALVAR</button>
                  </div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-dim)', marginBottom: '10px' }}>DEFINIR META DO EDITAL</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input 
                      type="number" 
                      className="modern-input" 
                      value={newGoal} 
                      onChange={e => setGoal(e.target.value)}
                      placeholder="0"
                    />
                    <button className="btn-secondary" onClick={handleUpdateGoal}>DEFINIR</button>
                  </div>
                </div>
              </div>

              <div style={{ height: '300px', width: '100%', marginBottom: '30px' }}>
                {activeExercise.history.length > 0 || Object.values(peersData).some((p: any) => (p.tafHistory || []).some((ex: any) => ex.name === activeExercise.name && ex.history.length > 0)) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="date" tick={{ fill: 'var(--text-dim)', fontSize: 12 }} />
                      <YAxis tick={{ fill: 'var(--text-dim)', fontSize: 12 }} />
                      <RechartsTooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--primary)', borderRadius: '12px' }} />
                      <Legend />
                      <Line name="Você" type="monotone" dataKey="Você" stroke="var(--success)" strokeWidth={3} dot={{ fill: 'var(--success)', r: 6 }} connectNulls />
                      {Object.values(peersData).map((p: any, i) => (
                        <Line 
                          key={p.id} 
                          name={p.name || p.username} 
                          type="monotone" 
                          dataKey={p.name || p.username} 
                          stroke={[`#ff00ff`, `#00f2ff`, `#ffd700`, `#ff4d4d`][i % 4]} 
                          strokeWidth={2} 
                          dot={{ r: 4 }} 
                          connectNulls
                        />
                      ))}
                      {activeExercise.goal && <Line name="Meta Edital" type="step" dataKey="meta" stroke="var(--danger)" strokeDasharray="5 5" dot={false} />}
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '16px' }}>
                    Registre pelo menos um treino para ver o gráfico.
                  </div>
                )}
              </div>

              <h3 style={{ marginBottom: '15px' }}>Histórico Recente</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                {activeExercise.history.map(h => (
                  <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', fontSize: '14px' }}>
                    <span style={{ color: 'var(--text-dim)' }}>{format(new Date(h.date), 'dd/MM/yyyy HH:mm')}</span>
                    <span style={{ fontWeight: 'bold', color: activeExercise.goal && h.value >= activeExercise.goal ? 'var(--success)' : '#fff' }}>
                      {h.value} {activeExercise.unit}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', textAlign: 'center' }}>
              <div style={{ fontSize: '64px', marginBottom: '20px' }}>🏋️‍♂️</div>
              <h3>Selecione um exercício para ver o progresso</h3>
              <p>O sucesso no TAF vem da consistência nos treinos.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Adição de Exercício */}
      {isAddingExercise && (
        <div className="onboarding-overlay" style={{ zIndex: 3000 }}>
          <div className="onboarding-window" style={{ width: '500px' }}>
            <h2>Adicionar Exercício</h2>
            <p style={{ color: 'var(--text-dim)', marginBottom: '30px' }}>Escolha um dos exercícios comuns ou crie um personalizado.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '30px' }}>
              {COMMON_EXERCISES.map(base => (
                <button 
                  key={base.name}
                  className="btn-secondary" 
                  style={{ textAlign: 'left', padding: '12px 20px' }}
                  onClick={() => handleAddExercise(base)}
                >
                  {base.name} ({base.unit})
                </button>
              ))}
            </div>
            
            <button className="btn-secondary" style={{ width: '100%' }} onClick={() => setIsAddingExercise(false)}>CANCELAR</button>
          </div>
        </div>
      )}
    </div>
  );
}
