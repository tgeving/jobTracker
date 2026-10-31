import React from 'react';

interface MetricsProps {
  data: {
    newJobs: number;
    applied: number;
    waiting: number;
    pending: number;
    ghosted: number;
    rejected: number;
    disappointing: number;
  };
}

export const JobMetricsChart: React.FC<MetricsProps> = ({ data }) => {
  const chartData = [
    { name: 'New Scraped', count: data.newJobs, color: '#10b981' },
    { name: 'Applied', count: data.applied, color: '#3b82f6' },
    { name: 'Waiting', count: data.waiting, color: '#06b6d4' },
    { name: 'Pending', count: data.pending, color: '#f59e0b' },
    { name: 'Ghosted', count: data.ghosted, color: '#64748b' },
    { name: 'Rejected', count: data.rejected, color: '#ef4444' },
    { name: 'Disappointing', count: data.disappointing, color: '#8b5cf6' },
  ];

  const maxCount = Math.max(...chartData.map(d => d.count), 1);

  return (
    <div style={{ background: '#1e293b', padding: '20px', borderRadius: '8px', color: '#fff', marginBottom: '20px' }}>
      <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', fontWeight: 600 }}>Application Pipeline Metrics</h3>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', height: '180px', paddingTop: '20px', borderBottom: '1px solid #475569' }}>
        {chartData.map((item) => {
          const heightPercent = (item.count / maxCount) * 100;
          return (
            <div key={item.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, height: '100%', justifyContent: 'flex-end' }}>
              <span style={{ fontSize: '12px', marginBottom: '6px', color: '#cbd5e1' }}>{item.count}</span>
              <div 
                style={{ 
                  width: '60%', 
                  maxWidth: '40px', 
                  height: `${Math.max(heightPercent, 4)}%`, 
                  background: item.color, 
                  borderRadius: '4px 4px 0 0',
                  transition: 'height 0.3s ease'
                }} 
              />
              <span style={{ fontSize: '11px', marginTop: '8px', color: '#94a3b8', textAlign: 'center', whiteSpace: 'nowrap' }}>{item.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};