import { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import localforage from 'localforage';
import type { UserProfile, Subject } from '../App';

interface ProfileViewProps {
  userProfile: UserProfile;
  setUserProfile: (profile: UserProfile) => void;
  subjects: Subject[];
  totalHours: number;
  onThemeChange: () => void;
}

const PRESET_THEMES = [
  { id: 'default', name: 'Original', vars: { '--primary': '#8a2be2', '--accent': '#ff00ff', '--bg-deep': '#08080c', '--bg-surface': '#12121e', '--bg-card': '#1a1a2e', '--success': '#00f2ff', '--text-main': '#e0e0e0' } },
  { id: 'caveira', name: 'Caveira 💀', vars: { '--primary': '#ffffff', '--accent': '#ffffff', '--bg-deep': '#000000', '--bg-surface': '#000000', '--bg-card': '#050505', '--success': '#ffffff', '--text-main': '#ffffff' } },
  { id: 'exercito', name: 'Exército', vars: { '--primary': '#2e7d32', '--accent': '#c6ff00', '--bg-deep': '#0a0d0a', '--bg-surface': '#141a14', '--bg-card': '#1e261e', '--success': '#aeea00', '--text-main': '#e8f5e9' } }
];

export default function ProfileView({ userProfile, setUserProfile, subjects, totalHours, onThemeChange }: ProfileViewProps) {
  const [badgeUrl, setBadgeUrl] = useState<string | null>(null);
  const [badgeUrl2, setBadgeUrl2] = useState<string | null>(null);
  const [customColors, setCustomColors] = useState(() => {
    try {
      const saved = localStorage.getItem('pobruja-custom-theme');
      return saved ? JSON.parse(saved) : PRESET_THEMES[0].vars;
    } catch { return PRESET_THEMES[0].vars; }
  });

  useEffect(() => {
    const load = async () => { 
      setBadgeUrl(await localforage.getItem<string>('pobruja-badge')); 
      setBadgeUrl2(await localforage.getItem<string>('pobruja-badge2'));
    };
    load();
  }, []);

  const applyTheme = (id: string, vars: Record<string, string>) => {
    document.body.className = id === 'default' ? '' : `theme-${id}`;
    Object.entries(vars).forEach(([k, v]) => {
      document.documentElement.style.setProperty(k, v);
    });
    // primary-light is used for glows and secondary accents
    document.documentElement.style.setProperty('--primary-light', vars['--primary'] + '88');
    onThemeChange();
  };

  const handleBadgeUpload = async (e: React.ChangeEvent<HTMLInputElement>, slot: 1 | 2) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = await new Promise<string>((res) => {
        const r = new FileReader();
        r.onload = (ev) => res(ev.target?.result as string);
        r.readAsDataURL(file);
      });
      if (slot === 1) {
        setBadgeUrl(url);
        await localforage.setItem('pobruja-badge', url);
      } else {
        setBadgeUrl2(url);
        await localforage.setItem('pobruja-badge2', url);
      }
      toast.success(`Brasão ${slot} atualizado!`);
      window.location.reload();
    }
  };

  const stats = useMemo(() => {
    const done = subjects.reduce((acc, s) => acc + (s.topics?.reduce((a, t) => a + (t.questionsDone || 0), 0) || 0), 0);
    const hits = subjects.reduce((acc, s) => acc + (s.topics?.reduce((a, t) => a + (t.questionsCorrect || 0), 0) || 0), 0);
    return { done, acc: done > 0 ? (hits/done)*100 : 0 };
  }, [subjects]);

  return (
    <div className="profile-view" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div className="profile-header">
        <div className="profile-badges-row">
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '120px', height: '120px', background: 'var(--bg-surface)', borderRadius: '30px', border: '3px solid var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', position: 'relative' }}>
              {badgeUrl ? <img src={badgeUrl} alt="Brasão 1" className="badge-glow" style={{width: '90%', height: '90%', objectFit: 'contain'}} /> : <div style={{fontSize: '40px'}}>🛡️</div>}
            </div>
            <label className="btn-secondary" style={{padding: '10px 20px', fontSize: '10px', cursor: 'pointer'}}>BRASÃO 1<input type="file" hidden accept="image/*" onChange={e => handleBadgeUpload(e, 1)} /></label>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '120px', height: '120px', background: 'var(--bg-surface)', borderRadius: '30px', border: '3px solid var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', position: 'relative' }}>
              {badgeUrl2 ? <img src={badgeUrl2} alt="Brasão 2" className="badge-glow" style={{width: '90%', height: '90%', objectFit: 'contain'}} /> : <div style={{fontSize: '40px'}}>🛡️</div>}
            </div>
            <label className="btn-secondary" style={{padding: '10px 20px', fontSize: '10px', cursor: 'pointer'}}>BRASÃO 2<input type="file" hidden accept="image/*" onChange={e => handleBadgeUpload(e, 2)} /></label>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '10px' }}>
            <h1 style={{ fontSize: '48px', fontWeight: '900', margin: 0 }}>{userProfile.name}</h1>
            <input 
              className="modern-input" 
              style={{ padding: '8px 15px', fontSize: '14px', maxWidth: '200px', height: '40px' }} 
              placeholder="Mudar Nome"
              onBlur={e => e.target.value && setUserProfile({...userProfile, name: e.target.value})}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
            <p style={{ fontSize: '16px', color: 'var(--primary-light)', fontWeight: 'bold', margin: 0 }}>@{userProfile.username || userProfile.name.toLowerCase().replace(/\s/g, '')}</p>
            <input 
              className="modern-input" 
              style={{ padding: '8px 15px', fontSize: '14px', maxWidth: '200px', height: '40px' }} 
              placeholder="Mudar @username"
              onBlur={e => e.target.value && setUserProfile({...userProfile, username: e.target.value})}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <p style={{ fontSize: '20px', color: '#fff', fontWeight: 'bold', margin: 0 }}>🎯 {userProfile.targetJob}</p>
            <input 
              className="modern-input" 
              style={{ padding: '8px 15px', fontSize: '14px', maxWidth: '250px', height: '40px' }} 
              placeholder="Editar Cargo Alvo"
              onBlur={e => e.target.value && setUserProfile({...userProfile, targetJob: e.target.value})}
            />
          </div>
          <div style={{ display: 'flex', gap: '20px', marginTop: '30px' }}>
            <div className="card" style={{ padding: '20px 30px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '5px' }}>TEMPO TOTAL</div>
              <div style={{ fontSize: '28px', fontWeight: '900', color: 'var(--success)' }}>{Math.round(totalHours * 60)} min</div>
            </div>
            <div className="card" style={{ padding: '20px 30px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '5px' }}>APROVEITAMENTO</div>
              <div style={{ fontSize: '28px', fontWeight: '900', color: 'var(--primary-light)' }}>{stats.acc.toFixed(1)}%</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '40px' }}>
        <h2 style={{ marginBottom: '30px' }}>Estética do Sistema (Temas)</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '20px' }}>
          {PRESET_THEMES.map(t => (
            <button 
              key={t.id} 
              className={`btn-theme-selector ${t.id === 'caveira' ? 'btn-theme-caveira' : ''}`} 
              style={{ 
                padding: '20px', 
                textAlign: 'center', 
                background: t.id === 'caveira' ? '#000' : t.vars['--primary'], 
                color: '#fff', 
                fontSize: '14px', 
                border: t.id === 'caveira' ? '1px solid #fff' : 'none',
                borderRadius: '16px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }} 
              onClick={() => {
                applyTheme(t.id, t.vars);
                localStorage.setItem('pobruja-theme-id', t.id);
                localStorage.removeItem('pobruja-is-custom');
                toast.success(`Estilo ${t.name} ativado!`);
              }}>{t.name}</button>
          ))}
        </div>

        <h3 style={{ marginTop: '40px', marginBottom: '20px' }}>Criação de Tema</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '30px' }}>
          {[
            { l: 'Cor Primária', k: '--primary' },
            { l: 'Cor de Acento', k: '--accent' },
            { l: 'Fundo Profundo', k: '--bg-deep' },
            { l: 'Fundo Interface', k: '--bg-surface' },
            { l: 'Fundo Cartões', k: '--bg-card' },
            { l: 'Cor Sucesso', k: '--success' },
            { l: 'Cor do Texto', k: '--text-main' }
          ].map(c => (
            <div key={c.k} style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
              <label style={{fontSize: '13px', color: 'var(--text-dim)'}}>{c.l}</label>
              <input type="color" value={(customColors as any)[c.k]} style={{width: '100%', height: '50px', border: 'none', background: 'none', cursor: 'pointer'}} onChange={e => {
                const newColors = { ...customColors, [c.k]: e.target.value };
                setCustomColors(newColors);
              }} />
            </div>
          ))}
        </div>
        <button 
          className="btn-start" 
          style={{marginTop: '30px', width: '100%'}} 
          onClick={() => {
            localStorage.setItem('pobruja-custom-theme', JSON.stringify(customColors));
            localStorage.setItem('pobruja-is-custom', 'true');
            applyTheme('custom', customColors);
            toast.success('Tema personalizado aplicado!');
          }}
        >
          APLICAR TEMA PERSONALIZADO 🎨
        </button>
      </div>
    </div>
  );
}
