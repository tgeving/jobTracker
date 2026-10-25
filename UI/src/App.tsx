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
  
  // Pagination state (sorting removed)
  const [limit, setLimit] = useState<number>(25);
  const [offset, setOffset] = useState<number>(0);
  
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setOffset(0); // Reset page on tab switch
    fetchJobs(activeEndpoint, limit, 0);
  }, [activeEndpoint, limit]);

  const fetchJobs = async (endpoint: string, currentLimit: number, currentOffset: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`http://localhost:8000/api/jobs/${endpoint}`, {
        params: {
          limit: currentLimit,
          offset: currentOffset
        }
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

  // Filter jobs by search term
  const filteredJobs = (jobs || []).filter(job => 
    Object.values(job).some(val => 
      String(val || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  // Enforce frontend slicing to strictly respect rows-per-page selector
  const paginatedJobs = filteredJobs.slice(0, limit);

  const totalPages = Math.ceil(totalJobs / limit) || 1;
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="container">
      <h1>Job Hunt Application Tracker</h1>
      
      <input 
        type="text" 
        placeholder="Search jobs across company, position, notes..." 
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="search-bar"
      />

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
                <td>-</td>
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
    </div>
  );
}

export default App;