export const JobBuckets = {
  All: 'all',
  NewJobsFound: 'new_jobs_found',
  Applied: 'applied',
  Withdrew: 'withdrew',
  WaitingToHearBack: 'waiting_to_hear_back',
  Pending: 'pending',
  Unresponsive: 'unresponsive',
  Declined: 'declined',
  Disappointed: 'disappointed',
} as const;

// Labels for rendering on buttons
export const JobBucketLabels: Record<keyof typeof JobBuckets, string> = {
  All: 'All',
  NewJobsFound: 'New Jobs Found',
  Applied: 'Applied',
  Withdrew: 'Withdrew',
  WaitingToHearBack: 'Waiting to Hear Back',
  Pending: 'Pending',
  Unresponsive: 'Unresponsive',
  Declined: 'Declined',
  Disappointed: 'Disappointed',
};