import { useState, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import type { Simulado } from '../App';

interface SimuladoViewProps {
  simulados: Simulado[];
  setSimulados: React.Dispatch<React.SetStateAction<Simulado[]>>;
  onAddStudyTime: (min: number) => void;
}

export default function SimuladoView({ simulados, setSimulados, onAddStudyTime }: SimuladoViewProps) {
  const [description, setDescription] = useState('');
  const [totalQuestions, setTotalQuestions] = useState('');
  const [hits, setHits] = useState('');
  const [timeMinutes, setTimeMinutes] = useState('');

  const handleAddSimulado = () => {
    if (!description || !totalQuestions || !hits || !timeMinutes) {
      toast.error('Preencha todos os campos do relatório!');
      return;
    }

    const newSim: Simulado = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      description,
      totalQuestions: Number(totalQuestions),
      hits: Number(hits),
      timeMinutes: Number(timeMinutes)
    };

    setSimulados(prev => [newSim, ...prev]);
    onAddStudyTime(newSim.timeMinutes);
    setDescription('');
    setTotalQuestions('');
    setHits('');
    setTimeMinutes('');
    toast.success('Relatório de Simulado arquivado e tempo contabilizado!');
  };

  const performanceData = useMemo(() => {
    return [...simulados].reverse().map(s => ({
      date: format(new Date(s.date), 'dd/MM'),
      accuracy: Math.round((s.hits / s.totalQuestions) * 100),
      description: s.description
    }));
  }, [simulados]);

  const handleDelete = (id: string) => {
    if (window.confirm('Excluir este registro de simulado?')) {
      setSimulados(prev => prev.filter(s => s.id !== id));
    }
  };

  return (
    <div className="simulado-view">
      <h1 style={{ fontSize: '36px', fontWeight: '900', marginBottom: '40px' }}>📝 Centro de Simulados</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '40px' }}>
        <div className="card">
          <h3 style={{ marginBottom: '25px', color: 'var(--primary-light)' }}>Registrar Novo Simulado</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input 
              className="modern-input" 
              placeholder="Descrição (ex: Simulado 01 - Estratégia)" 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
            />
            <div style={{ display: 'flex', gap: '15px' }}>
              <input 
                type="number" 
                className="modern-input" 
                placeholder="Total Questões" 
                value={totalQuestions} 
                onChange={e => setTotalQuestions(e.target.value)} 
              />
              <input 
                type="number" 
                className="modern-input" 
                placeholder="Acertos" 
                value={hits} 
                onChange={e => setHits(e.target.value)} 
              />
            </div>
            <input 
              type="number" 
              className="modern-input" 
              placeholder="Tempo Gasto (Minutos)" 
              value={timeMinutes} 
              onChange={e => setTimeMinutes(e.target.value)} 
            />
            <button className="btn-start" onClick={handleAddSimulado}>ARQUIVAR RESULTADO</button>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h3 style={{ marginBottom: '20px' }}>Evolução de Precisão (%)</h3>
          <div style={{ height: '250px', width: '100%' }}>
            {simulados.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="date" tick={{fill: 'var(--text-dim)', fontSize: 12}} />
                  <YAxis domain={[0, 100]} tick={{fill: 'var(--text-dim)', fontSize: 12}} />
                  <RechartsTooltip 
                    contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--primary)', borderRadius: '12px' }}
                  />
                  <Line type="monotone" dataKey="accuracy" stroke="var(--success)" strokeWidth={3} dot={{ fill: 'var(--success)', r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', textAlign: 'center' }}>
                Realize pelo menos 2 simulados para ver o gráfico de evolução.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '25px' }}>Histórico de Simulados</h3>
        {simulados.length === 0 ? (
          <p style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '40px' }}>Nenhum simulado registrado ainda.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {simulados.map(s => {
              const acc = Math.round((s.hits / s.totalQuestions) * 100);
              return (
                <div key={s.id} className="task-card" style={{ padding: '20px 30px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <h4 style={{ color: '#fff', fontSize: '18px' }}>{s.description}</h4>
                      <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{format(new Date(s.date), 'dd/MM/yyyy')}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '30px', marginTop: '15px' }}>
                      <div>
                        <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Desempenho</div>
                        <div style={{ fontSize: '20px', fontWeight: '900', color: acc >= 70 ? 'var(--success)' : 'var(--accent)' }}>{acc}%</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Questões</div>
                        <div style={{ fontSize: '20px', fontWeight: '700' }}>{s.hits}/{s.totalQuestions}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Tempo</div>
                        <div style={{ fontSize: '20px', fontWeight: '700' }}>{s.timeMinutes} min</div>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDelete(s.id)} 
                    style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '10px' }}
                  >
                    🗑️
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
