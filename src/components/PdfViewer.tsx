import { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import localforage from 'localforage';
import './PdfViewer.css';

// Configuração do Worker do PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

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

export interface DocStudyData {
  pageStats: Record<number, PageStats>;
  lastPage: number;
}

export default function PdfViewer({ url, materialId, initialPage, fileName, onClose }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pdfData, setPdfData] = useState<any>(null);
  const [scale, setScale] = useState(1.2);
  const [fullscreen, setFullscreen] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const activePageRef = useRef(1);
  const timerRef = useRef<number | null>(null);
  const docId = materialId || url.split('/').pop() || 'default-doc';

  // Carrega o arquivo (local ou remoto)
  useEffect(() => {
    const loadPdf = async () => {
      if (url.startsWith('local-')) {
        const data = await localforage.getItem<ArrayBuffer>(`pdf-${url.replace('local-', '')}`);
        setPdfData(data);
      } else {
        setPdfData(url);
      }
    };
    loadPdf();
  }, [url]);

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
      
      // Log para confirmar registro de métricas
      console.log(`📊 [Métricas] Material: ${docId} | Página: ${p} | Tempo: ${saved.pageStats[p].timeSpent}s`);
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

  // Scroll automático para página inicial ou Retomada de Leitura
  useEffect(() => {
    if (numPages > 0) {
      if (initialPage) {
        // Se foi clicado em um ponto crítico ou página específica
        setTimeout(() => {
          pageRefs.current[initialPage]?.scrollIntoView({ behavior: 'smooth' });
        }, 800);
      } else {
        // Caso contrário, tenta retomar de onde parou
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

  // Fullscreen listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Função para alternar fullscreen
  const toggleFullscreen = async () => {
    if (!wrapperRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await wrapperRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('Erro ao alternar fullscreen:', err);
    }
  };

  return (
    <div ref={wrapperRef} className="pdf-study-container" style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0f0f0f', overflow: 'hidden' }}>
      {/* Barra de Ferramentas */}
      <div style={{ padding: '12px 20px', background: '#1a1a1a', display: 'flex', gap: '15px', alignItems: 'center', borderBottom: '1px solid #333' }}>
        <div style={{ display: 'flex', gap: '5px' }}>
          <button 
            className="btn-secondary" 
            style={{ padding: '6px 12px', fontSize: '13px', background: '#222', border: '1px solid #333', borderRadius: '4px', color: '#ccc', cursor: 'pointer' }} 
            onClick={() => setScale(s => Math.min(3, s + 0.1))}
          >+</button>
          <button 
            className="btn-secondary" 
            style={{ padding: '6px 12px', fontSize: '13px', background: '#222', border: '1px solid #333', borderRadius: '4px', color: '#ccc', cursor: 'pointer' }} 
            onClick={() => setScale(s => Math.max(0.5, s - 0.1))}
          >−</button>
        </div>
        <span style={{ fontSize: '12px', color: '#888', minWidth: '50px' }}>{Math.round(scale * 100)}%</span>
        
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '15px', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: '#666' }}>
            Página {activePageRef.current} de {numPages}
          </span>
          <button 
            title={fullscreen ? 'Sair de Fullscreen' : 'Fullscreen'}
            style={{ 
              padding: '6px 12px', 
              fontSize: '13px', 
              background: fullscreen ? '#333' : '#222', 
              border: '1px solid #333', 
              borderRadius: '4px', 
              color: fullscreen ? '#a78bfa' : '#ccc', 
              cursor: 'pointer',
              transition: 'all 0.2s'
            }} 
            onClick={toggleFullscreen}
          >
            {fullscreen ? '🗗' : '⛶'}
          </button>
        </div>
      </div>
      
      {/* Área de Scroll Contínuo */}
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
              style={{ marginBottom: '20px', boxShadow: '0 4px 24px rgba(0,0,0,0.7)', lineHeight: 0 }}
            >
              <Page 
                pageNumber={page} 
                scale={scale} 
                renderTextLayer={true} 
                renderAnnotationLayer={true} 
                loading=""
              />
            </div>
          ))}
        </Document>
      </div>

      {/* Footer com botão de voltar (quando integrado com MaterialsView) */}
      {onClose && (
        <div style={{ padding: '10px 20px', display: 'flex', justifyContent: 'space-between', background: '#1a1a1a', borderTop: '1px solid #333', alignItems: 'center' }}>
          <button 
            onClick={onClose}
            style={{ padding: '6px 12px', fontSize: '11px', background: '#222', border: '1px solid #333', borderRadius: '4px', color: '#ccc', cursor: 'pointer', fontWeight: 'bold' }}
          >
            ⬅ VOLTAR À BIBLIOTECA
          </button>
          <span style={{ fontSize: '11px', color: '#666', fontWeight: 'bold', maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {fileName || 'Material'}
          </span>
        </div>
      )}
    </div>
  );
}
