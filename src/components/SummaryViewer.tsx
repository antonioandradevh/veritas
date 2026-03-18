import { useState, useEffect } from 'react';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';
import { toast } from 'react-hot-toast';

export default function SummaryViewer() {
  const [summaries, setSummaries] = useState<Record<string, Record<string, string>>>({});
  const [subjects, setSubjects] = useState<any[]>([]);
  const [viewingHtml, setViewingHtml] = useState<{html: string, title: string} | null>(null);

  useEffect(() => {
    try {
      const savedSum = JSON.parse(localStorage.getItem('pobruja-summaries') || '{}');
      setSummaries(savedSum);
      const savedSub = JSON.parse(localStorage.getItem('pobruja-subjects') || '[]');
      setSubjects(savedSub);
    } catch { setSummaries({}); }
  }, []);

  const generateDocx = async (text: string, subject: string, topic: string) => {
    try {
      toast.loading('Gerando DOCX...', { id: 'docx' });
      
      const lines = text.split('\n');

      const doc = new Document({
        sections: [{
          children: [
            new Paragraph({
              children: [new TextRun({ text: `${subject} - ${topic}`, bold: true, size: 32 })],
            }),
            ...lines.map(line => new Paragraph({
              children: [new TextRun(line)],
            }))
          ],
        }],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `Resumo_${subject}_${topic}.docx`);
      toast.success('DOCX baixado!', { id: 'docx' });
    } catch (error) {
      console.error('DOCX error:', error);
      toast.error('Erro ao gerar DOCX', { id: 'docx' });
    }
  };

  return (
    <div className="summary-viewer">
      <h1>Minhas Anotações de Estudo</h1>
      <p style={{color: 'var(--text-dim)', marginBottom: '30px'}}>Visualize o local dos seus arquivos Word ou exporte as anotações.</p>
      
      {viewingHtml && (
        <div className="formatted-view-overlay">
          <button className="formatted-view-close" onClick={() => setViewingHtml(null)}>×</button>
          <div className="formatted-view-content">
            <h1 style={{ borderBottom: '2px solid #eee', paddingBottom: '20px', marginBottom: '30px' }}>{viewingHtml.title}</h1>
            <div className="lexical-formatted-view" dangerouslySetInnerHTML={{ __html: viewingHtml.html }} />
            <div style={{ marginTop: '50px', borderTop: '1px solid #eee', paddingTop: '20px', textAlign: 'center' }}>
              <button className="btn-start" onClick={() => window.print()} style={{ background: '#000', color: '#fff' }}>🖨️ IMPRIMIR / SALVAR PDF</button>
            </div>
          </div>
        </div>
      )}

      {subjects.length === 0 ? (
        <div className="card" style={{padding: '50px', textAlign: 'center'}}>
          <p>Nenhum conteúdo encontrado.</p>
        </div>
      ) : (
        subjects.map(subject => (
          <div key={subject.id} className="subject-block" style={{ marginBottom: '40px' }}>
            <h2 style={{color: 'var(--primary-light)', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px'}}>{subject.name}</h2>
            {subject.topics.map((topic: any) => {
              const content = summaries[subject.id]?.[topic.id] || "";
              if (!content && !topic.summaryLocation) return null;
              
              return (
                <div key={topic.id} className="card topic-block" style={{marginBottom: '20px'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px'}}>
                    <div>
                      <h4 style={{color: 'var(--accent)', margin: 0}}>{topic.name}</h4>
                      {topic.summaryLocation ? (
                        <div style={{marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px'}}>
                          <span style={{fontSize: '12px', color: 'var(--success)'}}>📍 {topic.summaryLocation}</span>
                          <button 
                            className="btn-secondary" 
                            style={{padding: '2px 8px', fontSize: '10px'}}
                            onClick={() => { navigator.clipboard.writeText(topic.summaryLocation); toast.success('Caminho copiado!'); }}
                          >
                            Copiar Local
                          </button>
                        </div>
                      ) : (
                        <p style={{fontSize: '11px', color: '#555', marginTop: '5px'}}>Localização do arquivo não definida.</p>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      {content && (
                        <>
                          <button className="btn-secondary" style={{fontSize: '12px', borderColor: 'var(--primary)', color: 'var(--primary-light)'}} onClick={() => setViewingHtml({ html: content, title: `${subject.name} - ${topic.name}` })}>👁️ Ver Formatado</button>
                          <button className="btn-secondary" style={{fontSize: '12px'}} onClick={() => generateDocx(content, subject.name, topic.name)}>📥 Exportar p/ DOCX</button>
                        </>
                      )}
                    </div>
                  </div>
                  {content && (
                    <div 
                      className="markdown-preview" 
                      style={{
                        background: '#0a0a1a', 
                        padding: '20px', 
                        borderRadius: '8px', 
                        border: '1px solid #2a2a40',
                        color: '#e0e0e0', 
                        fontSize: '14px', 
                        lineHeight: '1.6',
                        whiteSpace: 'pre-wrap',
                        maxHeight: '200px',
                        overflow: 'hidden',
                        position: 'relative'
                      }}
                    >
                      <div dangerouslySetInnerHTML={{ __html: content }} />
                      <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '50px', background: 'linear-gradient(transparent, #0a0a1a)' }}></div>
                    </div>
                  )}
                </div>
              );
            }).filter(Boolean)}
          </div>
        ))
      )}
    </div>
  );
}
