import React, { useState } from 'react';
import axios from 'axios';

export default function ScraperManager() {
  const [isOpen, setIsOpen] = useState(false);
  const [platform, setPlatform] = useState('LinkedIn');
  const [target, setTarget] = useState('Senior SDET');
  const [headless, setHeadless] = useState(true);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string | null>(null);

  const handleExecuteScraper = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLogs(null);

    try {
      const response = await axios.post('http://localhost:8000/api/scraper/run', {
        platform,
        target,
        headless
      });
      setLogs(response.data.message);
    } catch (err: any) {
      setLogs(err.response?.data?.detail || 'Failed to execute scraper.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="inline-block ml-3">
      {/* The Run Scraper Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2 rounded-md shadow-sm transition-colors text-sm flex items-center gap-2"
      >
        <span>Run Scraper</span>
      </button>

      {/* The Modal Popup Form */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800">Configure Automated Scraper</h3>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-xl"
              >
                &times;
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleExecuteScraper} className="p-6 space-y-4">
              
              {/* Platform Dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Platform</label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="CareerBuilder">CareerBuilder</option>
                  <option value="Indeed">Indeed</option>
                </select>
              </div>

              {/* Search Params / Target Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search Parameter / Target Role</label>
                <input
                  type="text"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder="e.g. Senior SDET"
                  required
                  className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Headless Toggle Option */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="headlessToggle"
                  checked={headless}
                  onChange={(e) => setHeadless(e.target.checked)}
                  className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <label htmlFor="headlessToggle" className="text-sm text-gray-700">Run in headless mode (background)</label>
              </div>

              {/* Execution Feedback / Logs */}
              {logs && (
                <div className={`p-3 rounded text-xs ${logs.includes('Failed') ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-800'}`}>
                  {logs}
                </div>
              )}

              {/* Modal Footer Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-sm font-medium shadow transition-colors disabled:opacity-50"
                >
                  {loading ? 'Executing...' : 'Execute'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}