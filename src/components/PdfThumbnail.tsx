import { useState, useEffect } from 'react';
import { Document, Page } from 'react-pdf';
import localforage from 'localforage';

interface PdfThumbnailProps {
  url: string;
  scale?: number;
}

export default function PdfThumbnail({ url, scale = 0.3 }: PdfThumbnailProps) {
  const [pdfData, setPdfData] = useState<any>(null);

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

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden', borderRadius: '8px', background: '#1a1a1a', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      {pdfData ? (
        <Document file={pdfData} loading={<div style={{ color: '#444', fontSize: '10px' }}>...</div>}>
          <Page 
            pageNumber={1} 
            scale={scale} 
            renderTextLayer={false} 
            renderAnnotationLayer={false}
            loading=""
          />
        </Document>
      ) : (
        <div style={{ color: '#444' }}>📄</div>
      )}
    </div>
  );
}
