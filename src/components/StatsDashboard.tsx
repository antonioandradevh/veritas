import { useState, useMemo, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { PieChart, Pie, Cell, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, Tooltip as RechartsTooltip, LineChart, Line, ReferenceLine } from 'recharts';
import { startOfWeek, startOfDay, parseISO } from 'date-fns';
import localforage from 'localforage';
import type { Subject, UserProfile, StudySession } from '../App';

// ─── Heatmap 100% React, sem lib externa ───────────────────────────────────
function StudyHeatmap({ studySessions }: { studySessions: StudySession[] }) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  const [baseColor, setBaseColor] = useState('99, 102, 241');

  useEffect(() => {
    const updateColor = () => {
      const rootStyles = getComputedStyle(document.body);
      const base = rootStyles.getPropertyValue('--heatmap-base').trim();
      if (base) setBaseColor(base);
      else setBaseColor('99, 102, 241');
    };
    updateColor();
    const observer = new MutationObserver(updateColor);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const { weeks, maxVal } = useMemo(() => {
    const sessionMap: Record<string, number> = {};
    studySessions.forEach(s => {
      const key = s.date.slice(0, 10);
      sessionMap[key] = (sessionMap[key] || 0) + s.count;
    });

    const now = new Date();
    let startDate = startOfWeek(now, { weekStartsOn: 1 });

    if (studySessions.length > 0) {
      const sorted = [...studySessions].sort((a, b) => a.date.localeCompare(b.date));
      startDate = startOfWeek(new Date(sorted[0].date), { weekStartsOn: 1 });
    }

    const weeks: Array<Array<{ dateKey: string; value: number } | null>> = [];
    let currentDay = startOfDay(startDate);
    const lastDayToShow = new Date(startOfWeek(now, { weekStartsOn: 1 }));
    lastDayToShow.setDate(lastDayToShow.getDate() + 6);

    let currentWeek: Array<{ dateKey: string; value: number } | null> = [];
    
    while (currentDay <= lastDayToShow) {
      const dateKey = currentDay.toISOString().slice(0, 10);
      currentWeek.push({ dateKey, value: sessionMap[dateKey] || 0 });
      
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
      currentDay.setDate(currentDay.getDate() + 1);
    }
    
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) currentWeek.push(null);
      weeks.push(currentWeek);
    }

    const maxVal = Math.max(120, ...Object.values(sessionMap));
    return { weeks, maxVal };
  }, [studySessions]);

  const getColor = (value: number) => {
    if (value === 0) return `rgba(${baseColor}, 0.08)`;
    const intensity = Math.min(1, value / maxVal);
    return `rgba(${baseColor}, ${(0.2 + intensity * 0.8).toFixed(2)})`;
  };

  const CELL = 13;
  const GAP = 3;

  return (
    <div style={{ overflowX: 'auto', paddingBottom: '8px' }} onMouseLeave={() => setTooltip(null)}>
      <div style={{ display: 'flex', gap: `${GAP}px`, minWidth: 'max-content' }}>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: `${GAP}px` }}>
            {week.map((cell, di) =>
              cell === null ? (
                <div key={di} style={{ width: CELL, height: CELL }} />
              ) : (
                <div
                  key={di}
                  style={{
                    width: CELL,
                    height: CELL,
                    borderRadius: '2px',
                    background: getColor(cell.value),
                    border: cell.value > 0
                      ? `1px solid rgba(${baseColor}, 0.35)`
                      : '1px solid rgba(255,255,255,0.04)',
                    cursor: 'default',
                  }}
                  onMouseEnter={(e) => {
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    setTooltip({
                      x: rect.left + CELL / 2,
                      y: rect.top - 8,
                      text: cell.value > 0
                        ? `${cell.value} min em ${new Date(cell.dateKey + 'T12:00:00').toLocaleDateString('pt-BR')}`
                        : `Sem estudo em ${new Date(cell.dateKey + 'T12:00:00').toLocaleDateString('pt-BR')}`,
                    });
                  }}
                />
              )
            )}
          </div>
        ))}
      </div>

      {tooltip && (
        <div style={{
          position: 'fixed',
          left: tooltip.x,
          top: tooltip.y,
          transform: 'translate(-50%, -100%)',
          background: 'var(--bg-surface, #1e1e2e)',
          border: `1px solid rgba(${baseColor}, 0.4)`,
          borderRadius: '8px',
          padding: '6px 10px',
          fontSize: '12px',
          color: '#fff',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          zIndex: 9999,
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        }}>
          {tooltip.text}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px', justifyContent: 'flex-end' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Menos</span>
        {[0, 0.25, 0.5, 0.75, 1].map((v, i) => (
          <div key={i} style={{
            width: 10, height: 10, borderRadius: '2px',
            background: v === 0 ? 'rgba(255,255,255,0.04)' : `rgba(${baseColor}, ${(0.2 + v * 0.8).toFixed(2)})`,
            border: v === 0 ? '1px solid rgba(255,255,255,0.04)' : `1px solid rgba(${baseColor}, 0.35)`,
          }} />
        ))}
        <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Mais</span>
      </div>
    </div>
  );
}

