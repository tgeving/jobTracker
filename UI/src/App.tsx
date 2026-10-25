import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

interface Category {
  label: string;
  endpoint: string;
}

interface Job {
  id?: number;
  company?: string;
  position?: string;
  date_applied?: string;
  wfh?: string;
  job_link?: string;
  notes?: string;
  [key: string]: any;
}

const categories: Category[] = [
  { label: 'Applied', endpoint: 'applied' },
  { label: 'I Rejected Them', endpoint: 'i_rejected_them' },
  { label: 'Waiting to Hear Back', endpoint: 'waiting_to_hear_back' },
  { label: 'Pending', endpoint: 'pending' },
  { label: 'No Response (Ghosted)', endpoint: 'shit_heads_ghosted_me' },
  { label: 'Assholes Rejected Me', endpoint: 'assholes_rejected_me' },
  { label: 'Fuckers', endpoint: 'fuckers' }
];

const paginationOptions = [5, 10, 15, 25, 50, 75, 100, 200, 400];

function App() {
  const [activeEndpoint, setActiveEndpoint] = useState<string>('applied');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [totalJobs, setTotalJobs] = useState<number>(0);
  
  // Pagination state
  const [limit, setLimit] = useState<number>(25);
  const [offset, setOffset] = useState<number>(0);
  
  // Modal states for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingJobId, setEditingJobId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Job>({
    company: '',
    position: '',
    date_applied: '',
    wfh: 'N/A',
    job_link: '',
    notes: ''
  });

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setOffset(0);
    fetchJobs(activeEndpoint, limit, 0);
  }, [activeEndpoint, limit]);

  const fetchJobs = async (endpoint: string, currentLimit: number, currentOffset: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`http://localhost:8000/api/jobs/${endpoint}`, {
        params: { limit: currentLimit, offset: currentOffset }
      });
      
      if (Array.isArray(response.data)) {
        setJobs(response.data);
        setTotalJobs(response.data.length);
      } else {
        setJobs(response.data.items || []);
        setTotalJobs(response.data.total || 0);
      }
    } catch (err: any) {
      setError(`Error fetching jobs for ${endpoint}`);
      console.error(err);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newOffset: number) => {
    setOffset(newOffset);
    fetchJobs(activeEndpoint, limit, newOffset);
  };

  const handleDelete = async (id?: number) => {
    if (!id) return;
    const confirmed = window.confirm("Are you sure you want to delete this job application?");
    if (!confirmed) return;

    try {
      await axios.delete(`http://localhost:8000/api/jobs/${activeEndpoint}/${id}`);
      fetchJobs(activeEndpoint, limit, offset);
    } catch (err) {
      alert("Failed to delete job.");
      console.error(err);
    }
  };

  const handleOpenAddModal = () => {
    setEditingJobId(null);
    setFormData({
      company: '',
      position: '',
      date_applied: '',
      wfh: 'N/A',
      job_link: '',
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (job: Job) => {
    if (!job.id) return;
    setEditingJobId(job.id);
    setFormData({
      company: job.company || '',
      position: job.position || '',
      date_applied: job.date_applied || '',
      wfh: job.wfh || 'N/A',
      job_link: job.job_link || '',
      notes: job.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleSaveJob = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingJobId !== null) {
        // Update existing row
        await axios.put(`http://localhost:8000/api/jobs/${activeEndpoint}/${editingJobId}`, formData);
      } else {
        // Add new row
        await axios.post(`http://localhost:8000/api/jobs/${activeEndpoint}`, formData);
      }
      setIsModalOpen(false);
      fetchJobs(activeEndpoint, limit, offset);
    } catch (err) {
      alert("Failed to save job details.");
      console.error(err);
    }
  };

  const filteredJobs = (jobs || []).filter(job => 
    Object.values(job).some(val => 
      String(val || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const paginatedJobs = filteredJobs.slice(0, limit);
  const totalPages = Math.ceil(totalJobs / limit) || 1;
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="container">
      <h1>JobFinder - Application Tracker</h1>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <input 
          type="text" 
          placeholder="Search jobs across company, position, notes..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-bar"
          style={{ flex: 1, marginRight: '15px', marginBottom: 0 }}
        />
        <button 
          onClick={handleOpenAddModal}
          style={{ padding: '10px 18px', backgroundColor: '#3182ce', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          + Add New Job
        </button>
      </div>

      <div className="tabs">
        {categories.map((cat) => (
          <button
            key={cat.endpoint}
            className={activeEndpoint === cat.endpoint ? 'active' : ''}
            onClick={() => setActiveEndpoint(cat.endpoint)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="controls-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <div>
          <span>Showing {paginatedJobs.length} of {totalJobs} entries</span>
        </div>
        <div>
          <label htmlFor="per-page" style={{ marginRight: '8px' }}>Rows per page:</label>
          <select 
            id="per-page"
            value={limit} 
            onChange={(e) => setLimit(Number(e.target.value))}
            style={{ padding: '6px', borderRadius: '4px' }}
          >
            {paginationOptions.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="error-message" style={{ color: 'red', margin: '10px 0' }}>{error}</div>}
      {loading && <div>Loading...</div>}

      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Company</th>
            <th>Position</th>
            <th>Date Applied</th>
            <th>WFH</th>
            <th>Job Link</th>
            <th>Notes</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {!loading && paginatedJobs.length > 0 ? (
            paginatedJobs.map((job, index) => (
              <tr key={job.id || index}>
                <td>{offset + index + 1}</td>
                <td>{job.company || 'N/A'}</td>
                <td>{job.position || 'N/A'}</td>
                <td>{job.date_applied || 'N/A'}</td>
                <td>{job.wfh || 'N/A'}</td>
                <td>
                  {job.job_link ? (
                    <a href={job.job_link} target="_blank" rel="noopener noreferrer">Link</a>
                  ) : 'N/A'}
                </td>
                <td>{job.notes || 'N/A'}</td>
                <td>
                  <button 
                    onClick={() => handleOpenEditModal(job)} 
                    style={{ marginRight: '6px', padding: '4px 8px', cursor: 'pointer', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '4px' }}
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleDelete(job.id)} 
                    style={{ padding: '4px 8px', cursor: 'pointer', backgroundColor: '#fed7d7', color: '#9b2c2c', border: 'none', borderRadius: '4px' }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))
          ) : (
            !loading && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center' }}>No jobs found matching your filters.</td>
              </tr>
            )
          )}
        </tbody>
      </table>

      {/* Pagination Controls */}
      <div className="pagination" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginTop: '20px' }}>
        <button 
          disabled={offset === 0} 
          onClick={() => handlePageChange(Math.max(0, offset - limit))}
          style={{ padding: '8px 14px', cursor: offset === 0 ? 'not-allowed' : 'pointer' }}
        >
          Previous
        </button>
        <span>Page {currentPage} of {totalPages}</span>
        <button 
          disabled={offset + limit >= totalJobs} 
          onClick={() => handlePageChange(offset + limit)}
          style={{ padding: '8px 14px', cursor: offset + limit >= totalJobs ? 'not-allowed' : 'pointer' }}
        >
          Next
        </button>
      </div>

      {/* Add / Edit Modal Overlay */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '8px', width: '450px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
            <h2>{editingJobId !== null ? 'Edit Job' : 'Add New Job'}</h2>
            <form onSubmit={handleSaveJob}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>Company</label>
                <input 
                  type="text" 
                  value={formData.company} 
                  onChange={(e) => setFormData({...formData, company: e.target.value})}
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #cbd5e0' }}
                  required
                />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>Position</label>
                <input 
                  type="text" 
                  value={formData.position} 
                  onChange={(e) => setFormData({...formData, position: e.target.value})}
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #cbd5e0' }}
                  required
                />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>Date Applied</label>
                <input 
                  type="text" 
                  value={formData.date_applied} 
                  onChange={(e) => setFormData({...formData, date_applied: e.target.value})}
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #cbd5e0' }}
                />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>WFH</label>
                <input 
                  type="text" 
                  value={formData.wfh} 
                  onChange={(e) => setFormData({...formData, wfh: e.target.value})}
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #cbd5e0' }}
                />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>Job Link URL</label>
                <input 
                  type="text" 
                  value={formData.job_link} 
                  onChange={(e) => setFormData({...formData, job_link: e.target.value})}
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #cbd5e0' }}
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>Notes</label>
                <textarea 
                  value={formData.notes} 
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #cbd5e0', height: '80px' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  style={{ padding: '8px 14px', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  style={{ padding: '8px 14px', backgroundColor: '#3182ce', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;