import { useState } from 'react';
import { toast } from 'react-hot-toast';

interface P2PGroupViewProps {
  peerId: string | null;
  peersData: Record<string, any>;
  connectToPeer: (id: string) => void;
  disconnectPeer: (id: string) => void;
}

export default function P2PGroupView({ peerId, peersData, connectToPeer, disconnectPeer }: P2PGroupViewProps) {
  const [targetId, setTargetId] = useState('');

  return (
    <div className="p2p-view">
      <h1 style={{ fontSize: '36px', fontWeight: '900', marginBottom: '40px' }}>🌐 Sala de Estudos P2P</h1>
      
      <div className="card" style={{ marginBottom: '30px' }}>
        <h3 style={{ color: 'var(--primary-light)', marginBottom: '15px' }}>Sua Chave de Conexão</h3>
        <p style={{ color: 'var(--text-dim)', marginBottom: '15px' }}>Compartilhe este código com seus amigos para que eles possam conectar com você.</p>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '15px', borderRadius: '12px', flex: 1, fontFamily: 'monospace', fontSize: '18px', color: '#fff' }}>
            {peerId || 'Gerando chave...'}
          </div>
          <button className="btn-secondary" onClick={() => {
            if(peerId) {
              navigator.clipboard.writeText(peerId);
              toast.success('Chave copiada!');
            }
          }}>COPIAR 📋</button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '40px' }}>
        <h3 style={{ marginBottom: '15px' }}>Conectar a um Amigo</h3>
        <p style={{ color: 'var(--text-dim)', marginBottom: '15px' }}>Cole a chave do seu amigo aqui para acompanhá-lo.</p>
        <div style={{ display: 'flex', gap: '15px' }}>
          <input 
            className="modern-input" 
            placeholder="Cole a chave do seu amigo aqui..." 
            value={targetId}
            onChange={e => setTargetId(e.target.value)}
          />
          <button className="btn-start" onClick={() => {
            if(targetId) {
              connectToPeer(targetId);
              setTargetId('');
              toast.success('Conectando...');
            }
          }}>CONECTAR 🔗</button>
        </div>
      </div>

      <h3 style={{ fontSize: '24px', marginBottom: '20px' }}>Amigos no Grupo ({Object.keys(peersData).length})</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {Object.values(peersData).map((peer: any) => {
          const isPausa = peer.activity.toLowerCase().includes('pausa') || peer.activity.toLowerCase().includes('descanso');
          return (
            <div key={peer.id} className="card" style={{ padding: '20px', border: '1px solid rgba(255,255,255,0.1)', position: 'relative' }}>
              <button 
                onClick={() => { if(confirm('Remover amigo do grupo?')) disconnectPeer(peer.id); }}
                style={{ position: 'absolute', top: '10px', right: '10px', background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold', opacity: 0.5 }}
                title="Remover do Grupo"
              >×</button>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                <div>
                  <h4 style={{ fontSize: '20px', color: '#fff', margin: 0 }}>{peer.name}</h4>
                  <p style={{ color: 'var(--text-dim)', fontSize: '12px', margin: '2px 0 0 0' }}>@{peer.username}</p>
                </div>
                <div style={{ 
                  width: '12px', height: '12px', borderRadius: '50%', 
                  background: isPausa ? 'var(--accent)' : 'var(--success)',
                  boxShadow: isPausa ? '0 0 10px var(--accent)' : '0 0 10px var(--success)',
                  marginRight: '20px'
                }} />
              </div>

              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px 15px', borderRadius: '8px', marginBottom: '20px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>STATUS ATUAL</span>
                <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--primary-light)' }}>{peer.activity}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>TEMPO T.</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#fff' }}>{peer.totalHours?.toFixed(1) || 0}h</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>PRECISÃO</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#fff' }}>{peer.accuracy?.toFixed(1) || 0}%</div>
                </div>
              </div>
            </div>
          );
        })}
        {Object.keys(peersData).length === 0 && (
          <div style={{ color: 'var(--text-dim)', gridColumn: '1 / -1', textAlign: 'center', padding: '40px', background: 'rgba(0,0,0,0.2)', borderRadius: '16px' }}>
            Você ainda não está conectado a ninguém.
          </div>
        )}
      </div>
    </div>
  );
}