// ─── Dashboard principal ────────────────────────────────────────────────────
export default function StatsDashboard({ userProfile, setUserProfile, subjects, setSubjects, studySessions, setStudySessions, peersData = {} }: {
  userProfile: UserProfile & { accuracyResets?: string[] };
  setUserProfile: (profile: any) => void;
  subjects: Subject[];
  setSubjects: React.Dispatch<React.SetStateAction<Subject[]>>;
  studySessions: StudySession[];
  setStudySessions: React.Dispatch<React.SetStateAction<StudySession[]>>;
  peersData?: Record<string, any>;
}) {
  const isCaveira = document.body.classList.contains('theme-caveira');

  const formatDuration = (hours: number) => {
    const totalMinutes = Math.round(hours * 60);
    if (totalMinutes < 60) return `${totalMinutes} min`;
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    
    // Suporte para 3+ dígitos: abreviação consistente
    if (h >= 100) {
      return m > 0 ? `${h}h ${m}m` : `${h}h`;
    }
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  };

  const donutData = useMemo(() => {
    const data = (subjects || []).map(s => ({
      id: s.id,
      name: s.name,
      value: (s.topics || []).reduce((acc, t) => acc + (t.minutesSpent || 0), 0) / 60,
    }));

    // Add Essays time
    const essaysRaw = localStorage.getItem('pobruja-essays');
    const essays = essaysRaw ? JSON.parse(essaysRaw) : [];
    const essaysTime = Array.isArray(essays) ? essays.reduce((acc: number, e: any) => acc + (e.timeMinutes || 0), 0) / 60 : 0;
    if (essaysTime > 0) data.push({ id: 'essays', name: 'Redações', value: essaysTime });

    // Add Simulados time
    const simuladosRaw = localStorage.getItem('pobruja-simulados');
    const simulados = simuladosRaw ? JSON.parse(simuladosRaw) : [];
    const simuladosTime = Array.isArray(simulados) ? simulados.reduce((acc: number, s: any) => acc + (s.timeMinutes || 0), 0) / 60 : 0;
    if (simuladosTime > 0) data.push({ id: 'simulados', name: 'Simulados', value: simuladosTime });

    return data.filter(d => d.value > 0);
  }, [subjects]);

  const totalHoursAll = donutData.reduce((acc, c) => acc + c.value, 0);

  // Calcula tamanho da fonte baseado no comprimento do texto para não estourar o círculo
  const centralFontSize = useMemo(() => {
    const text = formatDuration(totalHoursAll);
    if (text.length > 10) return '24px';
    if (text.length > 8) return '28px';
    return '32px';
  }, [totalHoursAll]);

  const radarData = useMemo(() => {
    const mySubjectsList = subjects || [];
    const peers = Object.values(peersData);
    
    return mySubjectsList.map(s => {
      const res: any = { subject: s.name };
      
      const done = (s.topics || []).reduce((acc, t) => acc + (t.questionsDone || 0), 0) || 0;
      const hits = (s.topics || []).reduce((acc, t) => acc + (t.questionsCorrect || 0), 0) || 0;
      res['Você'] = done > 0 ? Math.round((hits / done) * 100) : 0;

      peers.forEach(p => {
        const peerSubject = (p.subjectsMetrics || []).find((ps: any) => ps.name === s.name);
        res[p.name || p.username] = peerSubject ? Math.round(peerSubject.accuracy) : 0;
      });

      return res;
    });
  }, [subjects, peersData]);

  const barData = useMemo(() => (subjects || []).map(s => {
    const done = (s.topics || []).reduce((acc, t) => acc + (t.questionsDone || 0), 0) || 0;
    const correct = (s.topics || []).reduce((acc, t) => acc + (t.questionsCorrect || 0), 0) || 0;
    return { name: s.name, acertos: correct, erros: Math.max(0, done - correct) };
  }).filter(d => (d.acertos + d.erros) > 0), [subjects]);

  const weeklyStats = useMemo(() => {
    const now = new Date();
    const startOfCurrentWeek = startOfWeek(now, { weekStartsOn: 1 });
    const minutesThisWeek = (studySessions || [])
      .filter(s => startOfDay(parseISO(s.date)) >= startOfCurrentWeek)
      .reduce((acc, s) => acc + s.count, 0);
    const hours = minutesThisWeek / 60;
    const percent = Math.min(100, (hours / (userProfile.weeklyHours || 1)) * 100);
    return { hours, percent, startOfCurrentWeek };
  }, [studySessions, userProfile.weeklyHours]);

  const weeklyBarData = useMemo(() => {
    const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    const start = weeklyStats.startOfCurrentWeek;
    
    return days.map((day, i) => {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().slice(0, 10);
      const session = studySessions.find(s => s.date === dateStr);
      return {
        name: day,
        hours: session ? Number((session.count / 60).toFixed(1)) : 0
      };
    });
  }, [studySessions, weeklyStats.startOfCurrentWeek]);

  const questionStats = useMemo(() => {
    const done = subjects.reduce((acc, s) => acc + (s.topics?.reduce((a, t) => a + (t.questionsDone || 0), 0) || 0), 0);
    const correct = subjects.reduce((acc, s) => acc + (s.topics?.reduce((a, t) => a + (t.questionsCorrect || 0), 0) || 0), 0);
    const errors = Math.max(0, done - correct);
    return { done, correct, errors };
  }, [subjects]);

  const handleResetWeek = () => {
    if (confirm('Deseja resetar as horas desta semana? Isso não afetará o progresso total das matérias, apenas a barra de meta semanal.')) {
      setStudySessions(prev => prev.filter(s => startOfDay(parseISO(s.date)) < weeklyStats.startOfCurrentWeek));
      toast.success('Horas da semana resetadas!');
    }
  };

  const handleResetAccuracy = () => {
    if (confirm('Deseja zerar toda a sua precisão geral? Isso apagará a contagem de questões e acertos de todos os tópicos permanentemente.')) {
      const resetDate = new Date().toISOString();
      
      setSubjects(prev => prev.map(s => ({
        ...s,
        topics: (s.topics || []).map(t => ({
          ...t,
          questionsDone: 0,
          questionsCorrect: 0
        }))
      })));

      setUserProfile((prev: any) => ({
        ...prev,
        accuracyResets: [...(prev.accuracyResets || []), resetDate]
      }));

      toast.success('Precisão geral reiniciada!');
    }
  };

  const handleResetPdfStats = async () => {
    if (confirm('Deseja zerar todas as estatísticas de tempo e páginas lidas dos PDFs? Os arquivos não serão removidos.')) {
      const keys = await localforage.keys();
      const studyKeys = keys.filter(k => k.startsWith('study-data-'));
      for (const key of studyKeys) {
        await localforage.removeItem(key);
      }
      toast.success('Estatísticas de PDF resetadas!');
      window.location.reload();
    }
  };

  const evolutionData = useMemo(() => {
    try {
      // 1. Coleta histórico de questões (snapshots diários)
      const historyRaw = localStorage.getItem('pobruja-performance-history');
      const history = historyRaw ? JSON.parse(historyRaw) : [];
      
      // 2. Coleta histórico de simulados
      const simsRaw = localStorage.getItem('pobruja-simulados');
      const sims = (simsRaw && simsRaw !== 'undefined') ? JSON.parse(simsRaw) : [];
      
      // 3. Unifica e ordena as datas
      const allEntries: any[] = [];
      
      // Adiciona simulados como pontos de evolução
      if (Array.isArray(sims)) {
        sims.forEach((s: any) => {
          if (s.date) {
            allEntries.push({ 
              date: s.date.slice(0, 10), 
              done: s.totalQuestions || 0, 
              hits: s.hits || 0,
              type: 'simulado'
            });
          }
        });
      }

      // Adiciona snapshots diários
      if (Array.isArray(history)) {
        history.forEach((h: any) => {
          allEntries.push({ 
            date: h.date, 
            done: h.done, 
            hits: h.hits,
            type: 'snapshot'
          });
        });
      }

      if (allEntries.length === 0) return [];

      // Ordena por data
      const sorted = allEntries.sort((a, b) => a.date.localeCompare(b.date));

      // Mapeia para o formato do gráfico
      return sorted.map(e => ({
        date: e.date.slice(5).replace('-', '/'),
        precisao: e.done > 0 ? Math.round((e.hits / e.done) * 100) : 0,
        label: e.type === 'simulado' ? 'Simulado' : 'Estudo'
      }));
    } catch (e) {
      console.error('Evolution data error', e);
      return [];
    }
  }, [studySessions, subjects]);

  const [pdfStats, setPdfStats] = useState<{ subject: string, time: number, totalPages: number, avgTimePerPage: number }[]>([]);

  useEffect(() => {
    const loadPdfStats = async () => {
      try {
        const keys = await localforage.keys();
        const studyKeys = keys.filter(k => k.startsWith('study-data-'));
        const statsMap: Record<string, any> = {};
        let totalGlobalTime = 0;
        let totalGlobalPages = 0;

        for (const key of studyKeys) {
          const data: any = await localforage.getItem(key);
          const materialId = key.replace('study-data-', '');
          
          subjects.forEach(s => {
            s.topics.forEach(t => {
              const m = (t.materials || []).find(mat => mat.id === materialId);
              if (m) {
                if (data && data.pageStats) {
                  const pages: any[] = Object.values(data.pageStats);
                  const totalTime = pages.reduce((acc: number, curr: any) => acc + (curr.timeSpent || 0), 0);
                  const pageCount = pages.length;
                  
                  totalGlobalTime += totalTime;
                  totalGlobalPages += pageCount;

                  if (!statsMap[s.name]) {
                    statsMap[s.name] = { 
                      subject: s.name, 
                      time: 0, 
                      totalPages: 0,
                      totalSeconds: 0
                    };
                  }
                  statsMap[s.name].time += totalTime / 3600;
                  statsMap[s.name].totalPages += pageCount;
                  statsMap[s.name].totalSeconds += totalTime;
                }
              }
            });
          });
        }
        
        const finalStats = Object.values(statsMap).map(st => ({
          subject: st.subject,
          time: st.time,
          totalPages: st.totalPages,
          avgTimePerPage: st.totalPages > 0 ? st.totalSeconds / st.totalPages : 0
        }));

        setPdfStats(finalStats.sort((a,b) => b.time - a.time).slice(0, 5));
      } catch (e) { console.error('Error loading PDF stats', e); }
    };
    loadPdfStats();
  }, [subjects]);

  const formatSeconds = (sec: number) => {
    if (sec < 60) return `${Math.round(sec)}s`;
    return `${Math.floor(sec / 60)}m ${Math.round(sec % 60)}s`;
  };

  return (
    <div className="stats-dashboard">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '36px', fontWeight: '900' }}>Painel de Desempenho</h1>
        <div style={{ textAlign: 'right' }}>
          <p style={{ color: 'var(--primary-light)', fontWeight: 'bold' }}>Objetivo: {userProfile.targetJob}</p>
          <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Foco: {userProfile.weeklyHours}h semanais</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' }}>
        <div className="card" style={{ padding: '20px', textAlign: 'center', background: 'rgba(255,255,255,0.02)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '5px' }}>QUESTÕES TOTAIS</div>
          <div style={{ fontSize: '24px', fontWeight: '900', color: '#fff' }}>{questionStats.done}</div>
        </div>
        <div className="card" style={{ padding: '20px', textAlign: 'center', background: 'rgba(0, 242, 255, 0.05)', borderColor: 'rgba(0, 242, 255, 0.1)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '5px' }}>ACERTOS TOTAIS</div>
          <div style={{ fontSize: '24px', fontWeight: '900', color: 'var(--success)' }}>{questionStats.correct}</div>
        </div>
        <div className="card" style={{ padding: '20px', textAlign: 'center', background: 'rgba(244, 67, 54, 0.05)', borderColor: 'rgba(244, 67, 54, 0.1)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '5px' }}>ERROS TOTAIS</div>
          <div style={{ fontSize: '24px', fontWeight: '900', color: 'var(--danger)' }}>{questionStats.errors}</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '30px', padding: '25px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ fontSize: '18px' }}>🚀 Progresso da Meta Semanal</h3>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <button 
              className="btn-secondary" 
              style={{ padding: '4px 12px', fontSize: '10px', color: 'var(--text-dim)', borderColor: 'rgba(255,255,255,0.1)' }}
              onClick={handleResetPdfStats}
            >
              LIMPAR DADOS PDF 🗑️
            </button>
            <button 
              className="btn-secondary" 
              style={{ padding: '4px 12px', fontSize: '10px', color: 'var(--danger)', borderColor: 'rgba(244, 67, 54, 0.3)' }}
              onClick={handleResetAccuracy}
            >
              REINICIAR PRECISÃO ↺
            </button>
            <button 
              className="btn-secondary" 
              style={{ padding: '4px 12px', fontSize: '10px', color: 'var(--danger)', borderColor: 'rgba(244, 67, 54, 0.3)' }}
              onClick={handleResetWeek}
            >
              REINICIAR SEMANA ↺
            </button>
            <span style={{ fontWeight: '900', color: 'var(--success)' }}>{formatDuration(weeklyStats.hours)} / {userProfile.weeklyHours}h</span>
          </div>
        </div>
        <div style={{ width: '100%', height: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ width: `${weeklyStats.percent}%`, height: '100%', background: 'var(--success)', boxShadow: '0 0 15px var(--success)', transition: 'width 1s ease-out' }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
        <div className="card" style={{ height: '450px', overflowY: 'auto' }}>
          <h3 style={{ marginBottom: '20px' }}>📖 Top Disciplinas Estudadas (PDF)</h3>
          {pdfStats.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {pdfStats.map((ps, i) => (
                <div 
                  key={i} 
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '12px 20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <div style={{ flex: 1, marginRight: '15px' }}>
                    <div style={{ fontSize: '16px', color: '#fff', fontWeight: 'bold' }}>{ps.subject}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                      {ps.totalPages} páginas · Média {formatSeconds(ps.avgTimePerPage)}/pág
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '16px', fontWeight: '900', color: 'var(--primary-light)' }}>{ps.time.toFixed(1)}h</div>
                    <div style={{ fontSize: '9px', color: 'var(--text-dim)' }}>TEMPO</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '40px' }}>Nenhum dado de PDF capturado ainda.</p>
          )}
        </div>

        <div className="card" style={{ height: '450px' }}>
          <h3 style={{ marginBottom: '20px' }}>Radar de Afinidade (%)</h3>
          <ResponsiveContainer width="100%" height="90%">
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.05)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-dim)', fontSize: 12 }} />
              <Radar name="Você" dataKey="Você" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.5} />
              {Object.values(peersData).map((p: any, i) => (
                <Radar 
                  key={p.id} 
                  name={p.name || p.username} 
                  dataKey={p.name || p.username} 
                  stroke={[`#ff00ff`, `#00f2ff`, `#ffd700`, `#ff4d4d`][i % 4]} 
                  fill={[`#ff00ff`, `#00f2ff`, `#ffd700`, `#ff4d4d`][i % 4]} 
                  fillOpacity={0.3} 
                />
              ))}
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
        <div className="card" style={{ height: '450px', position: 'relative' }}>
          <h3 style={{ marginBottom: '20px' }}>Distribuição de Tempo</h3>
          <div style={{ position: 'absolute', top: '55%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', width: '160px' }}>
            <div style={{ fontSize: centralFontSize, fontWeight: '900', color: '#fff', transition: 'font-size 0.3s ease', lineHeight: '1' }}>{formatDuration(totalHoursAll)}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '5px' }}>TOTAL</div>
          </div>
          <ResponsiveContainer width="100%" height="90%">
            <PieChart>
              <Pie 
                data={donutData} 
                innerRadius={85} 
                outerRadius={115} 
                paddingAngle={5} 
                dataKey="value" 
                stroke="none"
              >
                {donutData.map((_, i) => {
                  const shades = isCaveira ? [
                    '#ffffff', '#e0e0e0', '#bdbdbd', '#9e9e9e', '#757575', '#616161'
                  ] : [
                    'var(--primary)',
                    'color-mix(in srgb, var(--primary), white 20%)',
                    'color-mix(in srgb, var(--primary), white 40%)',
                    'color-mix(in srgb, var(--primary), black 20%)',
                    'color-mix(in srgb, var(--primary), black 40%)'
                  ];
                  return <Cell key={i} fill={shades[i % shades.length]} />;
                })}
              </Pie>
              <RechartsTooltip 
                formatter={(value: any, name: string | undefined) => [formatDuration(Number(value) || 0), name || '']}
                contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--primary)', borderRadius: '12px', color: '#fff' }}
                itemStyle={{ color: '#fff' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card" style={{ height: '450px' }}>
          <h3 style={{ marginBottom: '25px' }}>Desempenho por Matéria</h3>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: 'var(--text-dim)', fontSize: 12 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
              <YAxis tick={{ fill: 'var(--text-dim)', fontSize: 12 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
              <RechartsTooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--primary)', borderRadius: '12px', color: '#fff' }} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar dataKey="acertos" fill={isCaveira ? "#ffffff" : "var(--success)"} radius={[4, 4, 0, 0]} name="Acertos" />
              <Bar dataKey="erros" fill="var(--danger)" radius={[4, 4, 0, 0]} name="Erros" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '30px' }}>
        <h3 style={{ marginBottom: '25px' }}>📅 Carga Horária da Semana</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={weeklyBarData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: 'var(--text-dim)', fontSize: 12 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
            <YAxis tick={{ fill: 'var(--text-dim)', fontSize: 12 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} label={{ value: 'Horas', angle: -90, position: 'insideLeft', fill: 'var(--text-dim)', fontSize: 10 }} />
            <RechartsTooltip 
              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--primary)', borderRadius: '12px', color: '#fff' }} 
              formatter={(value: number | undefined) => {
                if (value === undefined) return ['0min', 'Tempo'];
                const totalMinutes = Math.round(value * 60);
                const h = Math.floor(totalMinutes / 60);
                const m = totalMinutes % 60;
                if (h === 0) return [`${m}min`, 'Tempo'];
                return [`${h}h ${m > 0 ? m + 'min' : ''}`, 'Tempo'];
              }}
            />
            <Bar dataKey="hours" fill="var(--primary-light)" radius={[4, 4, 0, 0]} name="Horas Estudadas" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card" style={{ marginBottom: '30px' }}>
        <h3 style={{ marginBottom: '25px' }}>Consistência de Estudos</h3>
        <StudyHeatmap studySessions={studySessions} />
      </div>

      <div className="card" style={{ marginBottom: '30px', height: '350px' }}>
        <h3 style={{ marginBottom: '20px' }}>Evolução Geral de Precisão (Acúmulo)</h3>
        {evolutionData.length > 1 ? (
          <ResponsiveContainer width="100%" height="90%">
            <LineChart data={evolutionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: 'var(--text-dim)', fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-dim)', fontSize: 12 }} />
              <RechartsTooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--primary)', borderRadius: '12px' }} />
              <Line type="monotone" dataKey="precisao" stroke={isCaveira ? "#ffffff" : "var(--accent)"} strokeWidth={3} dot={{ fill: isCaveira ? "#ffffff" : "var(--accent)", r: 5 }} />
              
              {/* Linhas de Reset */}
              {(userProfile.accuracyResets || []).map((resetDate, idx) => {
                const formattedResetDate = resetDate.slice(5, 10).replace('-', '/');
                return (
                  <ReferenceLine 
                    key={idx}
                    x={formattedResetDate} 
                    stroke="var(--danger)" 
                    strokeDasharray="3 3" 
                    label={{ value: 'RESET', position: 'top', fill: 'var(--danger)', fontSize: 10, fontWeight: 'bold' }} 
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ height: '90%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)' }}>
            Continue estudando e realizando simulados para gerar o gráfico de evolução.
          </div>
        )}
      </div>
    </div>
  );
}
