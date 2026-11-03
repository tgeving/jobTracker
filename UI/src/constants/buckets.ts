export const JobBuckets = {
  All: 'all',
  NewJobsFound: 'new_jobs_found',
  Applied: 'applied',
  IRejectedThem: 'i_rejected_them',
  WaitingToHearBack: 'waiting_to_hear_back',
  Pending: 'pending',
  Unresponsive: 'unresponsive',
  TheyRejectedMe: 'they_rejected_me',
  Disappointed: 'disappointed',
} as const;

// Labels for rendering on buttons
export const JobBucketLabels: Record<keyof typeof JobBuckets, string> = {
  All: 'All',
  NewJobsFound: 'New Jobs Found',
  Applied: 'Applied',
  IRejectedThem: 'I Rejected Them',
  WaitingToHearBack: 'Waiting to Hear Back',
  Pending: 'Pending',
  Unresponsive: 'Unresponsive',
  TheyRejectedMe: 'They Rejected Me',
  Disappointed: 'Disappointed',
};