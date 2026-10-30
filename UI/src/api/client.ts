const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export async function fetchJobsByBucket(tableKey: string, page = 1, limit = 25) {
  const offset = (page - 1) * limit;
  const endpoint = tableKey === 'all' 
    ? `${API_BASE_URL}/api/jobs/all?limit=${limit}&offset=${offset}`
    : `${API_BASE_URL}/api/jobs/${tableKey}?limit=${limit}&offset=${offset}`;

  const response = await fetch(endpoint);
  if (!response.ok) {
    throw new Error('Failed to fetch jobs from backend');
  }
  return response.json();
}