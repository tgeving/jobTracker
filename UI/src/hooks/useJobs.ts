import { useState, useEffect } from 'react';
import { JobBuckets } from '../constants/buckets';

const API_BASE = 'http://localhost:8000';

export function useJobs() {
  const [jobData, setJobData] = useState<{ total: number; items: any[] }>({ total: 0, items: [] });
  const [allJobsCache, setAllJobsCache] = useState<any[]>([]);
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
  const [jobToDelete, setJobToDelete] = useState<any>(null);

  // Job Form States (Add & Edit)
  const [isEditing, setIsEditing] = useState(false);
  const [editingJobId, setEditingJobId] = useState<any>(null);
  const [editingJobTable, setEditingJobTable] = useState<string>('');
  const [jobForm, setJobForm] = useState({ company: '', position: '', date_applied: '', wfh: '', notes: '', job_link: '' });

  // Scraper Form States
  const [scraperPlatform, setScraperPlatform] = useState('linkedin');
  const [scraperTarget, setScraperTarget] = useState('');
  const [scraperHeadless, setScraperHeadless] = useState(true);
  const [scraping, setScraping] = useState(false);

  const fetchJobs = (bucketKey: string) => {
    setLoading(true);
    setCurrentPage(1);
    const endpoint = bucketKey === 'all' ? `${API_BASE}/api/jobs/all` : `${API_BASE}/api/jobs/${bucketKey}`;

    fetch(endpoint)
      .then(res => res.json())
      .then(data => { setJobData(data); setLoading(false); })
      .catch(err => { console.error(err); setLoading(false); });
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

  // Metrics, Search, and Pagination Calculations
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

  const filteredItems = datasetToCount.filter(job => {
    const q = activeSearchTerm.toLowerCase();
    if (!q) return true;
    return (job.company || '').toLowerCase().includes(q) || (job.position || '').toLowerCase().includes(q) || (job.notes || '').toLowerCase().includes(q);
  }).sort((a, b) => b.id - a.id);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentTableItems = filteredItems.slice(startIndex, startIndex + itemsPerPage);

  return {
    jobData, selectedBucket, setSelectedBucket, searchQuery, setSearchQuery, activeSearchTerm, setActiveSearchTerm,
    loading, currentPage, setCurrentPage, itemsPerPage, setItemsPerPage, showJobModal, setShowJobModal,
    showScraperModal, setShowScraperModal, jobToDelete, setJobToDelete, isEditing, setIsEditing,
    setEditingJobId, setEditingJobTable, jobForm, setJobForm, scraperPlatform, setScraperPlatform,
    scraperTarget, setScraperTarget, scraperHeadless, setScraperHeadless, scraping, metricsData,
    filteredItems, totalPages, startIndex, currentTableItems, handleMoveJob, confirmDeleteJob,
    handleSaveJob, handleRunScraper
  };
}