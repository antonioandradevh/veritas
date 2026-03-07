import { useState } from 'react';
import { toast } from 'react-hot-toast';
import localforage from 'localforage';
import type { Subject } from '../App';
import PdfViewer from './PdfViewer';

export default function MaterialsView({ subjects, handleRemoveSubject, handleRemoveTopic, setSubjects }: { subjects: Subject[], handleRemoveSubject: (id: string) => void, handleRemoveTopic: (sid: string, tid: string) => void, setSubjects: React.Dispatch<React.SetStateAction<Subject[]>> }) {
  const [activeMaterial, setActiveMaterial] = useState<{ url: string; name: string } | null>(null);
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [tempTopicName, setTempTopicName] = useState('');

  const openMaterial = (url: string, name: string) => {
    setActiveMaterial({ url, name });
  };

  const closeMaterial = () => {
    setActiveMaterial(null);
  };

  const handleRemoveMaterial = async (sid: string, tid: string, mid: string) => {
    if (window.confirm('Excluir este arquivo permanentemente?')) {
      await localforage.removeItem(`pdf-${mid}`);
      setSubjects(prev => prev.map(s => s.id === sid ? {
        ...s, topics: s.topics.map(t => t.id === tid ? {
          ...t, materials: t.materials.filter(m => m.id !== mid)
        } : t)
      } : s));
      toast.success('Arquivo removido!');
    }
  };

  const handleAddMaterials = async (sid: string, tid: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newMaterials: any[] = [];
    for (const file of files) {
      const mId = crypto.randomUUID();
      try {
        const arrayBuffer = await file.arrayBuffer();
        await localforage.setItem(`pdf-${mId}`, arrayBuffer);
        newMaterials.push({ id: mId, name: file.name, url: `local-${mId}` });
      } catch { toast.error(`Erro ao salvar PDF: ${file.name}`); }
    }

    setSubjects(prev => prev.map(s => s.id === sid ? {
      ...s, topics: s.topics.map(t => t.id === tid ? {
        ...t, materials: [...(t.materials || []), ...newMaterials]
      } : t)
    } : s));

    e.target.value = '';
    toast.success(`${newMaterials.length} arquivo(s) adicionado(s)!`);
  };

  if (activeMaterial) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0f0f0f' }}>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <PdfViewer 
            url={activeMaterial.url} 
            materialId={subjects.flatMap(s => s.topics).flatMap(t => t.materials).find(m => m.url === activeMaterial.url)?.id}
            fileName={activeMaterial.name}
            onClose={closeMaterial}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="materials-view">
      <h1 style={{ marginBottom: '25px', fontSize: '32px', fontWeight: '800', background: 'linear-gradient(to right, #fff, var(--primary-light))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        Biblioteca de Apoio (Materiais)
      </h1>
      <p style={{ color: 'var(--text-dim)', marginBottom: '30px' }}>
        Acesse e revise seus PDFs e materiais livremente. Cada tópico pode conter múltiplos arquivos.
      </p>

      {subjects.length === 0 ? (
        <div className="card" style={{ padding: '50px', borderStyle: 'dashed', textAlign: 'center', color: 'var(--text-dim)' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>🗂️</div>
          <p>Você não possui materiais ou matérias cadastradas.</p>
          <p style={{ marginTop: '10px', fontSize: '14px' }}>Vá para o "Painel de Estudos" e configure seu Edital.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))' }}>
          {subjects.map(subject => (
            <div key={subject.id} className="card" style={{ padding: '25px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '15px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <h3 className="subject-name" style={{ color: 'var(--primary-light)', margin: 0 }}>{subject.name}</h3>
                  <div className="star-rating" style={{ display: 'flex', gap: '2px' }}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <span 
                        key={star} 
                        onClick={() => {
                          setSubjects(prev => prev.map(s => s.id === subject.id ? { ...s, rating: star } : s));
                          toast.success(`${subject.name} avaliado em ${star} estrelas!`);
                        }}
                        style={{ 
                          cursor: 'pointer', 
                          fontSize: '18px', 
                          color: star <= (subject.rating || 0) ? '#ffca28' : 'rgba(255,255,255,0.1)',
                          transition: '0.2s'
                        }}
                      >
                        {star <= (subject.rating || 0) ? '★' : '☆'}
                      </span>
                    ))}
                  </div>
                </div>
                <button onClick={() => handleRemoveSubject(subject.id)} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', opacity: 0.6 }}>
                  Excluir Matéria
                </button>
              </div>

              {subject.topics.length === 0 ? (
                <p style={{ fontSize: '14px', color: 'var(--text-dim)', textAlign: 'center' }}>Nenhum conteúdo vinculado.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {subject.topics.map(topic => (
                    <div key={topic.id} style={{ background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: (topic.materials && topic.materials.length > 0) ? '10px' : '0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                          {editingTopicId === topic.id ? (
                            <input 
                              autoFocus
                              className="modern-input"
                              style={{ padding: '2px 8px', fontSize: '12px', height: '24px', width: '200px' }}
                              value={tempTopicName}
                              onChange={e => setTempTopicName(e.target.value)}
                              onBlur={() => {
                                if (tempTopicName && tempTopicName !== topic.name) {
                                  setSubjects(prev => prev.map(s => s.id === subject.id ? {
                                    ...s, topics: s.topics.map(t => t.id === topic.id ? { ...t, name: tempTopicName } : t)
                                  } : s));
                                }
                                setEditingTopicId(null);
                              }}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  if (tempTopicName && tempTopicName !== topic.name) {
                                    setSubjects(prev => prev.map(s => s.id === subject.id ? {
                                      ...s, topics: s.topics.map(t => t.id === topic.id ? { ...t, name: tempTopicName } : t)
                                    } : s));
                                  }
                                  setEditingTopicId(null);
                                }
                              }}
                            />
                          ) : (
                            <span 
                              style={{ color: '#fff', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' }}
                              onClick={() => { setEditingTopicId(topic.id); setTempTopicName(topic.name); }}
                              title="Clique para renomear"
                            >
                              {topic.name} ✏️
                            </span>
                          )}
                          <label className="btn-secondary" style={{ padding: '4px 10px', fontSize: '10px', cursor: 'pointer', margin: 0 }}>
                            + ADICIONAR PDF
                            <input type="file" hidden accept=".pdf" multiple onChange={(e) => handleAddMaterials(subject.id, topic.id, e)} />
                          </label>
                        </div>
                        <button onClick={() => handleRemoveTopic(subject.id, topic.id)} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '11px' }}>
                          Remover Tópico
                        </button>
                      </div>
                      
                      {topic.materials && topic.materials.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {topic.materials.map(m => (
                            <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '8px' }}>
                              <span style={{ fontSize: '12px', color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>{m.name}</span>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <button 
                                  onClick={() => openMaterial(m.url, m.name)} 
                                  style={{ border: 'none', cursor: 'pointer', color: 'var(--success)', fontSize: '10px', background: 'rgba(0, 242, 255, 0.1)', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold' }}
                                >
                                  📖 LER
                                </button>
                                <button 
                                  onClick={() => handleRemoveMaterial(subject.id, topic.id, m.id)}
                                  style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '14px' }}
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{fontSize: '11px', color: 'var(--text-dim)'}}>Sem arquivos anexados.</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
