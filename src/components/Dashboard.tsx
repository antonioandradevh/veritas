import { useState, useRef, useMemo, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import localforage from 'localforage';
import type { Subject, Task, CycleConfig, TopicMaterial } from '../App';
import PdfThumbnail from './PdfThumbnail';

interface DashboardProps {
  subjects: Subject[];
  onStartTask: (task: Task, initialPage?: number, materialUrl?: string) => void;
  setSubjects: React.Dispatch<React.SetStateAction<Subject[]>>;
  cycleConfig: CycleConfig;
  setCycleConfig: React.Dispatch<React.SetStateAction<CycleConfig>>;
}

export default function Dashboard({ 
  subjects = [], 
  onStartTask, 
  setSubjects, 
  cycleConfig,
  setCycleConfig 
}: DashboardProps) {
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newTopicName, setNewTopicName] = useState('');
  const [viewingSubjectId, setViewingSubjectId] = useState<string | null>(null);
  const [materialFiles, setMaterialFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getSubjectRank = (subject: Subject) => {
    if (!subject) return { tier: 'Iniciante', rank: 'III', className: 'bronze', xp: 0, nextXp: 1000, minXp: 0 };
    const totalMinutes = (subject.topics || []).reduce((acc, t) => acc + (t.minutesSpent || 0), 0);
    const totalCorrect = (subject.topics || []).reduce((acc, t) => acc + (t.questionsCorrect || 0), 0);
    const xp = (totalMinutes * 1.66) + (totalCorrect * 10); // Ajustado xp por minuto

    const ranks = [
      { tier: 'Iniciante', rank: 'III', minXp: 0, className: 'bronze' },
      { tier: 'Iniciante', rank: 'II', minXp: 1000, className: 'bronze' },
      { tier: 'Iniciante', rank: 'I', minXp: 2000, className: 'bronze' },
      { tier: 'Básico', rank: 'III', minXp: 3000, className: 'prata' },
      { tier: 'Básico', rank: 'II', minXp: 4000, className: 'prata' },
      { tier: 'Básico', rank: 'I', minXp: 5000, className: 'prata' },
      { tier: 'Competitivo', rank: 'III', minXp: 6800, className: 'ouro' },
      { tier: 'Competitivo', rank: 'II', minXp: 8500, className: 'ouro' },
      { tier: 'Competitivo', rank: 'I', minXp: 10000, className: 'ouro' },
      { tier: 'Intermediário', rank: 'III', minXp: 13000, className: 'platina' },
      { tier: 'Intermediário', rank: 'II', minXp: 16000, className: 'platina' },
      { tier: 'Intermediário', rank: 'I', minXp: 20000, className: 'platina' },
      { tier: 'Avançado', rank: 'III', minXp: 25000, className: 'diamante' },
      { tier: 'Avançado', rank: 'II', minXp: 30000, className: 'diamante' },
      { tier: 'Avançado', rank: 'I', minXp: 35000, className: 'diamante' },
      { tier: 'Especialista', rank: '', minXp: 40000, className: 'mestre' },
      { tier: 'Mestre da Aprovação', rank: '', minXp: 50000, className: 'desafiante' }
    ];

    let currentRank = ranks[0];
    let nextRankXp = 1000;

    for (let i = 0; i < ranks.length; i++) {
      if (xp >= ranks[i].minXp) {
        currentRank = ranks[i];
        nextRankXp = ranks[i+1] ? ranks[i+1].minXp : xp;
      } else {
        break;
      }
    }

    return { ...currentRank, xp, nextXp: nextRankXp };
  };

  const currentCycleDay = cycleConfig.currentDay || 1;

  const activeSubjectsToday = useMemo(() => {
    if (!currentCycleDay || !cycleConfig || !cycleConfig.schedule) return [];
    return cycleConfig.schedule[currentCycleDay.toString()] || [];
  }, [currentCycleDay, cycleConfig]);

  const handleFinishDay = () => {
    const nextDay = (currentCycleDay % (cycleConfig.numDays || 10)) + 1;
    setCycleConfig(prev => ({ ...prev, currentDay: nextDay }));
    toast.success(`📅 Dia ${currentCycleDay} concluído!`);
  };

  const subjectsToday = useMemo(() => 
    (subjects || []).filter(s => activeSubjectsToday.includes(s.name)), 
    [subjects, activeSubjectsToday]
  );

  const otherSubjects = useMemo(() => 
    (subjects || []).filter(s => !activeSubjectsToday.includes(s.name)), 
    [subjects, activeSubjectsToday]
  );

  const [subjectPdfStats, setSubjectPdfStats] = useState<{ name: string, url: string, topic: any, densityRank: { page: number, score: number }[] }[]>([]);

  const viewingSubject = useMemo(() => 
    subjects.find(s => s.id === viewingSubjectId), 
    [subjects, viewingSubjectId]
  );

  useEffect(() => {
    const loadSubjectPdfStats = async () => {
      if (!viewingSubject) return;
      try {
        const keys = await localforage.keys();
        const studyKeys = keys.filter(k => k.startsWith('study-data-'));
        const stats: any[] = [];

        for (const key of studyKeys) {
          const materialId = key.replace('study-data-', '');
          
          let foundMaterial: TopicMaterial | null = null;
          let foundTopic: any = null;

          viewingSubject.topics.forEach(t => {
            const m = (t.materials || []).find(mat => mat.id === materialId);
            if (m) {
              foundMaterial = m;
              foundTopic = t;
            }
          });
          
          if (foundMaterial && foundTopic) {
            const data: any = await localforage.getItem(key);
            if (data && data.pageStats) {
              const densityRank = Object.values(data.pageStats)
                .map((ps: any) => {
                  // Densidade = tempo + grifos
                  const hCount = (data.highlights || []).filter((h: any) => h.position.pageNumber === ps.pageNumber).length;
                  return {
                    page: ps.pageNumber,
                    score: ps.timeSpent + (30 * hCount)
                  };
                })
                .sort((a, b) => b.score - a.score)
                .slice(0, 5);

              stats.push({ 
                name: (foundMaterial as TopicMaterial).name, 
                url: (foundMaterial as TopicMaterial).url,
                topic: foundTopic,
                densityRank 
              });
            }
          }
        }
        setSubjectPdfStats(stats);
      } catch (e) { console.error('Error loading subject PDF stats', e); }
    };
    loadSubjectPdfStats();
  }, [viewingSubjectId, subjects]);

  const handleAddSubject = () => {
    if (!newSubjectName) {
      toast.error('Dê um nome à matéria!');
      return;
    }
    setSubjects(prev => [...(prev || []), { id: Date.now().toString(), name: newSubjectName, topics: [] }]);
    setNewSubjectName('');
    toast.success(`Matéria ${newSubjectName} adicionada!`);
  };

  const handleAddTopic = async () => {
    const targetSid = viewingSubjectId;
    if (!newTopicName || !targetSid) {
      toast.error('Preencha os campos obrigatórios!');
      return;
    }
    const topicId = Date.now().toString();
    
    const materials: { id: string, name: string, url: string }[] = [];
    if (materialFiles.length > 0) {
      toast.loading('Salvando materiais...', { id: 'upload' });
      for (const file of materialFiles) {
        const mId = crypto.randomUUID();
        try {
          const arrayBuffer = await file.arrayBuffer();
          await localforage.setItem(`pdf-${mId}`, arrayBuffer);
          materials.push({ id: mId, name: file.name, url: `local-${mId}` });
        } catch { toast.error(`Erro ao salvar PDF: ${file.name}`); }
      }
      toast.success('Materiais salvos!', { id: 'upload' });
    }

    setSubjects(prev => (prev || []).map(s => s.id === targetSid ? {
      ...s, topics: [...(s.topics || []), { id: topicId, name: newTopicName, status: 'todo', minutesSpent: 0, questionsDone: 0, questionsCorrect: 0, materials }]
    } : s));
    
    setNewTopicName('');
    setMaterialFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    toast.success('Tópico adicionado ao edital!');
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setMaterialFiles(Array.from(e.target.files));
    }
  };

  const [selectingMaterialForTopic, setSelectingMaterialForTopic] = useState<any | null>(null);

  const handleRemoveSubject = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Excluir esta disciplina e todos os seus dados permanentemente?')) {
      setSubjects(prev => prev.filter(s => s.id !== id));
      toast.success('Disciplina removida!');
    }
  };

  const handleRemoveTopic = (e: React.MouseEvent, tid: string) => {
    e.stopPropagation();
    if (window.confirm('Excluir este tópico permanentemente?')) {
      setSubjects(prev => prev.map(s => s.id === viewingSubjectId ? {
        ...s, topics: s.topics.filter(t => t.id !== tid)
      } : s));
      toast.success('Tópico removido!');
    }
  };

  const [draggedTopicId, setDraggedTopicId] = useState<string | null>(null);

  const handleDragStart = (tid: string) => {
    setDraggedTopicId(tid);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetTid: string) => {
    if (!draggedTopicId || draggedTopicId === targetTid) return;

    setSubjects(prev => prev.map(s => {
      if (s.id !== viewingSubjectId) return s;
      
      const newTopics = [...s.topics];
      const draggedIdx = newTopics.findIndex(t => t.id === draggedTopicId);
      const targetIdx = newTopics.findIndex(t => t.id === targetTid);
      
      const [removed] = newTopics.splice(draggedIdx, 1);
      newTopics.splice(targetIdx, 0, removed);
      
      return { ...s, topics: newTopics };
    }));
    
    setDraggedTopicId(null);
  };

  const handleStatusUpdate = (e: React.MouseEvent, tid: string, newStatus: 'todo' | 'completed') => {
    e.stopPropagation();
    setSubjects(prev => prev.map(s => s.id === viewingSubjectId ? {
      ...s, topics: s.topics.map(t => t.id === tid ? { ...t, status: newStatus } : t)
    } : s));
    toast.success(newStatus === 'completed' ? 'Tópico marcado como dominado! 🏆' : 'Estudo reiniciado!');
  };

  const handleInitiateStudy = (topic: any) => {
    if (topic.materials && topic.materials.length > 1) {
      setSelectingMaterialForTopic(topic);
    } else {
      const matUrl = topic.materials && topic.materials.length > 0 ? topic.materials[0].url : '';
      onStartTask({
        id: `task-${topic.id}`,
        subjectId: viewingSubject!.id,
        subjectName: viewingSubject!.name,
        topic: topic,
        type: topic.status === 'todo' ? 'Teoria e Fixação' : 'Domínio e Mapeamento'
      }, undefined, matUrl);
    }
  };

  const renderSubjectCard = (subject: Subject, isToday: boolean) => {
    const rankInfo = getSubjectRank(subject);
    const totalCorrect = (subject.topics || []).reduce((acc, t) => acc + (t.questionsCorrect || 0), 0);
    const totalMinutes = (subject.topics || []).reduce((acc, t) => acc + (t.minutesSpent || 0), 0);
    
    // Progresso de XP: xp atual / xp do próximo nível
    const xpPercent = rankInfo.nextXp > rankInfo.xp 
      ? ((rankInfo.xp - rankInfo.minXp) / (rankInfo.nextXp - rankInfo.minXp)) * 100 
      : 100;

    return (
      <div 
        key={subject.id} 
        className="card" 
        onClick={() => setViewingSubjectId(subject.id)}
        style={{ 
          padding: '28px', 
          cursor: 'pointer',
          border: isToday ? '2px solid var(--primary)' : '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '220px',
          position: 'relative',
          transition: 'all 0.3s ease',
          background: isToday 
            ? 'linear-gradient(145deg, var(--bg-surface) 0%, rgba(138, 43, 226, 0.05) 100%)' 
            : 'var(--bg-surface)',
          opacity: isToday ? 1 : 0.7
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'translateY(-5px)';
          e.currentTarget.style.opacity = '1';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.opacity = isToday ? '1' : '0.7';
        }}
      >
        {!isToday && (
          <button 
            onClick={(e) => handleRemoveSubject(e, subject.id)}
            className="btn-remove-x"
            style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '20px', fontWeight: 'bold', opacity: 0.5, zIndex: 10 }}
            title="Remover Disciplina"
          >×</button>
        )}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <span className={`badge ${rankInfo.className}`} style={{ fontSize: '10px', padding: '4px 10px' }}>
              {rankInfo.tier} {rankInfo.rank}
            </span>
            {isToday && (
              <span style={{ 
                color: 'var(--primary-light)', 
                fontSize: '10px', 
                fontWeight: 'bold', 
                background: 'rgba(138, 43, 226, 0.1)',
                padding: '4px 8px',
                borderRadius: '6px'
              }}>OBJETIVO DO DIA 🎯</span>
            )}
          </div>
          
          <h3 style={{ fontSize: '22px', color: '#fff', marginBottom: '12px', fontWeight: '800' }}>{subject.name}</h3>
          
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-dim)', marginBottom: '6px' }}>
              <span>Evolução de Nível</span>
              <span style={{ color: 'var(--primary-light)', fontWeight: 'bold' }}>{Math.round(rankInfo.xp)} XP</span>
            </div>
            <div className="progress-bar" style={{ height: '6px', background: 'rgba(255,255,255,0.03)' }}>
              <div className="progress-fill" style={{ width: `${xpPercent}%`, background: 'linear-gradient(90deg, var(--primary) 0%, var(--accent) 100%)' }}></div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '15px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', gap: '15px' }}>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '9px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Tempo</div>
              <div style={{ fontSize: '14px', color: '#fff', fontWeight: 'bold' }}>{totalMinutes} min</div>
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '9px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Acertos</div>
              <div style={{ fontSize: '14px', color: 'var(--success)', fontWeight: 'bold' }}>{totalCorrect}</div>
            </div>
          </div>
          <div style={{ color: 'var(--primary-light)', fontSize: '12px', fontWeight: 'bold' }}>
            {subject.topics.length} Tópicos →
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="dashboard">
      {selectingMaterialForTopic && (
        <div className="onboarding-overlay" style={{ zIndex: 3000 }}>
          <div className="onboarding-window" style={{ width: '800px', padding: '40px' }}>
            <h2 style={{ color: '#fff', marginBottom: '10px' }}>Escolha o Material de Estudo</h2>
            <p style={{ color: 'var(--text-dim)', marginBottom: '30px' }}>{selectingMaterialForTopic.name}</p>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', 
              gap: '20px', 
              maxHeight: '450px', 
              overflowY: 'auto', 
              marginBottom: '30px', 
              textAlign: 'left',
              padding: '10px'
            }}>
              {selectingMaterialForTopic.materials.map((m: any) => (
                <div 
                  key={m.id} 
                  className="card" 
                  onClick={() => {
                    onStartTask({
                      id: `task-${selectingMaterialForTopic.id}`,
                      subjectId: viewingSubject!.id,
                      subjectName: viewingSubject!.name,
                      topic: selectingMaterialForTopic,
                      type: selectingMaterialForTopic.status === 'todo' ? 'Teoria e Fixação' : 'Domínio e Mapeamento'
                    }, undefined, m.url);
                    setSelectingMaterialForTopic(null);
                  }}
                  style={{ 
                    padding: '15px', 
                    cursor: 'pointer', 
                    border: '1px solid rgba(255,255,255,0.1)', 
                    background: 'rgba(255,255,255,0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    transition: '0.2s'
                  }}
                  onMouseOver={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                  onMouseOut={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                >
                  <div style={{ height: '180px', width: '100%' }}>
                    <PdfThumbnail url={m.url} scale={0.4} />
                  </div>
                  <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    📄 {m.name}
                  </span>
                </div>
              ))}
            </div>
            <button className="btn-secondary" style={{ width: '100%' }} onClick={() => setSelectingMaterialForTopic(null)}>CANCELAR</button>
          </div>
        </div>
      )}
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px'}}>
        <div>
          <h1 style={{fontSize: '36px', fontWeight: '900', color: '#fff'}}>
            {viewingSubject ? `📖 ${viewingSubject.name}` : "🛡️ Painel de Estudos"}
          </h1>
          <p style={{ color: 'var(--primary-light)', fontWeight: 'bold', marginTop: '5px' }}>
            {viewingSubject ? "DETALHAMENTO DO EDITAL" : `DIA ${currentCycleDay} DO CICLO`}
          </p>
        </div>
        <div style={{textAlign: 'right', display: 'flex', gap: '15px'}}>
          {viewingSubject ? (
            <>
              <button 
                className="btn-secondary" 
                style={{ color: 'var(--danger)', borderColor: 'rgba(244, 67, 54, 0.3)' }}
                onClick={(e) => {
                  handleRemoveSubject(e, viewingSubject.id);
                  setViewingSubjectId(null);
                }}
              >
                APAGAR DISCIPLINA
              </button>
              <button className="btn-secondary" onClick={() => setViewingSubjectId(null)}>⬅ VOLTAR AO PAINEL</button>
            </>
          ) : (
            <div style={{ display: 'flex', gap: '15px' }}>
              <button className="btn-secondary" onClick={() => setCycleConfig(prev => ({ ...prev, currentDay: Math.max(1, currentCycleDay - 1) }))}>⏪ VOLTAR</button>
              <button className="btn-start" style={{ background: 'var(--success)' }} onClick={handleFinishDay}>CONCLUIR DIA ✅</button>
            </div>
          )}
        </div>
      </div>

      {!viewingSubject ? (
        <>
          {/* SEÇÃO: METAS DO DIA */}
          <h2 style={{ fontSize: '18px', color: 'var(--primary-light)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>🎯</span> METAS DE HOJE
          </h2>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
            gap: '24px', 
            marginBottom: '50px' 
          }}>
            {subjectsToday.length > 0 ? subjectsToday.map(s => renderSubjectCard(s, true)) : (
              <div style={{ gridColumn: '1/-1', padding: '30px', background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px dashed rgba(255,255,255,0.1)', textAlign: 'center', color: 'var(--text-dim)' }}>
                Nenhuma matéria escalada para hoje.
              </div>
            )}
          </div>

          {/* SEÇÃO: ACERVO GERAL */}
          <h2 style={{ fontSize: '18px', color: '#fff', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>📚</span> ACERVO DE DISCIPLINAS
          </h2>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
            gap: '24px', 
            marginBottom: '60px' 
          }}>
            {otherSubjects.map(s => renderSubjectCard(s, false))}
          </div>

          {/* GESTÃO EXTERNA: APENAS NOVAS MATÉRIAS */}
          <div className="card" style={{ padding: '40px', background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.03)' }}>
            <h3 style={{ color: '#fff', fontSize: '24px', marginBottom: '20px', fontWeight: '900' }}>🛠️ Gestão de Disciplinas</h3>
            <div style={{ display: 'flex', gap: '12px' }}>
              <input 
                className="modern-input" 
                placeholder="Nome da Nova Disciplina (ex: Direito Penal)" 
                value={newSubjectName} 
                onChange={e => setNewSubjectName(e.target.value)} 
                style={{ flex: 1 }}
              />
              <button className="btn-secondary" style={{ padding: '0 40px' }} onClick={handleAddSubject}>ADICIONAR MATÉRIA</button>
            </div>
          </div>
        </>
      ) : (
        // VISÃO DETALHADA DOS TÓPICOS
        <>
          <div className="card" style={{ marginBottom: '30px', padding: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-dim)', marginBottom: '10px' }}>
                <span>Domínio do Edital</span>
                <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>
                  {Math.round((viewingSubject.topics.filter(t => t.status === 'completed').length / (viewingSubject.topics.length || 1)) * 100)}% concluído
                </span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${(viewingSubject.topics.filter(t => t.status === 'completed').length / (viewingSubject.topics.length || 1)) * 100}%`, background: 'var(--success)' }}></div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '60px' }}>
            {viewingSubject.topics.length > 0 ? viewingSubject.topics.map((topic, index) => (
              <div 
                key={topic.id} 
                className="card" 
                draggable
                onDragStart={() => handleDragStart(topic.id)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(topic.id)}
                style={{ 
                  padding: '24px', 
                  display: 'grid', 
                  gridTemplateColumns: 'auto 1fr auto', 
                  gap: '20px',
                  alignItems: 'center',
                  background: draggedTopicId === topic.id ? 'rgba(138, 43, 226, 0.1)' : 'linear-gradient(90deg, var(--bg-surface) 0%, rgba(255,255,255,0.02) 100%)',
                  border: draggedTopicId === topic.id ? '2px dashed var(--primary)' : '1px solid rgba(255,255,255,0.05)',
                  position: 'relative',
                  cursor: 'grab'
                }}
              >
                <div style={{ color: 'var(--text-dim)', fontSize: '20px', cursor: 'grab' }}>⣿</div>
                <div>
                  <h4 style={{ color: '#fff', fontSize: '19px', marginBottom: '8px', fontWeight: '700' }}>{topic.name}</h4>
                  <div style={{ display: 'flex', gap: '25px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ fontSize: '14px' }}>⏱️</span>
                      <span style={{ fontSize: '13px', color: 'var(--text-dim)' }}>{Math.round(topic.minutesSpent || 0)} min estudados</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ fontSize: '14px' }}>✅</span>
                      <span style={{ fontSize: '13px', color: 'var(--text-dim)' }}>{topic.questionsCorrect} acertos</span>
                    </div>
                    <div style={{ 
                      padding: '4px 12px', 
                      borderRadius: '20px', 
                      fontSize: '11px', 
                      fontWeight: 'bold',
                      background: topic.status === 'completed' ? 'rgba(0, 230, 118, 0.1)' : 'rgba(138, 43, 226, 0.1)',
                      color: topic.status === 'completed' ? '#00e676' : 'var(--primary-light)',
                      border: `1px solid ${topic.status === 'completed' ? 'rgba(0, 230, 118, 0.2)' : 'rgba(138, 43, 226, 0.2)'}`
                    }}>
                      {topic.status === 'completed' ? 'CONCLUÍDO' : topic.status === 'base_done' ? 'REVISÃO ATIVA' : 'PENDENTE'}
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <button 
                    onClick={(e) => handleRemoveTopic(e, topic.id)}
                    className="btn-remove-x"
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold', opacity: 0.4, marginRight: '10px' }}
                    title="Remover Tópico"
                  >×</button>
                  
                  {topic.status === 'completed' ? (
                    <button 
                      className="btn-secondary" 
                      style={{ padding: '14px 20px', fontSize: '13px', borderColor: 'var(--primary-light)' }}
                      onClick={(e) => handleStatusUpdate(e, topic.id, 'todo')}
                    >
                      REINICIAR ESTUDO ↺
                    </button>
                  ) : (
                    <button 
                      className="btn-secondary" 
                      style={{ padding: '14px 20px', fontSize: '13px', borderColor: 'var(--success)', color: 'var(--success)' }}
                      onClick={(e) => handleStatusUpdate(e, topic.id, 'completed')}
                    >
                      DOMINEI! 🏆
                    </button>
                  )}
                  
                  <button 
                    className="btn-start" 
                    style={{ padding: '14px 30px', fontSize: '14px' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleInitiateStudy(topic);
                    }}
                  >
                    INICIAR ESTUDO 📖
                  </button>
                </div>
              </div>
            )) : (
              <div className="card" style={{ padding: '60px', textAlign: 'center', border: '2px dashed rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '48px', marginBottom: '20px' }}>📄</div>
                <h3 style={{ color: 'var(--text-dim)' }}>Não há tópicos neste edital.</h3>
              </div>
            )}
          </div>

          {/* GESTÃO INTERNA: APENAS NOVAS TÓPICOS */}
          <div className="card" style={{ padding: '40px', background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.03)' }}>
            <h3 style={{ color: '#fff', fontSize: '24px', marginBottom: '20px', fontWeight: '900' }}>🛠️ Novo Tópico para {viewingSubject.name}</h3>
            <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <input 
                  className="modern-input" 
                  placeholder="Nome do Novo Tópico (ex: Atos Administrativos)" 
                  value={newTopicName} 
                  onChange={e => setNewTopicName(e.target.value)} 
                  style={{ flex: 1 }}
                />
                <button className="btn-start" style={{ padding: '0 40px' }} onClick={handleAddTopic}>CADASTRAR TÓPICO</button>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <label className="btn-secondary" style={{ cursor: 'pointer', padding: '10px 20px', fontSize: '13px' }}>
                  📎 ANEXAR MATERIAIS (PDF)
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    hidden 
                    accept=".pdf" 
                    multiple 
                    onChange={onFileChange} 
                  />
                </label>
                <span style={{ fontSize: '13px', color: 'var(--text-dim)' }}>
                  {materialFiles.length > 0 ? `${materialFiles.length} arquivo(s) selecionado(s)` : 'Nenhum arquivo selecionado'}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
