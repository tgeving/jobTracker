import { useEffect, useState } from 'react';
import { JobBuckets } from './constants/buckets';

export default function App() {
  const [jobData, setJobData] = useState<{ total: number; items: any[] }>({ total: 0, items: [] });
  const [allJobsCache, setAllJobsCache] = useState<any[]>([]); // <--- Stores global pool for searching across all buckets
  const [selectedBucket, setSelectedBucket] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearchTerm, setActiveSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Modal Visibility States
  const [showJobModal, setShowJobModal] = useState(false);
  const [showScraperModal, setShowScraperModal] = useState(false);

  // Job Form States (Add & Edit)
  const [isEditing, setIsEditing] = useState(false);
  const [editingJobId, setEditingJobId] = useState<any>(null);
  const [editingJobTable, setEditingJobTable] = useState<string>('');
  const [jobForm, setJobForm] = useState({
    company: '',
    position: '',
    date_applied: '',
    wfh: '',
    notes: '',
    job_link: ''
  });

  // Scraper Form States
  const [scraperPlatform, setScraperPlatform] = useState('linkedin');
  const [scraperTarget, setScraperTarget] = useState('');
  const [scraping, setScraping] = useState(false);

  // Fetch current view data & cache the global "all" list for searching
  const fetchJobs = (bucketKey: string) => {
    setLoading(true);
    setCurrentPage(1); // Reset to page 1 on tab change
    
    const endpoint = bucketKey === 'all'
      ? 'http://localhost:8000/api/jobs/all'
      : `http://localhost:8000/api/jobs/${bucketKey}`;

    fetch(endpoint)
      .then((res) => res.json())
      .then((data) => {
        setJobData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch jobs:', err);
        setLoading(false);
      });

    // Also fetch the global cache if we aren't already on 'all', so global search has everything
    if (bucketKey !== 'all') {
      fetch('http://localhost:8000/api/jobs/all')
        .then((res) => res.json())
        .then((data) => setAllJobsCache(data.items))
        .catch((err) => console.error('Failed to fetch global cache:', err));
    } else {
      fetch('http://localhost:8000/api/jobs/all')
        .then((res) => res.json())
        .then((data) => setAllJobsCache(data.items))
        .catch((err) => console.error('Failed to fetch global cache:', err));
    }
  };

  useEffect(() => {
    fetchJobs(selectedBucket);
  }, [selectedBucket]);

  // --- API ACTIONS ---
  const handleMoveJob = async (job: any, targetTable: string) => {
    try {
      const sourceTable = job.table_name || (selectedBucket === 'all' ? 'new_jobs_found' : selectedBucket);
      
      const res = await fetch('http://localhost:8000/api/jobs/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_table: sourceTable,
          target_table: targetTable,
          company: job.company || '',
          position: job.position || '',
          row_id: String(job.id)
        }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to move job');
      
      fetchJobs(selectedBucket);
    } catch (err) {
      console.error(err);
      alert(`Error moving job: ${err}`);
    }
  };

  const handleDeleteJob = async (job: any) => {
    const table = job.table_name || selectedBucket;
    if (table === 'all') {
      alert('Please select a specific bucket tab to delete a job.');
      return;
    }
    if (!confirm(`Are you sure you want to delete ${job.company} - ${job.position}?`)) return;

    try {
      const res = await fetch(`http://localhost:8000/api/jobs/${table}/${job.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete job');
      fetchJobs(selectedBucket);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenAddModal = () => {
    setIsEditing(false);
    setEditingJobId(null);
    setEditingJobTable('');
    setJobForm({ company: '', position: '', date_applied: '', wfh: '', notes: '', job_link: '' });
    setShowJobModal(true);
  };

  const handleOpenEditModal = (job: any) => {
    setIsEditing(true);
    setEditingJobId(job.id);
    setEditingJobTable(job.table_name || selectedBucket);
    setJobForm({
      company: job.company || '',
      position: job.position || '',
      date_applied: job.date_applied || '',
      wfh: job.wfh || '',
      notes: job.notes || '',
      job_link: job.job_link || ''
    });
    setShowJobModal(true);
  };

  const handleSaveJob = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing) {
        const table = editingJobTable === 'all' ? 'new_jobs_found' : editingJobTable;
        const res = await fetch(`http://localhost:8000/api/jobs/${table}/${editingJobId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(jobForm),
        });
        if (!res.ok) throw new Error('Failed to update job');
      } else {
        const targetTable = selectedBucket === 'all' ? 'new_jobs_found' : selectedBucket;
        const res = await fetch(`http://localhost:8000/api/jobs/${targetTable}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(jobForm),
        });
        if (!res.ok) throw new Error('Failed to add job');
      }

      setShowJobModal(false);
      fetchJobs(selectedBucket);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRunScraper = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scraperTarget) {
      alert('Please enter a target search query for the scraper.');
      return;
    }
    setScraping(true);
    try {
      const res = await fetch('http://localhost:8000/api/scraper/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: scraperPlatform,
          target: scraperTarget,
          headless: true
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Scraper failed');
      
      alert('Scraper executed successfully!');
      setShowScraperModal(false);
      setScraperTarget('');
      fetchJobs(selectedBucket);
    } catch (err: any) {
      alert(`Scraper error: ${err.message}`);
    } finally {
      setScraping(false);
    }
  };

  // 1. GLOBAL SEARCH LOGIC: If an active search term exists, search across the entire global cache. Otherwise, use current tab.
  const sourceDataset = activeSearchTerm ? allJobsCache : jobData.items;

  const filteredItems = sourceDataset.filter((job) => {
    const query = activeSearchTerm.toLowerCase();
    if (!query) return true;
    const company = (job.company || '').toLowerCase();
    const position = (job.position || '').toLowerCase();
    const notes = (job.notes || '').toLowerCase();
    return company.includes(query) || position.includes(query) || notes.includes(query);
  });

  // 2. Pagination Calculations
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentTableItems = filteredItems.slice(startIndex, startIndex + itemsPerPage);

  // Reusable Pagination Component Bar
  const renderPaginationBar = () => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '16px 0', flexWrap: 'wrap', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button 
          type="button"
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
          style={{ background: currentPage === 1 ? '#cbd5e1' : '#2563eb', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
        >
          Previous
        </button>

        <span>Page {currentPage} of {totalPages}</span>

        <button 
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
          style={{ background: currentPage >= totalPages ? '#cbd5e1' : '#2563eb', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer' }}
        >
          Next
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#334155' }}>
        <label>Rows per page:</label>
        <select 
          value={itemsPerPage} 
          onChange={(e) => {
            setItemsPerPage(Number(e.target.value));
            setCurrentPage(1);
          }}
          style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
        >
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={75}>75</option>
          <option value={100}>100</option>
          <option value={200}>200</option>
        </select>
      </div>
    </div>
  );

  return (
    <div className="container">
      <h1>JobFinder - Application Tracker</h1>

      {/* Top Toolbar Trigger Buttons & Global Search Bar */}
      <div className="toolbar" style={{ marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <button 
          type="button" 
          onClick={handleOpenAddModal} 
          style={{ background: '#10b981', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
        >
          Add New Job
        </button>

        {/* Search Input & Execute Search Button Group */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <input 
            type="text" 
            placeholder="Search all buckets (company, position, notes)..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { 
              if (e.key === 'Enter') {
                setActiveSearchTerm(searchQuery);
                setCurrentPage(1);
              } 
            }}
            style={{ padding: '9px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '300px', fontSize: '14px' }}
          />
          <button 
            type="button"
            onClick={() => {
              setActiveSearchTerm(searchQuery);
              setCurrentPage(1);
            }}
            style={{ background: '#475569', color: '#fff', border: 'none', padding: '9px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
          >
            Search
          </button>
          {activeSearchTerm && (
            <button 
              type="button"
              onClick={() => { setSearchQuery(''); setActiveSearchTerm(''); setCurrentPage(1); }}
              style={{ background: '#e2e8f0', color: '#334155', border: 'none', padding: '9px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
            >
              Clear
            </button>
          )}
        </div>

        <button 
          type="button" 
          onClick={() => setShowScraperModal(true)} 
          style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: 500, marginLeft: 'auto' }}
        >
          Run Scraper
        </button>
      </div>

      {/* --- MODAL OVERLAY: ADD / EDIT JOB --- */}
      {showJobModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', width: '500px', maxWidth: '90%', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px', color: '#0f172a' }}>{isEditing ? 'Edit Job Record' : 'Add New Job Record'}</h3>
            <form onSubmit={handleSaveJob} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <input type="text" placeholder="Company *" value={jobForm.company} onChange={(e) => setJobForm({...jobForm, company: e.target.value})} required style={{ padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
              <input type="text" placeholder="Position *" value={jobForm.position} onChange={(e) => setJobForm({...jobForm, position: e.target.value})} required style={{ padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
              <input type="text" placeholder="Date Applied" value={jobForm.date_applied} onChange={(e) => setJobForm({...jobForm, date_applied: e.target.value})} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
              <input type="text" placeholder="WFH (Yes/No/Hybrid)" value={jobForm.wfh} onChange={(e) => setJobForm({...jobForm, wfh: e.target.value})} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
              <input type="text" placeholder="Job Link" value={jobForm.job_link} onChange={(e) => setJobForm({...jobForm, job_link: e.target.value})} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', gridColumn: 'span 2' }} />
              <textarea placeholder="Notes" value={jobForm.notes} onChange={(e) => setJobForm({...jobForm, notes: e.target.value})} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', gridColumn: 'span 2', minHeight: '80px' }} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', gridColumn: 'span 2', marginTop: '8px' }}>
                <button type="button" onClick={() => setShowJobModal(false)} style={{ background: '#cbd5e1', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ background: '#2563eb', color: '#fff', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>{isEditing ? 'Update Job' : 'Save Job'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL OVERLAY: RUN SCRAPER --- */}
      {showScraperModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', width: '400px', maxWidth: '90%', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px', color: '#0f172a' }}>Run Job Scraper</h3>
            <form onSubmit={handleRunScraper} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px', color: '#0f172a' }}>Platform</label>
                <select value={scraperPlatform} onChange={(e) => setScraperPlatform(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                  <option value="linkedin">LinkedIn</option>
                  <option value="indeed">Indeed</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px', color: '#0f172a' }}>Search Target</label>
                <input 
                  type="text" 
                  placeholder="e.g. SDET or Senior QA Engineer" 
                  value={scraperTarget} 
                  onChange={(e) => setScraperTarget(e.target.value)}
                  required
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowScraperModal(false)} style={{ background: '#cbd5e1', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={scraping} style={{ background: '#2563eb', color: '#fff', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                  {scraping ? 'Running Scraper...' : 'Execute Scraper'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dynamic Status Bucket Tabs */}
      <div className="tabs">
        {Object.entries(JobBuckets).map(([label, tableKey]) => (
          <button
            key={tableKey}
            type="button"
            className={selectedBucket === tableKey ? 'active' : ''}
            onClick={() => {
              setSelectedBucket(tableKey);
              setActiveSearchTerm(''); // Clear search on tab switch if desired, or keep it active
              setSearchQuery('');
            }}
          >
            {label.replace(/([A-Z])/g, ' $1').trim()}
          </button>
        ))}
      </div>

      <p className="counter">
        Showing entries {filteredItems.length > 0 ? startIndex + 1 : 0} - {Math.min(startIndex + itemsPerPage, filteredItems.length)} of {filteredItems.length} matching entries (Total: {jobData.total})
      </p>

      {/* Loading & Data Table */}
      {loading ? (
        <p>Loading database records...</p>
      ) : (
        <>
          {/* TOP PAGINATION BAR */}
          {renderPaginationBar()}

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
                <th>Move to</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentTableItems.map((job, index) => {
                const rowNumber = startIndex + index + 1;
                return (
                  <tr key={job.id || index}>
                    <td style={{ textAlign: 'center', color: '#64748b', fontWeight: 500 }}>{rowNumber}</td>
                    <td>{job.company}</td>
                    <td>{job.position}</td>
                    <td>{job.date_applied}</td>
                    <td>{job.wfh}</td>
                    <td>
                      {job.job_link ? (
                        <a 
                          href={job.job_link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ color: '#2563eb', textDecoration: 'underline', fontWeight: 500 }}
                        >
                          View Link
                        </a>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>N/A</span>
                      )}
                    </td>
                    <td>{job.notes}</td>
                    <td>
                      <select 
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value) {
                            handleMoveJob(job, e.target.value);
                            e.target.value = "";
                          }
                        }}
                      >
                        <option value="" disabled>Move to...</option>
                        {Object.entries(JobBuckets)
                          .filter(([_, tableKey]) => tableKey !== 'all')
                          .map(([label, tableKey]) => (
                            <option key={tableKey} value={tableKey}>
                              {label.replace(/([A-Z])/g, ' $1').trim()}
                            </option>
                          ))}
                      </select>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <button 
                          type="button" 
                          onClick={() => handleOpenEditModal(job)} 
                          style={{ background: '#f59e0b', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                        >
                          Edit
                        </button>
                        <button 
                          type="button" 
                          onClick={() => handleDeleteJob(job)} 
                          style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* BOTTOM PAGINATION BAR */}
          <div style={{ paddingBottom: '40px' }}>
            {renderPaginationBar()}
          </div>
        </>
      )}
    </div>
  );
}