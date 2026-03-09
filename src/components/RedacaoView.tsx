import { useState, useEffect, useRef, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from 'date-fns';
import localforage from 'localforage';
import type { Essay } from '../App';
import PdfViewer from './PdfViewer';

interface RedacaoViewProps {
  essays: Essay[];
  setEssays: React.Dispatch<React.SetStateAction<Essay[]>>;
  onAddStudyTime: (min: number) => void;
  peersData?: Record<string, any>;
}

export default function RedacaoView({ essays, setEssays, onAddStudyTime, peersData = {} }: RedacaoViewProps) {
  const [activeEssay, setActiveEssay] = useState<Essay | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [time, setTime] = useState(0);
  const [essayPdf, setEssayPdf] = useState<File | null>(null);
  
  const [title, setTitle] = useState('');
  const [score, setScore] = useState('');
  const [corrections, setCorrections] = useState('');

  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isSessionActive) {
      timerRef.current = window.setInterval(() => setTime(t => t + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isSessionActive]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ':' : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleFinishSession = async () => {
    if (!title || !essayPdf) {
      toast.error('Dê um título e anexe o PDF da redação!');
      return;
    }

    const id = Date.now().toString();
    try {
      const arrayBuffer = await essayPdf.arrayBuffer();
      // Usar prefixo 'pdf-' para compatibilidade com PdfViewer
      await localforage.setItem(`pdf-${id}`, arrayBuffer);
      
      const sessionMinutes = Math.floor(time / 60) || 1;
      
      const newEssay: Essay = {
        id,
        date: new Date().toISOString(),
        title,
        pdfUrl: `local-${id}`,
        corrections,
        score: Number(score) || 0,
        timeMinutes: sessionMinutes
      };

      setEssays(prev => [newEssay, ...prev]);
      onAddStudyTime(sessionMinutes);
      
      setIsSessionActive(false);
      setTime(0);
      setTitle('');
      setScore('');
      setCorrections('');
      setEssayPdf(null);
      toast.success('Redação arquivada e tempo contabilizado!');
    } catch (e) {
      toast.error('Erro ao salvar PDF');
    }
  };

  const chartData = useMemo(() => {
    const allDates = new Set<string>();
    
    // Pegamos todas as datas únicas (apenas a parte YYYY-MM-DD para agrupar por dia)
    essays.forEach(e => allDates.add(e.date.slice(0, 10)));
    Object.values(peersData).forEach(p => {
      (p.essaysHistory || []).forEach((e: any) => allDates.add(e.date.slice(0, 10)));
    });

    // Ordenamos cronologicamente
    const sortedDates = Array.from(allDates).sort();

    return sortedDates.map(fullDate => {
      const displayDate = format(new Date(fullDate + 'T12:00:00'), 'dd/MM');
      const res: any = { date: displayDate };
      
      const myEssaysOnDate = essays.filter(e => e.date.startsWith(fullDate));
      if (myEssaysOnDate.length > 0) {
        res['Você'] = Math.round(myEssaysOnDate.reduce((a, b) => a + b.score, 0) / myEssaysOnDate.length);
      }

      Object.values(peersData).forEach(p => {
        const peerEssaysOnDate = (p.essaysHistory || []).filter((e: any) => e.date.startsWith(fullDate));
        if (peerEssaysOnDate.length > 0) {
          res[p.name || p.username] = Math.round(peerEssaysOnDate.reduce((a: number, b: any) => a + b.score, 0) / peerEssaysOnDate.length);
        }
      });

      return res;
    });
  }, [essays, peersData]);

  if (activeEssay) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <button className="btn-secondary" onClick={() => setActiveEssay(null)}>⬅ VOLTAR</button>
          <h2 style={{ color: '#fff' }}>{activeEssay.title} (Nota: {activeEssay.score})</h2>
        </div>
        <div style={{ flex: 1, display: 'flex', gap: '20px' }}>
          <div style={{ flex: 2, borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
            <PdfViewer url={activeEssay.pdfUrl} fileName={activeEssay.title} />
          </div>
          <div className="card" style={{ flex: 1, overflowY: 'auto' }}>
            <h3 style={{ marginBottom: '15px', color: 'var(--primary-light)' }}>Correções e Feedback</h3>
            <p style={{ whiteSpace: 'pre-wrap', fontSize: '14px', lineHeight: '1.6' }}>{activeEssay.corrections || 'Nenhuma correção registrada.'}</p>
            <div style={{ marginTop: '30px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '20px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>TEMPO GASTO</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{activeEssay.timeMinutes} min</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="redacao-view">
      <h1 style={{ fontSize: '36px', fontWeight: '900', marginBottom: '40px' }}>🖋️ Oficina de Redação</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '40px' }}>
        <div className="card">
          <h3 style={{ marginBottom: '20px', color: 'var(--primary-light)' }}>
            {isSessionActive ? '📝 Prática em Andamento' : 'Nova Prática'}
          </h3>
          
          {isSessionActive ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '64px', fontWeight: '900', color: 'var(--success)', marginBottom: '30px', fontFamily: 'monospace' }}>
                {formatTime(time)}
              </div>
              <input className="modern-input" placeholder="Título do Tema" value={title} onChange={e => setTitle(e.target.value)} style={{ marginBottom: '15px' }} />
              
              <div className="file-drop-zone" style={{ marginBottom: '15px', padding: '20px' }} onClick={() => document.getElementById('essay-upload')?.click()}>
                {essayPdf ? `📄 ${essayPdf.name}` : '📁 Anexar PDF da Redação'}
                <input id="essay-upload" type="file" hidden accept=".pdf" onChange={e => setEssayPdf(e.target.files?.[0] || null)} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '15px', marginBottom: '20px' }}>
                <input type="number" className="modern-input" placeholder="Nota" value={score} onChange={e => setScore(e.target.value)} />
                <textarea className="modern-input" placeholder="Correções e Comentários" value={corrections} onChange={e => setCorrections(e.target.value)} style={{ height: '80px' }} />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn-secondary" style={{ flex: 1 }} onClick={() => { if(confirm('Descartar sessão?')) setIsSessionActive(false); }}>DESCARTAR</button>
                <button className="btn-start" style={{ flex: 2, background: 'var(--success)' }} onClick={handleFinishSession}>FINALIZAR E SALVAR</button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <p style={{ color: 'var(--text-dim)', marginBottom: '30px' }}>Prepare seu papel e caneta. O cronômetro iniciará agora.</p>
              <button className="btn-start" style={{ padding: '20px 60px', fontSize: '18px' }} onClick={() => { setTime(0); setIsSessionActive(true); }}>
                INICIAR CRONÔMETRO ⏱️
              </button>
            </div>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '20px' }}>Evolução de Notas</h3>
          <div style={{ height: '300px' }}>
            {essays.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: 'var(--text-dim)', fontSize: 12 }} />
                  <YAxis tick={{ fill: 'var(--text-dim)', fontSize: 12 }} />
                  <RechartsTooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--primary)', borderRadius: '12px' }} />
                  <Legend />
                  <Line name="Você" type="monotone" dataKey="Você" stroke="var(--primary-light)" strokeWidth={3} dot={{ fill: 'var(--primary-light)', r: 6 }} connectNulls />
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
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', textAlign: 'center' }}>
                Pratique pelo menos 2 vezes para ver seu gráfico de evolução.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '25px' }}>Arquivo de Redações</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {essays.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '20px' }}>Nenhuma redação registrada ainda.</p>
          ) : (
            essays.map(essay => (
              <div key={essay.id} className="task-card" style={{ padding: '20px 30px', cursor: 'pointer' }} onClick={() => setActiveEssay(essay)}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <h4 style={{ color: '#fff', fontSize: '18px' }}>{essay.title}</h4>
                    <span style={{ color: 'var(--text-dim)', fontSize: '12px' }}>{format(new Date(essay.date), 'dd/MM/yyyy')}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
                    <span className="badge expert">Nota: {essay.score}</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-dim)', alignSelf: 'center' }}>⏱️ {essay.timeMinutes} min</span>
                  </div>
                </div>
                <div style={{ color: 'var(--primary-light)', fontWeight: 'bold' }}>VER DETALHES 🔍</div>
                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    if(confirm('Excluir permanente?')) {
                      localforage.removeItem(`pdf-${essay.id}`);
                      setEssays(prev => prev.filter(ex => ex.id !== essay.id));
                    }
                  }} 
                  style={{ background: 'transparent', border: 'none', color: 'var(--danger)', marginLeft: '20px' }}
                >🗑️</button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
