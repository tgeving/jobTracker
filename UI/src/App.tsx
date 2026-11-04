import { useEffect, useState } from 'react';
import { JobBuckets } from './constants/buckets';
import { JobMetricsChart } from './components/jobMetricsChart';
import { AddEditJobModal } from './components/AddEditJobModal';
import { ConfirmDeleteModal } from './components/ConfirmDeleteModal';
import { RunScraperModal } from './components/RunScraperModal';
import { PaginationBar } from './components/PaginationBar';

const API_BASE = 'http://localhost:8000';

export default function App() {
  const [jobData, setJobData] = useState<{ total: number; items: any[] }>({ total: 0, items: [] });
  const [allJobsCache, setAllJobsCache] = useState<any[]>([]);
  const [selectedBucket, setSelectedBucket] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearchTerm, setActiveSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const [showJobModal, setShowJobModal] = useState(false);
  const [showScraperModal, setShowScraperModal] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<any>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editingJobId, setEditingJobId] = useState<any>(null);
  const [editingJobTable, setEditingJobTable] = useState<string>('');
  const [jobForm, setJobForm] = useState({ company: '', position: '', date_applied: '', wfh: '', notes: '', job_link: '' });

  const [scraperPlatform, setScraperPlatform] = useState('linkedin');
  const [scraperTarget, setScraperTarget] = useState('');
  const [scraperHeadless, setScraperHeadless] = useState(true);
  const [scraping, setScraping] = useState(false);

  const datasetToCount = allJobsCache.length > 0 ? allJobsCache : jobData.items;
  const metricsData = {
    newJobs: datasetToCount.filter(j => j.table_name === JobBuckets.NewJobs || !j.table_name).length,
    applied: datasetToCount.filter(j => j.table_name === JobBuckets.Applied).length,
    waiting: datasetToCount.filter(j => j.table_name === JobBuckets.WaitingToHearBack).length,
    pending: datasetToCount.filter(j => j.table_name === JobBuckets.Pending).length,
    unresponsive: datasetToCount.filter(j => j.table_name === JobBuckets.Unresponsive).length,
    declined: datasetToCount.filter(j => j.table_name === JobBuckets.Declined).length,
    withdrew: datasetToCount.filter(j => j.table_name === JobBuckets.Withdrew).length,
    disappointed: datasetToCount.filter(j => j.table_name === JobBuckets.Disappointed).length,
  };

  const fetchJobs = (bucketKey: string) => {
    setLoading(true);
    setCurrentPage(1);
    const endpoint = bucketKey === 'all' ? `${API_BASE}/api/jobs/all` : `${API_BASE}/api/jobs/${bucketKey}`;

    fetch(endpoint)
      .then(res => res.json())
      .then(data => { setJobData(data); setLoading(false); })
      .catch(err => { console.error(err); setLoading(false); });

    fetch(`${API_BASE}/api/jobs/all`)
      .then(res => res.json())
      .then(data => setAllJobsCache(data.items))
      .catch(err => console.error(err));
  };

  useEffect(() => { fetchJobs(selectedBucket); }, [selectedBucket]);

  const handleMoveJob = async (job: any, targetTable: string) => {
    try {
      const sourceTable = job.table_name || (selectedBucket === 'all' ? JobBuckets.NewJobs : selectedBucket);
      const res = await fetch(`${API_BASE}/api/jobs/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_table: sourceTable, target_table: targetTable, company: job.company || '', position: job.position || '', row_id: String(job.id) })
      });
      if (!res.ok) throw new Error('Failed to move job');
      fetchJobs(selectedBucket);
    } catch (err) { console.error(err); }
  };

  const confirmDeleteJob = async () => {
    if (!jobToDelete) return;
    const table = jobToDelete.table_name || selectedBucket;
    try {
      const res = await fetch(`${API_BASE}/api/jobs/${table}/${jobToDelete.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete job');
      setJobToDelete(null);
      fetchJobs(selectedBucket);
    } catch (err) { console.error(err); }
  };

  const handleSaveJob = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing) {
        const table = editingJobTable === 'all' ? JobBuckets.NewJobs : editingJobTable;
        await fetch(`${API_BASE}/api/jobs/${table}/${editingJobId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(jobForm),
        });
      } else {
        const targetTable = selectedBucket === 'all' ? JobBuckets.NewJobs : selectedBucket;
        await fetch(`${API_BASE}/api/jobs/${targetTable}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(jobForm),
        });
      }
      setShowJobModal(false);
      fetchJobs(selectedBucket);
    } catch (err) { console.error(err); }
  };

  const handleRunScraper = async (e: React.FormEvent) => {
    e.preventDefault();
    setScraping(true);
    try {
      const res = await fetch(`${API_BASE}/api/scraper/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: scraperPlatform, target: scraperTarget, headless: scraperHeadless }),
      });
      if (!res.ok) throw new Error('Scraper failed');
      setShowScraperModal(false);
      setScraperTarget('');
      fetchJobs(selectedBucket);
    } catch (err) { console.error(err); } finally { setScraping(false); }
  };

  const sourceDataset = activeSearchTerm ? allJobsCache : jobData.items;
  const filteredItems = sourceDataset.filter(job => {
    const q = activeSearchTerm.toLowerCase();
    if (!q) return true;
    return (job.company || '').toLowerCase().includes(q) || (job.position || '').toLowerCase().includes(q) || (job.notes || '').toLowerCase().includes(q);
  }).sort((a, b) => b.id - a.id);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentTableItems = filteredItems.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="container">
      <h1>JobFinder - Application Tracker</h1>
      <JobMetricsChart data={metricsData} />

      <div className="toolbar" style={{ marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <button type="button" onClick={() => { setIsEditing(false); setJobForm({ company: '', position: '', date_applied: '', wfh: '', notes: '', job_link: '' }); setShowJobModal(true); }} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}>
          Add New Job
        </button>

        <div style={{ display: 'flex', gap: '6px' }}>
          <input type="text" placeholder="Search all buckets" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { setActiveSearchTerm(searchQuery); setCurrentPage(1); } }} style={{ padding: '9px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '300px', fontSize: '14px' }} />
          <button type="button" onClick={() => { setActiveSearchTerm(searchQuery); setCurrentPage(1); }} style={{ background: '#475569', color: '#fff', border: 'none', padding: '9px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}>Search</button>
          {activeSearchTerm && <button type="button" onClick={() => { setSearchQuery(''); setActiveSearchTerm(''); setCurrentPage(1); }} style={{ background: '#e2e8f0', color: '#334155', border: 'none', padding: '9px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Clear</button>}
        </div>

        <button type="button" onClick={() => setShowScraperModal(true)} style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: 500, marginLeft: 'auto' }}>
          Run Scraper
        </button>
      </div>

      <AddEditJobModal isOpen={showJobModal} isEditing={isEditing} jobForm={jobForm} setJobForm={setJobForm} onClose={() => setShowJobModal(false)} onSave={handleSaveJob} />
      <ConfirmDeleteModal jobToDelete={jobToDelete} onClose={() => setJobToDelete(null)} onConfirm={confirmDeleteJob} />
      <RunScraperModal isOpen={showScraperModal} scraperPlatform={scraperPlatform} setScraperPlatform={setScraperPlatform} scraperTarget={scraperTarget} setScraperTarget={setScraperTarget} scraperHeadless={scraperHeadless} setScraperHeadless={setScraperHeadless} scraping={scraping} onClose={() => setShowScraperModal(false)} onRun={handleRunScraper} />

      <div className="tabs">
        {Object.entries(JobBuckets).map(([label, tableKey]) => (
          <button key={tableKey} type="button" className={selectedBucket === tableKey ? 'active' : ''} onClick={() => { setSelectedBucket(tableKey); setActiveSearchTerm(''); setSearchQuery(''); }}>
            {label.replace(/([A-Z])/g, ' $1').trim()}
          </button>
        ))}
      </div>

      <p className="counter">Showing entries {filteredItems.length > 0 ? startIndex + 1 : 0} - {Math.min(startIndex + itemsPerPage, filteredItems.length)} of {filteredItems.length} matching entries (Total: {jobData.total})</p>

      {loading ? <p>Loading database records...</p> : (
        <>
          <PaginationBar 
            currentPage={currentPage} 
            totalPages={totalPages} 
            itemsPerPage={itemsPerPage} 
            onPageChange={setCurrentPage} 
            onItemsPerPageChange={(newSize) => { setItemsPerPage(newSize); setCurrentPage(1); }} 
          />

          <table className="job-table">
            <thead>
              <tr>
                <th style={{ width: '50px', textAlign: 'center' }}>#</th>
                <th>Company</th>
                <th>Position</th>
                <th>Date Applied</th>
                <th>WFH</th>
                <th>Link</th>
                <th>Notes</th>
                <th>Interviews</th>
                <th>Move to</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentTableItems.map((job, index) => (
                <tr key={job.id || index}>
                  <td style={{ textAlign: 'center', color: '#64748b', fontWeight: 500 }}>{startIndex + index + 1}</td>
                  <td>{job.company}</td>
                  <td>{job.position}</td>
                  <td>{job.date_applied}</td>
                  <td>{job.wfh}</td>
                  <td>{job.job_link ? <a href={job.job_link} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline' }}>View Link</a> : <span style={{ color: '#94a3b8' }}>N/A</span>}</td>
                  <td>{job.notes}</td>
                  <td>{job.no_of_interviews}</td>
                  <td>
                    <select defaultValue="" onChange={e => { if (e.target.value) { handleMoveJob(job, e.target.value); e.target.value = ''; } }}>
                      <option value="" disabled>Move to...</option>
                      {Object.entries(JobBuckets).filter(([_, k]) => k !== 'all').map(([l, k]) => <option key={k} value={k}>{l.replace(/([A-Z])/g, ' $1').trim()}</option>)}
                    </select>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button type="button" onClick={() => { setIsEditing(true); setEditingJobId(job.id); setEditingJobTable(job.table_name || selectedBucket); setJobForm({ company: job.company || '', position: job.position || '', date_applied: job.date_applied || '', wfh: job.wfh || '', notes: job.notes || '', job_link: job.job_link || '' }); setShowJobModal(true); }} style={{ background: '#f59e0b', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Edit</button>
                      <button type="button" onClick={() => setJobToDelete(job)} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ paddingBottom: '40px' }}>
            <PaginationBar 
              currentPage={currentPage} 
              totalPages={totalPages} 
              itemsPerPage={itemsPerPage} 
              onPageChange={setCurrentPage} 
              onItemsPerPageChange={(newSize) => { setItemsPerPage(newSize); setCurrentPage(1); }} 
            />
          </div>
        </>
      )}
    </div>
  );
}
