import { useState } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  differenceInDays,
  parseISO,
  startOfDay
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import type { CycleConfig, Subject } from '../App';

interface CalendarViewProps {
  subjects: Subject[];
  cycleConfig: CycleConfig;
  setCycleConfig: React.Dispatch<React.SetStateAction<CycleConfig>>;
}

export default function CalendarView({ subjects, cycleConfig, setCycleConfig }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const getSubjectsForDate = (date: Date) => {
    if (!cycleConfig || !cycleConfig.startDate || !cycleConfig.numDays) return [];
    try {
      const diff = differenceInDays(startOfDay(date), startOfDay(parseISO(cycleConfig.startDate)));
      if (diff < 0) return []; // Antes da data de início
      
      const cycleDay = (diff % cycleConfig.numDays) + 1;
      const scheduled = (cycleConfig.schedule && cycleConfig.schedule[cycleDay.toString()]) || [];
      
      // Auto-projection of SIMULADO based on interval
      const simInterval = cycleConfig.simInterval || 15;
      const isAutoSim = diff > 0 && diff % simInterval === 0;

      if (scheduled.includes('📝 SIMULADO') || isAutoSim) {
        return [scheduled.includes('📝 SIMULADO') ? '📝 SIMULADO' : '📝 SIMULADO (AUTO)'];
      }

      return scheduled;
    } catch (e) {
      console.error('Calendar error:', e);
      return [];
    }
  };

  const renderHeader = () => {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: '900', textTransform: 'capitalize' }}>
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </h1>
          <p style={{ color: 'var(--text-dim)', fontSize: '12px', marginTop: '5px' }}>
            Ciclo de {cycleConfig.numDays} dias iniciado em {format(parseISO(cycleConfig.startDate), 'dd/MM/yyyy')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-secondary" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>⏪</button>
          <button className="btn-secondary" onClick={() => setCurrentMonth(new Date())}>Hoje</button>
          <button className="btn-secondary" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>⏩</button>
        </div>
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDateCal = startOfWeek(monthStart);
    const endDateCal = endOfWeek(monthEnd);

    const calendarDays = eachDayOfInterval({ start: startDateCal, end: endDateCal });

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.05)' }}>
        {calendarDays.map(day => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isToday = isSameDay(day, new Date());
          const daySubjects = getSubjectsForDate(day);
          const diff = differenceInDays(startOfDay(day), startOfDay(parseISO(cycleConfig.startDate)));
          const cycleDay = diff >= 0 ? (diff % cycleConfig.numDays) + 1 : null;

          return (
            <div key={dateKey} style={{ 
              minHeight: '120px', 
              background: isCurrentMonth ? 'var(--bg-card)' : 'rgba(0,0,0,0.1)',
              padding: '10px',
              opacity: isCurrentMonth ? 1 : 0.4
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '14px', fontWeight: isToday ? 'bold' : 'normal', color: isToday ? 'var(--primary-light)' : 'var(--text-main)' }}>
                  {format(day, 'd')}
                </span>
                {cycleDay && <span style={{ fontSize: '9px', color: 'var(--text-dim)' }}>D{cycleDay}</span>}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {daySubjects.map(sName => {
                  const isSim = sName.includes('SIMULADO');
                  const isRev = sName.includes('REVISÃO');
                  return (
                    <div key={sName} className="calendar-subject-tag" style={{ 
                      fontSize: '9px', 
                      fontWeight: (isSim || isRev) ? 'bold' : 'normal',
                      background: isSim ? 'rgba(0, 242, 255, 0.2)' : isRev ? 'rgba(255, 0, 255, 0.2)' : 'rgba(138, 43, 226, 0.2)', 
                      color: isSim ? 'var(--success)' : isRev ? 'var(--accent)' : '#fff', 
                      padding: '2px 6px', 
                      borderRadius: '4px',
                      border: `1px solid ${isSim ? 'var(--success)' : isRev ? 'var(--accent)' : 'rgba(138, 43, 226, 0.3)'}`,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                    }}>
                      {sName}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="calendar-view">
      <div className="card" style={{ marginBottom: '40px', padding: '40px' }}>
        <h3 style={{ color: '#fff', fontSize: '22px', marginBottom: '30px' }}>⚙️ Configuração do Ciclo de Estudos</h3>
        <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', marginBottom: '30px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-dim)', marginBottom: '8px' }}>Duração do Ciclo (Dias)</label>
            <input 
              type="number" 
              className="modern-input" 
              value={cycleConfig.numDays || 7} 
              onChange={e => setCycleConfig(prev => ({ ...prev, numDays: Math.max(1, Number(e.target.value)) }))} 
              style={{ width: '100px' }} 
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-dim)', marginBottom: '8px' }}>Intervalo de Simulados (Dias)</label>
            <input 
              type="number" 
              className="modern-input" 
              value={cycleConfig.simInterval || 15} 
              onChange={e => setCycleConfig(prev => ({ ...prev, simInterval: Math.max(1, Number(e.target.value)) }))} 
              style={{ width: '100px' }} 
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-dim)', marginBottom: '8px' }}>Data de Início do Primeiro Ciclo</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input 
                type="date" 
                className="modern-input" 
                value={cycleConfig.startDate ? format(parseISO(cycleConfig.startDate), 'yyyy-MM-dd') : ''} 
                onChange={e => {
                  try {
                    const date = parseISO(e.target.value);
                    if (!isNaN(date.getTime())) {
                      setCycleConfig(prev => ({ ...prev, startDate: date.toISOString() }));
                    }
                  } catch (err) { console.error(err); }
                }} 
                style={{ width: '200px' }} 
              />
              <button className="btn-secondary" style={{ padding: '0 20px', fontSize: '11px', whiteSpace: 'nowrap' }} onClick={() => {
                setCycleConfig(prev => ({ ...prev, startDate: new Date().toISOString() }));
                toast.success('Ciclo reiniciado para hoje (D1)!');
              }}>DEFINIR D1 COMO HOJE 🚩</button>
            </div>
          </div>
        </div>

        <div style={{ overflowX: 'auto', paddingBottom: '20px', cursor: 'grab' }} className="cycle-scroll-container">
          <div style={{ display: 'flex', gap: '15px', minWidth: 'max-content' }}>
            {Array.from({ length: cycleConfig.numDays || 7 }).map((_, i) => {
              const dIdx = i + 1;
              const activeSubjects = (cycleConfig.schedule && cycleConfig.schedule[dIdx.toString()]) || [];
              return (
                <div key={dIdx} style={{ width: '200px', flexShrink: 0, background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <h4 style={{ color: 'var(--primary-light)', marginBottom: '15px', textAlign: 'center' }}>Dia {dIdx}</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '5px', marginBottom: '5px' }}>
                      <button 
                        className="btn-secondary" 
                        style={{ flex: 1, padding: '5px', fontSize: '9px', background: activeSubjects.includes('📝 SIMULADO') ? 'var(--success)' : 'rgba(0,242,255,0.1)', color: '#fff' }}
                        onClick={() => {
                          const current = cycleConfig.schedule[dIdx.toString()] || [];
                          const next = current.includes('📝 SIMULADO') ? current.filter(x => x !== '📝 SIMULADO') : [...current, '📝 SIMULADO'];
                          setCycleConfig(prev => ({ ...prev, schedule: { ...prev.schedule, [dIdx.toString()]: next } }));
                        }}
                      >+ SIMULADO</button>
                      <button 
                        className="btn-secondary" 
                        style={{ flex: 1, padding: '5px', fontSize: '9px', background: activeSubjects.includes('🏆 REVISÃO') ? 'var(--accent)' : 'rgba(255,0,255,0.1)', color: '#fff' }}
                        onClick={() => {
                          const current = cycleConfig.schedule[dIdx.toString()] || [];
                          const next = current.includes('🏆 REVISÃO') ? current.filter(x => x !== '🏆 REVISÃO') : [...current, '🏆 REVISÃO'];
                          setCycleConfig(prev => ({ ...prev, schedule: { ...prev.schedule, [dIdx.toString()]: next } }));
                        }}
                      >+ REVISÃO</button>
                    </div>
                    {subjects.map(s => {
                      const isActive = activeSubjects.includes(s.name);
                      return (
                        <button key={s.id} className="cycle-subject-btn" onClick={() => {
                          const current = (cycleConfig.schedule && cycleConfig.schedule[dIdx.toString()]) || [];
                          const newDaySchedule = current.includes(s.name) 
                            ? current.filter(x => x !== s.name) 
                            : [...current, s.name];
                          setCycleConfig(prev => ({
                            ...prev,
                            schedule: { ...prev.schedule, [dIdx.toString()]: newDaySchedule }
                          }));
                        }} style={{
                          padding: '8px', borderRadius: '8px', fontSize: '11px', cursor: 'pointer', transition: '0.2s',
                          background: isActive ? 'var(--primary)' : 'transparent',
                          color: isActive ? 'var(--bg-deep)' : 'var(--text-dim)',
                          border: `1px solid ${isActive ? 'var(--primary)' : 'rgba(255,255,255,0.1)'}`,
                        }}>
                          {s.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {renderHeader()}
      <div className="card" style={{ padding: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '10px' }}>
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => <div key={d} style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--text-dim)', fontSize: '12px' }}>{d}</div>)}
        </div>
        {renderCells()}
      </div>
      <div className="card" style={{ marginTop: '30px', padding: '20px' }}>
        <h3 style={{ marginBottom: '10px' }}>💡 Dica do Mestre</h3>
        <p style={{ fontSize: '14px', color: 'var(--text-dim)' }}>
          As matérias exibidas acima são geradas automaticamente com base no ciclo configurado na aba <strong>⚔️ A Jornada</strong>.
          Ajuste a duração, o intervalo de simulados e a data de início lá para refletir seu plano de estudos.
        </p>
      </div>
    </div>
  );
}
