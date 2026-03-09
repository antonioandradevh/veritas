import { useState, useEffect, useRef } from 'react';
import Peer from 'peerjs';

export interface PeerData {
  id: string;
  username: string;
  name: string;
  activity: string;
  totalHours: number;
  accuracy: number;
  subjectsMetrics: { name: string; xp: number; accuracy: number }[];
  essaysHistory: { date: string; score: number }[];
  simuladosHistory: { date: string; accuracy: number }[];
  tafHistory: { name: string; history: { date: string; value: number }[] }[];
}

export function useP2P(
  myProfile: any, 
  currentView: string, 
  selectedTask: any, 
  totalHours: number, 
  accuracy: number, 
  globalActivity: string | null,
  subjects: any[],
  essays: any[],
  simulados: any[],
  tafExercises: any[]
) {
  const [peerId, setPeerId] = useState<string | null>(null);
  const [connections, setConnections] = useState<any[]>([]);
  const [peersData, setPeersData] = useState<Record<string, PeerData>>({});
  const peerRef = useRef<Peer | null>(null);

  const getActivityString = () => {
    if (globalActivity) return globalActivity;
    
    if (currentView === 'task' && selectedTask) {
      return `Estudando: ${selectedTask.subjectName}`;
    }
    if (currentView === 'revisao') {
      return `Revisando Ciclo`;
    }
    if (currentView === 'simulado') {
      return `Fazendo Simulado`;
    }
    if (currentView === 'redacao') {
      return `Praticando Redação`;
    }
    if (currentView === 'taf') {
      return `Treinamento TAF`;
    }
    if (currentView === 'materials') {
      return `Na Biblioteca`;
    }
    return `No Painel Geral`;
  };

  const getMetricsPayload = () => {
    return {
      id: peerRef.current?.id || peerId,
      username: myProfile.username || myProfile.name,
      name: myProfile.name,
      activity: getActivityString(),
      totalHours,
      accuracy,
      subjectsMetrics: subjects.map(s => {
        const totalMinutes = (s.topics || []).reduce((acc: number, t: any) => acc + (t.minutesSpent || 0), 0);
        const totalDone = (s.topics || []).reduce((acc: number, t: any) => acc + (t.questionsDone || 0), 0);
        const totalHits = (s.topics || []).reduce((acc: number, t: any) => acc + (t.questionsCorrect || 0), 0);
        return {
          name: s.name,
          xp: (totalMinutes * 1.66) + (totalHits * 10),
          accuracy: totalDone > 0 ? (totalHits / totalDone) * 100 : 0
        };
      }),
      essaysHistory: essays.slice(0, 15).map(e => ({ date: e.date, score: e.score })),
      simuladosHistory: simulados.slice(0, 15).map(s => ({ date: s.date, accuracy: Math.round((s.hits / s.totalQuestions) * 100) })),
      tafHistory: tafExercises.map(ex => ({
        name: ex.name,
        history: ex.history.slice(0, 15).map((h: any) => ({ date: h.date, value: h.value }))
      }))
    };
  };

  useEffect(() => {
    const peer = new Peer();
    
    peer.on('open', (id) => {
      setPeerId(id);
      
      // Auto-reconnect to saved peers
      const savedPeers = JSON.parse(localStorage.getItem('pobruja-peers-list') || '[]');
      savedPeers.forEach((targetId: string) => {
        if (targetId !== id) {
          const conn = peer.connect(targetId);
          setupConnection(conn);
        }
      });
    });

    peer.on('connection', (conn) => {
      setupConnection(conn);
    });

    peerRef.current = peer;

    return () => {
      peer.destroy();
    };
  }, []);

  const setupConnection = (conn: any) => {
    conn.on('open', () => {
      setConnections(prev => {
        if (prev.find(c => c.peer === conn.peer)) return prev;
        
        const savedPeers = JSON.parse(localStorage.getItem('pobruja-peers-list') || '[]');
        if (!savedPeers.includes(conn.peer)) {
          localStorage.setItem('pobruja-peers-list', JSON.stringify([...savedPeers, conn.peer]));
        }
        
        return [...prev, conn];
      });

      conn.send({
        type: 'status_update',
        data: getMetricsPayload()
      });
    });

    conn.on('data', (data: any) => {
      if (data.type === 'status_update') {
        setPeersData(prev => ({
          ...prev,
          [data.data.id]: data.data
        }));
      }
      if (data.type === 'disconnect_request') {
        conn.close();
      }
    });

    conn.on('close', () => {
      handlePeerRemoval(conn.peer);
    });

    conn.on('error', () => {
      handlePeerRemoval(conn.peer);
    });
  };

  const handlePeerRemoval = (targetId: string) => {
    setConnections(prev => prev.filter(c => c.peer !== targetId));
    setPeersData(prev => {
      const newData = { ...prev };
      delete newData[targetId];
      return newData;
    });
    const savedPeers = JSON.parse(localStorage.getItem('pobruja-peers-list') || '[]');
    localStorage.setItem('pobruja-peers-list', JSON.stringify(savedPeers.filter((id: string) => id !== targetId)));
  };

  const connectToPeer = (targetId: string) => {
    const cleanId = targetId.trim();
    if (!peerRef.current || cleanId === peerId) return;
    if (connections.find(c => c.peer === cleanId)) return;
    
    const conn = peerRef.current.connect(cleanId);
    setupConnection(conn);
  };

  const disconnectPeer = (targetId: string) => {
    const conn = connections.find(c => c.peer === targetId);
    if (conn) {
      conn.send({ type: 'disconnect_request' });
      conn.close();
    }
    handlePeerRemoval(targetId);
  };

  const broadcastStatus = () => {
    if (!peerId) return;
    const payload = {
      type: 'status_update',
      data: getMetricsPayload()
    };
    connections.forEach(conn => {
      if (conn.open) {
        conn.send(payload);
      }
    });
  };

  useEffect(() => {
    broadcastStatus();
  }, [currentView, selectedTask, totalHours, accuracy, myProfile, globalActivity, connections.length, subjects, essays, simulados, tafExercises]);

  return {
    peerId,
    peersData,
    connectToPeer,
    disconnectPeer,
    connections
  };
}