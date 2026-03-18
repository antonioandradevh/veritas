import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import localforage from 'localforage';
import './PdfViewer.css';

// Configuração do Worker do PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// @ts-ignore
const isElectron = typeof window !== 'undefined' && window.process && window.process.type;
// @ts-ignore
const ipc = isElectron ? window.require('electron').ipcRenderer : null;

interface PdfViewerProps {
  url: string;
  materialId?: string;
  initialPage?: number;
  fileName?: string;
  onClose?: () => void;
}

export interface PageStats {
  pageNumber: number;
  timeSpent: number;
}

export interface HighlightCategory {
  id: string;
  name: string;
  color: string;
}

export interface Highlight {
  id: string;
  pageNumber: number;
  text: string;
  categoryId: string;
  rects: { top: number; left: number; width: number; height: number }[];
}

export interface DocStudyData {
  pageStats: Record<number, PageStats>;
  lastPage: number;
  highlights?: Highlight[];
  categories?: HighlightCategory[];
}

const DEFAULT_CATEGORIES: HighlightCategory[] = [
  { id: '1', name: 'Legislação', color: '#ffeb3b' },
  { id: '2', name: 'Cai muito', color: '#ff5252' },
  { id: '3', name: 'Importante', color: '#b388ff' },
];

export default function PdfViewer({ url, materialId, initialPage, fileName, onClose }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pdfData, setPdfData] = useState<any>(null);
  const [scale, setScale] = useState(1.2);
  const [fullscreen, setFullscreen] = useState(false);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [categories, setCategories] = useState<HighlightCategory[]>(DEFAULT_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState<HighlightCategory | null>(DEFAULT_CATEGORIES[0]);
  const [showHighlightsSidebar, setShowHighlightsSidebar] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#ffffff');
  
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const activePageRef = useRef(1);
  const timerRef = useRef<number | null>(null);
  const docId = materialId || url.split('/').pop() || 'default-doc';

  // Auxiliar para detectar sobreposição de retângulos
  const checkOverlap = (rect1: any, rect2: any) => {
    return !(rect2.left > rect1.left + rect1.width || 
             rect2.left + rect2.width < rect1.left || 
             rect2.top > rect1.top + rect1.height ||
             rect2.top + rect2.height < rect1.top);
  };

  // Carrega o arquivo (local ou remoto) e dados salvos
  useEffect(() => {
    const loadPdf = async () => {
      try {
        let finalData: any = null;

        // Prioridade 1: Tentar carregar da pasta física se for Electron
        if (ipc && fileName) {
          const localData = await ipc.invoke('get-local-pdf', fileName);
          if (localData) {
            // Converte Buffer/Uint8Array para Blob URL para compatibilidade máxima
            const blob = new Blob([localData], { type: 'application/pdf' });
            finalData = URL.createObjectURL(blob);
          }
        }

        // Prioridade 2: Carregar do localforage se ainda não carregou
        if (!finalData && url.startsWith('local-')) {
          const data = await localforage.getItem<ArrayBuffer>(`pdf-${url.replace('local-', '')}`);
          if (data) {
            const blob = new Blob([data], { type: 'application/pdf' });
            finalData = URL.createObjectURL(blob);
          }
        }

        // Prioridade 3: URL remota
        if (!finalData) {
          finalData = url;
        }

        setPdfData(finalData);

        const saved = await localforage.getItem<DocStudyData>(`study-data-${docId}`);
        if (saved) {
          if (saved.highlights) setHighlights(saved.highlights);
          if (saved.categories) setCategories(saved.categories);
        }
      } catch (err) {
        console.error('Erro ao carregar PDF:', err);
        toast.error('Erro ao carregar o arquivo PDF');
      }
    };
    loadPdf();

    // Cleanup Blob URLs
    return () => {
      if (typeof pdfData === 'string' && pdfData.startsWith('blob:')) {
        URL.revokeObjectURL(pdfData);
      }
    };
  }, [url, docId, fileName]);

  // Salva highlights e categorias
  useEffect(() => {
    if (!numPages) return;
    const saveData = async () => {
      const saved = await localforage.getItem<DocStudyData>(`study-data-${docId}`) || { pageStats: {}, lastPage: 1 };
      await localforage.setItem(`study-data-${docId}`, { ...saved, highlights, categories });
    };
    saveData();
  }, [highlights, categories, docId, numPages]);

  // Cronômetro por página
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = window.setInterval(async () => {
      const p = activePageRef.current;
      if (!p) return;

      const saved = await localforage.getItem<DocStudyData>(`study-data-${docId}`) || { pageStats: {}, lastPage: 1 };
      if (!saved.pageStats[p]) saved.pageStats[p] = { pageNumber: p, timeSpent: 0 };
      saved.pageStats[p].timeSpent += 1;
      saved.lastPage = p;
      await localforage.setItem(`study-data-${docId}`, saved);
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [docId]);

  // Detector de página ativa via Scroll (Intersection Observer)
  useEffect(() => {
    if (!numPages) return;
    const obs = new IntersectionObserver(entries => {
      let best = { r: 0, p: activePageRef.current };
      entries.forEach(e => {
        if (e.intersectionRatio > best.r)
          best = { r: e.intersectionRatio, p: +(e.target as HTMLElement).dataset.page! };
      });
      if (best.p) activePageRef.current = best.p;
    }, { threshold: [0.1, 0.5] });
    Object.values(pageRefs.current).forEach(el => el && obs.observe(el));
    return () => obs.disconnect();
  }, [numPages]);

  // Scroll automático
  useEffect(() => {
    if (numPages > 0) {
      if (initialPage) {
        setTimeout(() => {
          pageRefs.current[initialPage]?.scrollIntoView({ behavior: 'smooth' });
        }, 800);
      } else {
        localforage.getItem<DocStudyData>(`study-data-${docId}`).then(saved => {
          if (saved && saved.lastPage && saved.lastPage > 1) {
            setTimeout(() => {
              pageRefs.current[saved.lastPage]?.scrollIntoView({ behavior: 'smooth' });
              toast.success(`Retomando da página ${saved.lastPage}`, { icon: '📖', duration: 2000, position: 'bottom-center' });
            }, 800);
          }
        });
      }
    }
  }, [numPages, initialPage, docId]);

  const handleMouseUp = (pageNumber: number) => {
    if (!selectedCategory) return; // Modo "Nenhum" ativado

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.toString().trim() === '') return;

    const range = selection.getRangeAt(0);
    const text = selection.toString();
    const pageEl = pageRefs.current[pageNumber];
    if (!pageEl) return;

    const pageRect = pageEl.getBoundingClientRect();
    const newRects = Array.from(range.getClientRects()).map(r => ({
      top: (r.top - pageRect.top) / scale,
      left: (r.left - pageRect.left) / scale,
      width: r.width / scale,
      height: r.height / scale,
    }));

    // Verifica sobreposição com grifos existentes nesta página
    const pageHighlights = highlights.filter(h => h.pageNumber === pageNumber);
    const hasOverlap = pageHighlights.some(h => 
      h.rects.some(existingRect => 
        newRects.some(newRect => checkOverlap(existingRect, newRect))
      )
    );

    if (hasOverlap) {
      selection.removeAllRanges();
      toast.error('O grifo não pode sobrepor outro!', { duration: 2000 });
      return;
    }

    const newHighlight: Highlight = {
      id: crypto.randomUUID(),
      pageNumber,
      text,
      categoryId: selectedCategory.id,
      rects: newRects,
    };

    setHighlights(prev => [...prev, newHighlight]);
    selection.removeAllRanges();
    toast.success('Grifo adicionado!', { duration: 1000 });
  };

  const removeHighlight = (id: string) => {
    setHighlights(prev => prev.filter(h => h.id !== id));
    toast.success('Grifo removido');
  };

  const addCategory = () => {
    if (!newCatName) return;
    const newCat = { id: crypto.randomUUID(), name: newCatName, color: newCatColor };
    setCategories(prev => [...prev, newCat]);
    setSelectedCategory(newCat);
    setNewCatName('');
    setIsAddingCategory(false);
  };

  useEffect(() => {
    const handler = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const toggleFullscreen = async () => {
    if (!wrapperRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await wrapperRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) { console.error(err); }
  };

  return (
    <div ref={wrapperRef} className="pdf-study-container" style={{ height: '100%', display: 'flex', background: '#0f0f0f', overflow: 'hidden' }}>
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Barra de Ferramentas */}
        <div style={{ padding: '12px 20px', background: '#1a1a1a', display: 'flex', gap: '15px', alignItems: 'center', borderBottom: '1px solid #333', zIndex: 10 }}>
          <div style={{ display: 'flex', gap: '5px' }}>
            <button className="btn-secondary" style={{ padding: '6px 12px' }} onClick={() => setScale(s => Math.min(3, s + 0.1))}>+</button>
            <button className="btn-secondary" style={{ padding: '6px 12px' }} onClick={() => setScale(s => Math.max(0.5, s - 0.1))}>−</button>
          </div>
          <span style={{ fontSize: '12px', color: '#888' }}>{Math.round(scale * 100)}%</span>
          
          <div style={{ width: '1px', height: '24px', background: '#333', margin: '0 10px' }} />
          
          {/* Seletor de Legenda */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: '#666', fontWeight: 'bold' }}>GRIFAR COMO:</span>
            <button 
              onClick={() => setSelectedCategory(null)}
              style={{ 
                padding: '4px 10px', 
                fontSize: '11px', 
                borderRadius: '4px', 
                background: selectedCategory === null ? '#fff' : '#222',
                color: selectedCategory === null ? '#000' : '#888',
                border: `1px solid ${selectedCategory === null ? '#fff' : '#333'}`,
                cursor: 'pointer',
                fontWeight: 'bold',
                transition: '0.2s'
              }}
            >
              NENHUM
            </button>
            {categories.map(cat => (
              <button 
                key={cat.id}
                onClick={() => setSelectedCategory(cat)}
                style={{ 
                  padding: '4px 10px', 
                  fontSize: '11px', 
                  borderRadius: '4px', 
                  background: selectedCategory?.id === cat.id ? cat.color : '#222',
                  color: selectedCategory?.id === cat.id ? '#000' : '#888',
                  border: `1px solid ${selectedCategory?.id === cat.id ? cat.color : '#333'}`,
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  transition: '0.2s'
                }}
              >
                {cat.name}
              </button>
            ))}
            <button 
              onClick={() => setIsAddingCategory(true)}
              style={{ background: 'transparent', border: '1px dashed #444', color: '#666', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
            >+ NOVA</button>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: '15px', alignItems: 'center' }}>
            <button 
              onClick={() => setShowHighlightsSidebar(!showHighlightsSidebar)}
              className="btn-secondary" 
              style={{ padding: '6px 12px', fontSize: '11px', borderColor: highlights.length > 0 ? 'var(--primary)' : '#333' }}
            >
              📑 MEUS GRIFOS ({highlights.length})
            </button>
            <span style={{ fontSize: '11px', color: '#666' }}>Pág {activePageRef.current} / {numPages}</span>
            <button style={{ padding: '6px 12px', fontSize: '13px' }} className="btn-secondary" onClick={toggleFullscreen}>{fullscreen ? '🗗' : '⛶'}</button>
          </div>
        </div>
        
        {/* Área do PDF */}
        <div ref={containerRef} className="pdf-scroll-area" style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#141414' }}>
          <Document
            file={pdfData}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            loading={<div style={{color: '#666', padding: '50px'}}>Carregando PDF...</div>}
          >
            {Array.from({ length: numPages }, (_, i) => i + 1).map(page => (
              <div 
                key={page} 
                data-page={page} 
                ref={(el) => { if (el) pageRefs.current[page] = el; }}
                onMouseUp={() => handleMouseUp(page)}
                style={{ marginBottom: '20px', boxShadow: '0 4px 24px rgba(0,0,0,0.7)', lineHeight: 0, position: 'relative' }}
              >
                <Page pageNumber={page} scale={scale} renderTextLayer={true} renderAnnotationLayer={true} loading="" />
                
                {/* Overlay de Grifos */}
                <div style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', width: '100%', height: '100%' }}>
                  {highlights.filter(h => h.pageNumber === page).map(h => {
                    const cat = categories.find(c => c.id === h.categoryId) || DEFAULT_CATEGORIES[0];
                    return h.rects.map((r, i) => (
                      <div 
                        key={`${h.id}-${i}`}
                        style={{
                          position: 'absolute',
                          top: r.top * scale,
                          left: r.left * scale,
                          width: r.width * scale,
                          height: r.height * scale,
                          backgroundColor: cat.color,
                          opacity: 0.6,
                          mixBlendMode: 'multiply'
                        }}
                      />
                    ));
                  })}
                </div>
              </div>
            ))}
          </Document>
        </div>

        {onClose && (
          <div style={{ padding: '10px 20px', display: 'flex', justifyContent: 'space-between', background: '#1a1a1a', borderTop: '1px solid #333', alignItems: 'center' }}>
            <button onClick={onClose} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '11px', fontWeight: 'bold' }}>⬅ VOLTAR À BIBLIOTECA</button>
            <span style={{ fontSize: '11px', color: '#666', fontWeight: 'bold', maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileName || 'Material'}</span>
          </div>
        )}
      </div>

      {/* Sidebar de Grifos e Legendas */}
      {showHighlightsSidebar && (
        <div style={{ width: '350px', background: '#111', borderLeft: '1px solid #333', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ color: '#fff', fontSize: '16px', margin: 0 }}>📌 Resumo de Grifos</h3>
            <button onClick={() => setShowHighlightsSidebar(false)} style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', fontSize: '20px' }}>×</button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
            <h4 style={{ color: 'var(--primary-light)', fontSize: '12px', marginBottom: '15px', textTransform: 'uppercase' }}>Legendas Ativas</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '30px' }}>
              {categories.map(cat => (
                <div key={cat.id} style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '6px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: cat.color }} />
                  <span style={{ fontSize: '13px', color: '#fff', flex: 1 }}>{cat.name}</span>
                </div>
              ))}
            </div>

            <h4 style={{ color: 'var(--primary-light)', fontSize: '12px', marginBottom: '15px', textTransform: 'uppercase' }}>Grifos por Página</h4>
            {highlights.length === 0 ? (
              <p style={{ color: '#444', textAlign: 'center', marginTop: '40px', fontSize: '13px' }}>Selecione um texto no PDF para grifar.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {highlights.sort((a,b) => a.pageNumber - b.pageNumber).map(h => {
                  const cat = categories.find(c => c.id === h.categoryId) || DEFAULT_CATEGORIES[0];
                  return (
                    <div 
                      key={h.id} 
                      className="card" 
                      style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${cat.color}22`, cursor: 'pointer' }}
                      onClick={() => pageRefs.current[h.pageNumber]?.scrollIntoView({ behavior: 'smooth' })}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '10px', background: cat.color, color: '#000', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>{cat.name}</span>
                        <span style={{ fontSize: '10px', color: '#666' }}>Pág {h.pageNumber}</span>
                      </div>
                      <p style={{ fontSize: '12px', color: '#ccc', margin: 0, fontStyle: 'italic', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        "{h.text}"
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <button 
                          onClick={(e) => { e.stopPropagation(); removeHighlight(h.id); }}
                          className="btn-remove-highlight"
                          style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', fontSize: '10px', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                          🗑️ EXCLUIR GRIFO
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Nova Legenda */}
      {isAddingCategory && (
        <div className="onboarding-overlay" style={{ zIndex: 5000 }}>
          <div className="onboarding-window" style={{ width: '380px', padding: '40px' }}>
            <h3 style={{ color: '#fff', marginBottom: '20px' }}>Nova Legenda</h3>
            <input 
              className="modern-input" 
              placeholder="Nome da Legenda" 
              value={newCatName} 
              onChange={e => setNewCatName(e.target.value)} 
              style={{ marginBottom: '15px' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '25px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-dim)' }}>Cor:</span>
              <input type="color" value={newCatColor} onChange={e => setNewCatColor(e.target.value)} style={{ width: '100%', height: '40px', border: 'none', background: 'none', cursor: 'pointer' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button className="btn-start" style={{ width: '100%' }} onClick={addCategory}>ADICIONAR</button>
              <button className="btn-secondary" style={{ width: '100%' }} onClick={() => setIsAddingCategory(false)}>CANCELAR</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
