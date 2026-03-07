import { useState, useEffect } from 'react';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import { toast } from 'react-hot-toast';

export default function SummaryViewer() {
  const [summaries, setSummaries] = useState<Record<string, Record<string, string>>>({});
  const [subjects, setSubjects] = useState<any[]>([]);

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
      const children = [
        new Paragraph({
          text: `${subject} - ${topic}`,
          heading: HeadingLevel.HEADING_1,
        }),
      ];

      lines.forEach(line => {
        if (line.startsWith('# ')) {
          children.push(new Paragraph({ text: line.replace('# ', ''), heading: HeadingLevel.HEADING_2 }));
        } else if (line.startsWith('## ')) {
          children.push(new Paragraph({ text: line.replace('## ', ''), heading: HeadingLevel.HEADING_3 }));
        } else {
          children.push(new Paragraph({
            children: [new TextRun(line)],
          }));
        }
      });

      const doc = new Document({
        sections: [{ children }],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `Resumo_${subject}_${topic}.docx`);
      toast.success('DOCX baixado!', { id: 'docx' });
    } catch (error) {
      toast.error('Erro ao gerar DOCX', { id: 'docx' });
    }
  };

  return (
    <div className="summary-viewer">
      <h1>Minhas Anotações de Estudo</h1>
      <p style={{color: 'var(--text-dim)', marginBottom: '30px'}}>Visualize o local dos seus arquivos Word ou exporte as anotações in-app.</p>
      
      {subjects.length === 0 ? (
        <div className="card" style={{padding: '50px', textAlign: 'center'}}>
          <p>Nenhum conteúdo encontrado.</p>
        </div>
      ) : (
        subjects.map(subject => (
          <div key={subject.id} className="subject-block">
            <h2 style={{color: 'var(--primary-light)', marginBottom: '20px'}}>{subject.name}</h2>
            {subject.topics.map((topic: any) => {
              const content = summaries[subject.id]?.[topic.id] || "";
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
                    {content && (
                      <button className="btn-secondary" style={{fontSize: '12px'}} onClick={() => generateDocx(content, subject.name, topic.name)}>📥 Exportar p/ DOCX</button>
                    )}
                  </div>
                  {content && (
                    <div className="markdown-preview" style={{background: '#0a0a1a', padding: '20px', borderRadius: '8px', border: '1px solid #2a2a40'}}>
                      <pre style={{whiteSpace: 'pre-wrap', fontFamily: 'monospace', color: '#e0e0e0', fontSize: '14px', lineHeight: '1.6'}}>{content}</pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
}
