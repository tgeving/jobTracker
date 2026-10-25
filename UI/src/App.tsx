import React, { useState, useEffect } from 'react';

interface Job {
  id: number;
  company: string;
  position: string;
  date_applied: string;
  wfh: string;
  job_link: string;
  notes: string;
  status: string;
  source_table: string;
}

export default function App() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [totalEntries, setTotalEntries] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(25);

  useEffect(() => {
    const offset = (currentPage - 1) * rowsPerPage;
    const statusParam = selectedStatus !== 'All' ? `&status=${encodeURIComponent(selectedStatus)}` : '';
    
    fetch(`http://localhost:8000/jobs?limit=${rowsPerPage}&offset=${offset}${statusParam}`)
      .then((res) => res.json())
      .then((data) => {
        setJobs(data.items || []);
        setTotalEntries(data.total || 0);
      })
      .catch((err) => console.error('Error fetching jobs:', err));
  }, [currentPage, rowsPerPage, selectedStatus]);

  const filteredJobs = jobs.filter((job) => {
    const company = job.company || '';
    const position = job.position || '';
    const notes = job.notes || '';

    return (
      company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      position.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notes.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const totalPages = Math.ceil(totalEntries / rowsPerPage) || 1;
  const indexOfFirstRow = totalEntries > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0;
  const indexOfLastRow = Math.min(currentPage * rowsPerPage, totalEntries);

  const statuses = [
    'All',
    'Applied',
    'I Rejected Them',
    'Waiting to Hear Back',
    'Pending',
    'No Response (Ghosted)',
    'Went With Another Candidate',
    'Rejection',
  ];

  return (
    <div className="w-full min-h-screen bg-gray-50 text-gray-900 m-0 p-0">
      <div className="w-full px-6 py-8">
        <h1 className="text-4xl font-bold text-center text-gray-900 mb-6">
          Job Hunt Application Tracker
        </h1>

        {/* Search Bar */}
        <div className="w-full max-w-2xl mx-auto mb-6">
          <input
            type="text"
            placeholder="Search jobs across company, position, notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {statuses.map((status) => (
            <button
              key={status}
              onClick={() => {
                setSelectedStatus(status);
                setCurrentPage(1);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedStatus === status
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-white text-gray-800 border border-gray-300 hover:bg-gray-100'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Pagination Controls Header */}
        <div className="w-full max-w-7xl mx-auto flex justify-between items-center mb-4 px-2 text-sm text-gray-700">
          <div>
            Showing <span className="font-semibold">{indexOfFirstRow}</span> to{' '}
            <span className="font-semibold">{indexOfLastRow}</span> of{' '}
            <span className="font-semibold">{totalEntries}</span> entries
          </div>

          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value={5}>5</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={75}>75</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
              <option value={500}>500</option>
            </select>
          </div>
        </div>

        {/* Jobs Table Container */}
        <div className="w-full bg-white shadow-md rounded-lg overflow-x-auto border border-gray-200 mb-6">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-100 border-b border-gray-200 text-gray-800">
              <tr>
                <th className="py-3 px-4 font-semibold w-16 text-center">#</th>
                <th className="py-3 px-4 font-semibold">Company</th>
                <th className="py-3 px-4 font-semibold">Position</th>
                <th className="py-3 px-4 font-semibold">Date Applied</th>
                <th className="py-3 px-4 font-semibold">WFH</th>
                <th className="py-3 px-4 font-semibold">Job Link</th>
                <th className="py-3 px-4 font-semibold">Notes</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-gray-800">
              {filteredJobs.length > 0 ? (
                filteredJobs.map((job, idx) => {
                  const rowNumber = (currentPage - 1) * rowsPerPage + idx + 1;
                  return (
                    <tr key={`${job.source_table}-${job.id || idx}`} className="hover:bg-gray-50">
                      <td className="py-3 px-4 text-center font-medium text-gray-500">{rowNumber}</td>
                      <td className="py-3 px-4 font-medium text-gray-900">{job.company}</td>
                      <td className="py-3 px-4 text-gray-800">{job.position}</td>
                      <td className="py-3 px-4 text-gray-700">{job.date_applied}</td>
                      <td className="py-3 px-4 text-gray-700">{job.wfh || '-'}</td>
                      <td className="py-3 px-4">
                        {job.job_link ? (
                          <a
                            href={job.job_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline font-medium"
                          >
                            Link
                          </a>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-700">{job.notes || '-'}</td>
                      <td className="py-3 px-4 text-right">
                        <button className="text-red-600 hover:text-red-800 text-sm font-medium">
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-500">
                    No jobs found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Navigation Footer */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 pb-8">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-gray-700 px-2">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}