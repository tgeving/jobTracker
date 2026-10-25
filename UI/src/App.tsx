import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

interface Category {
  label: string;
  endpoint: string | null; // Must match your exact backend route / table names
}

interface Job {
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

function App() {
  const [activeEndpoint, setActiveEndpoint] = useState<string | null>('applied');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJobs(activeEndpoint);
  }, [activeEndpoint]);

  const fetchJobs = async (endpoint: string | null) => {
    setLoading(true);
    setError(null);
    if (!endpoint) {
      try {
        const requests = categories
          .filter((c): c is Category & { endpoint: string } => c.endpoint !== null)
          .map(c => axios.get<Job[]>(`http://localhost:8000/api/jobs/${c.endpoint}`));
        const responses = await Promise.all(requests);
        const combined = responses.flatMap(res => res.data);
        setJobs(combined);
      } catch (err: any) {
        setError('Error fetching all jobs');
        console.error(err);
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      const response = await axios.get<Job[]>(`http://localhost:8000/api/jobs/${endpoint}`);
      setJobs(response.data);
    } catch (err: any) {
      setError(`Error fetching jobs for ${endpoint}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredJobs = jobs.filter(job => 
    Object.values(job).some(val => 
      String(val || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

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
            key={cat.label}
            className={activeEndpoint === cat.endpoint ? 'active' : ''}
            onClick={() => setActiveEndpoint(cat.endpoint)}
          >
            {cat.label}
          </button>
        ))}
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
          {!loading && filteredJobs.length > 0 ? (
            filteredJobs.map((job, index) => (
              <tr key={index}>
                <td>{index + 1}</td>
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
    </div>
  );
}

export default App;