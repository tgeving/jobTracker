import React from 'react';

interface RunScraperModalProps {
  isOpen: boolean;
  scraperPlatform: string;
  setScraperPlatform: (platform: string) => void;
  scraperTarget: string;
  setScraperTarget: (target: string) => void;
  scraperHeadless: boolean;
  setScraperHeadless: (headless: boolean) => void;
  scraping: boolean;
  onClose: () => void;
  onRun: (e: React.FormEvent) => void;
}

export function RunScraperModal({
  isOpen,
  scraperPlatform,
  setScraperPlatform,
  scraperTarget,
  setScraperTarget,
  scraperHeadless,
  setScraperHeadless,
  scraping,
  onClose,
  onRun,
}: RunScraperModalProps) {
  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
      <div style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', width: '400px', maxWidth: '90%', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
        <h3 style={{ marginTop: 0, marginBottom: '16px', color: '#0f172a' }}>Run Job Scraper</h3>
        <form onSubmit={onRun} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px', color: '#0f172a' }}>Platform</label>
            <select 
              value={scraperPlatform} 
              onChange={(e) => setScraperPlatform(e.target.value)} 
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', background: '#fff', cursor: 'pointer' }}
            >
              <option value="linkedin">LinkedIn</option>
              <option value="indeed">Indeed</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px', color: '#0f172a' }}>Search Target (Wide Net)</label>
            <input 
              type="text" 
              value={scraperTarget}
              onChange={(e) => setScraperTarget(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: '#fff', color: '#0f172a' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
            <input 
              type="checkbox" 
              id="headlessCheckbox"
              checked={scraperHeadless} 
              onChange={(e) => setScraperHeadless(e.target.checked)}
              style={{ cursor: 'pointer', width: '16px', height: '16px' }}
            />
            <label htmlFor="headlessCheckbox" style={{ fontSize: '13px', color: '#0f172a', cursor: 'pointer' }}>Run in Headless Mode (background)</label>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <button 
              type="button" 
              onClick={onClose} 
              style={{ background: '#cbd5e1', color: '#0f172a', padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={scraping} 
              style={{ background: '#2563eb', color: '#fff', padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500, opacity: scraping ? 0.7 : 1 }}
            >
              {scraping ? 'Running Scraper...' : 'Execute Scraper'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}