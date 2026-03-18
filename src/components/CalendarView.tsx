import { useState } from 'react';
import { saveAs } from 'file-saver';
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
  addDays,
  differenceInDays,
  parseISO,
  startOfDay,
  getDay
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import type { CycleConfig, Subject, UserProfile, RoutineEvent } from '../App';

interface CalendarViewProps {
  subjects: Subject[];
  cycleConfig: CycleConfig;
  setCycleConfig: React.Dispatch<React.SetStateAction<CycleConfig>>;
  userProfile: UserProfile;
  setUserProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
}

export default function CalendarView({ subjects, cycleConfig, setCycleConfig, userProfile, setUserProfile }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showRoutineModal, setShowRoutineModal] = useState(false);
  const [newRoutine, setNewRoutine] = useState<Partial<RoutineEvent>>({
    name: '',
    startTime: '08:00',
    endTime: '09:00',
    type: 'study',
    days: [1, 2, 3, 4, 5]
  });

  const handleAddRoutine = () => {
    if (!newRoutine.name || !newRoutine.startTime || !newRoutine.endTime) {
      toast.error('Preencha todos os campos da rotina!');
      return;
    }
    const event: RoutineEvent = {
      id: crypto.randomUUID(),
      name: newRoutine.name!,
      startTime: newRoutine.startTime!,
      endTime: newRoutine.endTime!,
      type: newRoutine.type as RoutineEvent['type'],
      days: newRoutine.days || []
    };
    setUserProfile(prev => ({
      ...prev,
      routine: [...(prev.routine || []), event]
    }));
    setNewRoutine({ name: '', startTime: '08:00', endTime: '09:00', type: 'study', days: [1, 2, 3, 4, 5] });
    toast.success('Evento de rotina adicionado!');
  };

  const handleRemoveRoutine = (id: string) => {
    setUserProfile(prev => ({
      ...prev,
      routine: (prev.routine || []).filter(r => r.id !== id)
    }));
    toast.success('Evento removido');
  };

  const handleExportICS = () => {
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//VERITAS//Study Management App//PT',
      'X-WR-CALNAME:VERITAS - Cronograma de Estudos',
      'X-WR-TIMEZONE:America/Sao_Paulo'
    ];

    const today = new Date();

    // 1. Export Routine
    (userProfile.routine || []).forEach(r => {
      const daysMap = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
      const byDay = r.days.map(d => daysMap[d]).join(',');
      
      const dtStart = format(today, 'yyyyMMdd') + 'T' + r.startTime.replace(':', '') + '00';
      const dtEnd = format(today, 'yyyyMMdd') + 'T' + r.endTime.replace(':', '') + '00';

      ics.push('BEGIN:VEVENT');
      ics.push(`UID:routine-${r.id}`);
      ics.push(`DTSTAMP:${format(new Date(), "yyyyMMdd'T'HHmmss'Z'")}`);
      ics.push(`DTSTART:${dtStart}`);
      ics.push(`DTEND:${dtEnd}`);
      ics.push(`RRULE:FREQ=WEEKLY;BYDAY=${byDay}`);
      ics.push(`SUMMARY:${r.name}`);
      ics.push('END:VEVENT');
    });

    // 2. Export Study Cycle (Next 60 days)
    for (let i = 0; i < 60; i++) {
      const date = addDays(today, i);
      const daySubjects = getSubjectsForDate(date);
      if (daySubjects.length > 0) {
        const dateStr = format(date, 'yyyyMMdd');
        ics.push('BEGIN:VEVENT');
        ics.push(`UID:study-${dateStr}`);
        ics.push(`DTSTAMP:${format(new Date(), "yyyyMMdd'T'HHmmss'Z'")}`);
        ics.push(`DTSTART;VALUE=DATE:${dateStr}`);
        ics.push(`DTEND;VALUE=DATE:${dateStr}`);
        ics.push(`SUMMARY:VERITAS: ${daySubjects.join(', ')}`);
        ics.push('END:VEVENT');
      }
    }

    ics.push('END:VCALENDAR');
    const blob = new Blob([ics.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    saveAs(blob, 'veritas_cronograma.ics');
    toast.success('Calendário exportado com sucesso!');
  };

  const getSubjectsForDate = (date: Date) => {
    if (!cycleConfig || !cycleConfig.numDays) return [];
    
    const currentCycleDay = cycleConfig.currentDay || 1;
    const today = startOfDay(new Date());
    const targetDate = startOfDay(date);
    
    try {
      const diff = differenceInDays(targetDate, today);
      let cycleDay = ((currentCycleDay - 1 + diff) % cycleConfig.numDays);
      if (cycleDay < 0) cycleDay += cycleConfig.numDays;
      cycleDay += 1;

      const scheduled = (cycleConfig.schedule && cycleConfig.schedule[cycleDay.toString()]) || [];
      const simInterval = cycleConfig.simInterval || 15;
      const totalDaysSinceStart = differenceInDays(today, parseISO(cycleConfig.startDate));
      const projectedDiff = totalDaysSinceStart + diff;
      const isAutoSim = projectedDiff > 0 && projectedDiff % simInterval === 0;

      if (scheduled.includes('📝 SIMULADO') || isAutoSim) {
        return [scheduled.includes('📝 SIMULADO') ? '📝 SIMULADO' : '📝 SIMULADO (AUTO)'];
      }
      return scheduled;
    } catch (e) {
      console.error('Calendar error:', e);
      return [];
    }
  };

  const getRoutineForDate = (date: Date) => {
    const dayOfWeek = getDay(date); // 0-6
    return (userProfile.routine || []).filter(r => r.days.includes(dayOfWeek))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
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
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button className="btn-secondary" style={{ borderColor: 'var(--success)', color: 'var(--success)' }} onClick={handleExportICS}>📤 EXPORTAR .ICS</button>
          <button className="btn-secondary" style={{ borderColor: 'var(--primary)', color: 'var(--primary-light)' }} onClick={() => setShowRoutineModal(true)}>📅 MINHA ROTINA</button>
          <div style={{ width: '1px', height: '30px', background: 'rgba(255,255,255,0.1)', margin: '0 10px' }} />
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
          const dayRoutine = getRoutineForDate(day);
          const diff = differenceInDays(startOfDay(day), startOfDay(parseISO(cycleConfig.startDate)));
          const cycleDay = diff >= 0 ? (diff % cycleConfig.numDays) + 1 : null;

          return (
            <div key={dateKey} style={{ 
              minHeight: '160px', 
              background: isCurrentMonth ? 'var(--bg-card)' : 'rgba(0,0,0,0.1)',
              padding: '10px',
              opacity: isCurrentMonth ? 1 : 0.4,
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: isToday ? 'bold' : 'normal', color: isToday ? 'var(--primary-light)' : 'var(--text-main)' }}>
                  {format(day, 'd')}
                </span>
                {cycleDay && <span style={{ fontSize: '9px', color: 'var(--text-dim)' }}>D{cycleDay}</span>}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {dayRoutine.map(r => (
                  <div key={r.id} style={{ 
                    fontSize: '8px', 
                    background: r.type === 'study' ? 'rgba(138, 43, 226, 0.15)' : 'rgba(255,255,255,0.05)',
                    color: r.type === 'study' ? 'var(--primary-light)' : 'var(--text-dim)',
                    padding: '2px 4px',
                    borderRadius: '3px',
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}>
                    <span>{r.startTime} {r.name}</span>
                  </div>
                ))}
              </div>

              <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '2px 0' }} />

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
      {showRoutineModal && (
        <div className="onboarding-overlay" style={{ zIndex: 4000 }}>
          <div className="onboarding-window" style={{ width: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
              <h2 style={{ color: '#fff' }}>📅 Minha Rotina Semanal</h2>
              <button className="btn-secondary" onClick={() => setShowRoutineModal(false)}>FECHAR</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
              <div>
                <h4 style={{ color: 'var(--primary-light)', marginBottom: '20px' }}>Adicionar Atividade</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <input 
                    className="modern-input" 
                    placeholder="Nome (Ex: Almoço, Trabalho, Estudo)" 
                    value={newRoutine.name}
                    onChange={e => setNewRoutine({...newRoutine, name: e.target.value})}
                  />
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Início</label>
                      <input type="time" className="modern-input" value={newRoutine.startTime} onChange={e => setNewRoutine({...newRoutine, startTime: e.target.value})} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Fim</label>
                      <input type="time" className="modern-input" value={newRoutine.endTime} onChange={e => setNewRoutine({...newRoutine, endTime: e.target.value})} />
                    </div>
                  </div>
                  <select 
                    className="modern-input"
                    value={newRoutine.type}
                    onChange={e => setNewRoutine({...newRoutine, type: e.target.value as RoutineEvent['type']})}
                  >
                    <option value="study">Estudo</option>
                    <option value="work">Trabalho</option>
                    <option value="lunch">Refeição</option>
                    <option value="leisure">Lazer</option>
                    <option value="other">Outro</option>
                  </select>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                    {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                      <button 
                        key={i}
                        className={`btn-secondary ${newRoutine.days?.includes(i) ? 'active' : ''}`}
                        style={{ 
                          width: '40px', 
                          height: '40px',
                          padding: '0', 
                          fontSize: '14px', 
                          fontWeight: 'bold',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: newRoutine.days?.includes(i) ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                          color: newRoutine.days?.includes(i) ? 'var(--bg-deep)' : '#fff',
                          border: `1px solid ${newRoutine.days?.includes(i) ? 'var(--primary)' : 'rgba(255,255,255,0.1)'}`,
                          transition: 'all 0.2s ease'
                        }}
                        onClick={() => {
                          const current = newRoutine.days || [];
                          const next = current.includes(i) ? current.filter(x => x !== i) : [...current, i];
                          setNewRoutine({...newRoutine, days: next});
                        }}
                      >{d}</button>
                    ))}
                  </div>

                  <button className="btn-start" onClick={handleAddRoutine}>ADICIONAR À ROTINA</button>
                  <button className="btn-secondary" style={{ marginTop: '10px', borderColor: '#4285F4', color: '#4285F4' }} onClick={handleExportICS}>
                    📤 EXPORTAR PARA .ICS (GOOGLE/OUTROS)
                  </button>
                </div>
              </div>

              <div>
                <h4 style={{ color: 'var(--text-dim)', marginBottom: '20px' }}>Atividades Cadastradas</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {(userProfile.routine || []).length === 0 && <p style={{ color: 'var(--text-dim)', textAlign: 'center', marginTop: '40px' }}>Nenhuma atividade.</p>}
                  {(userProfile.routine || []).sort((a,b) => a.startTime.localeCompare(b.startTime)).map(r => (
                    <div key={r.id} className="card" style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#fff' }}>{r.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                          {r.startTime} - {r.endTime} | {r.days.map(d => ['Dom','Seg','Ter','Qua','Qui','Sex','Sab'][d]).join(', ')}
                        </div>
                      </div>
                      <button onClick={() => handleRemoveRoutine(r.id)} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '16px' }}>×</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
      <div className="card" style={{ padding: '20px', overflowX: 'auto' }}>
        <div style={{ minWidth: '800px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '10px' }}>
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => <div key={d} style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--text-dim)', fontSize: '12px' }}>{d}</div>)}
          </div>
          {renderCells()}
        </div>
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
