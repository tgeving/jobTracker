// Define an interface for our job application data
interface JobItem {
  id: number;
  company: string;
  position: string;
  status: 'applied' | 'pending' | 'rejected';
  salary?: number;
}

// Mock dataset
const jobDatabase: JobItem[] = [
  { id: 1, company: 'QualiZeal', position: 'Sr Principle Test Architect', status: 'applied', salary: 145000 },
  { id: 2, company: 'Suralink', position: 'QA Tech Lead', status: 'pending', salary: 135000 },
  { id: 3, company: 'Google', position: 'Software Engineer in Test', status: 'rejected', salary: 160000 },
  { id: 4, company: 'Microsoft', position: 'Automation Engineer', status: 'applied', salary: 140000 },
];

console.log('=== 1. FILTER & MAP (Chaining) ===');
// Extracts only company names where the status is 'applied'
const appliedCompanies: string[] = jobDatabase.filter(job => job.status === 'applied').map(job => job.company);
console.log('Applied Companies:', appliedCompanies); 
// Expected Output: [ 'QualiZeal', 'Microsoft' ]


console.log('\n=== 2. TRADITIONAL FOR...OF LOOP ===');
// Iterates through every item manually to log formatted strings
for (const job of jobDatabase) {
  console.log(`Company: ${job.company} | Position: ${job.position}`);
}


console.log('\n=== 3. FIND METHOD ===');
// Searches and returns the first matching object
const foundJob = jobDatabase.find(job => job.company.toLowerCase() === 'suralink');
console.log('Found Job:', foundJob); 
// Expected Output: { id: 2, company: 'Suralink', position: 'QA Tech Lead', ... }


console.log('\n=== 4. REDUCE METHOD (Aggregation / Math) ===');
// Calculates the total sum and average of all salaries
const totalSalary = jobDatabase.reduce((accumulator, job) => accumulator + (job.salary || 0), 0);
const averageSalary = totalSalary / jobDatabase.length;
console.log(`Average Salary: $${averageSalary}`);


console.log('\n=== 5. REDUCE METHOD (Grouping Data) ===');
// Groups job items into a dictionary object keyed by their status
const groupedByStatus = jobDatabase.reduce((acc, job) => {
  if (!acc[job.status]) {
    acc[job.status] = [];
  }
  acc[job.status].push(job);
  return acc;
}, {} as Record<string, JobItem[]>);

console.log('Grouped by Status:', groupedByStatus);

