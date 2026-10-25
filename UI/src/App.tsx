import React, { useState, useEffect } from 'react';

const TABS = [
  { key: 'applied', label: 'Applied' },
  { key: 'i_rejected_them', label: 'I Rejected Them' },
  { key: 'waiting_to_hear_back', label: 'Waiting to Hear Back' },
  { key: 'pending', label: 'Pending' },
  { key: 'no_response', label: 'No Response (Ghosted)' },
  { key: 'went_with_another_canidadate', label: 'Went With Another Candidate' },
  { key: 'rejection', label: 'Rejection' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('applied');
  const [searchQuery, setSearchQuery] = useState('');
  const [jobsData, setJobsData] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(false);

  // Fetch ALL jobs in one clean request on initial page load (prevents ENOBUFS/502 crash)
  const fetchAllJobs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/jobs/all');
      if (!res.ok) throw new Error('Failed to fetch jobs data');
      const data = await res.json();
      setJobsData(data || {});
    } catch (err) {
      console.error('Failed to fetch jobs', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAllJobs();
  }, []);

  const handleMoveJob = async (jobId: number, targetTable: string) => {
    try {
      const res = await fetch('/jobs/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_table: activeTab,
          target_table: targetTable,
          job_id: jobId,
        }),
      });
      if (res.ok) {
        fetchAllJobs(); // Refresh all jobs data instantly after moving
      }
    } catch (err) {
      console.error('Failed to move job', err);
    }
  };

  const handleDelete = async (jobId: number) => {
    if (!confirm('Are you sure you want to delete this job?')) return;
    try {
      const res = await fetch(`/jobs/${activeTab}/${jobId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchAllJobs(); // Refresh all jobs data instantly after deleting
      }
    } catch (err) {
      console.error('Failed to delete job', err);
    }
  };

  // Grab the array for the currently active tab safely
  const currentTabJobs = jobsData[activeTab] || [];

  const filteredJobs = currentTabJobs.filter((job) =>
    Object.values(job).some((val) =>
      String(val || '').toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-blue-400">Job Hunt Application Tracker</h1>

        {/* Search Bar */}
        <div className="mb-6">
          <input
            id="search-bar"
            type="text"
            placeholder="Search jobs across company, position, notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 rounded bg-gray-800 border border-gray-700 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-gray-700 pb-4 mb-6">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              id={`tab-${tab.key}`}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Table */}
        <div className="bg-gray-800 rounded-lg shadow overflow-x-auto border border-gray-700">
          {loading ? (
            <div className="p-6 text-center text-gray-400">Loading jobs...</div>
          ) : filteredJobs.length === 0 ? (
            <div className="p-6 text-center text-gray-400">No job records found in this section.</div>
          ) : (
            <table id={`${activeTab}-table`} className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-700 text-gray-300 text-sm uppercase">
                  <th className="p-3">Company</th>
                  <th className="p-3">Position</th>
                  <th className="p-3">Date Applied</th>
                  <th className="p-3">WFH</th>
                  <th className="p-3">Job Link</th>
                  <th className="p-3">Notes</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-750 transition-colors">
                    <td className="p-3 font-semibold">{job.company}</td>
                    <td className="p-3">{job.position}</td>
                    <td className="p-3">{job.date_applied}</td>
                    <td className="p-3">{job.wfh}</td>
                    <td className="p-3">
                      {job.job_link ? (
                        <a
                          href={job.job_link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-400 underline truncate max-w-xs block"
                        >
                          Link
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="p-3 text-sm text-gray-300 max-w-xs truncate">{job.notes}</td>
                    <td className="p-3 text-center space-x-2">
                      {/* Move Job Dropdown */}
                      <select
                        className="bg-gray-700 text-xs px-2 py-1 rounded border border-gray-600 text-gray-200"
                        onChange={(e) => {
                          if (e.target.value) handleMoveJob(job.id, e.target.value);
                          e.target.value = ""; // Reset dropdown after selection
                        }}
                        defaultValue=""
                      >
                        <option value="" disabled>Move to...</option>
                        {TABS.filter((t) => t.key !== activeTab).map((t) => (
                          <option key={t.key} value={t.key}>{t.label}</option>
                        ))}
                      </select>

                      <button
                        onClick={() => handleDelete(job.id)}
                        className="delete-btn bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}