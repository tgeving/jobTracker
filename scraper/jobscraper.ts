import dotenv from 'dotenv';
import path from 'path';
import { chromium } from 'playwright';
import { Pool } from 'pg';
import { scrapeLinkedIn } from './linkedInScraper';

// Configure your PostgreSQL connection
dotenv.config({ path: path.join(__dirname, '../.env') });
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT) || 5432,
});

export interface ScrapedJob {
  company: string;
  position: string;
  jobLink: string;
  wfh: string;
}

async function runJobScraper(searchQuery: string) {
  console.log(`🚀 Starting Job Scraping Pipeline with query: "${searchQuery}"`);
  
  // Set headless to true once you are done debugging visually
  const browser = await chromium.launch({ headless: false }); 
  const context = await browser.newContext();
  const page = await context.newPage();

  const client = await pool.connect();

  try {
    // 1. Run LinkedIn Scraper
    console.log('--- Scraping LinkedIn ---');
    const linkedinJobs = await scrapeLinkedIn(page, searchQuery);

    // 2. Process and save jobs to PostgreSQL
    for (const job of linkedinJobs) {
      // Check across tables for duplicates to prevent spamming your database
      const duplicateCheck = `
        SELECT 1 FROM new_jobs_found WHERE company = $1 AND position = $2
        UNION
        SELECT 1 FROM applied WHERE company = $1 AND position = $2
        UNION
        SELECT 1 FROM waiting_to_hear_back WHERE company = $1 AND position = $2
      `;
      const existing = await client.query(duplicateCheck, [job.company, job.position]);

      if (existing.rowCount && existing.rowCount > 0) {
        console.log(`-> Duplicate skipped: ${job.company} - ${job.position}`);
        continue;
      }

      // Insert into new_jobs_found
      const insertQuery = `
        INSERT INTO new_jobs_found (company, position, job_link, wfh)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT DO NOTHING
      `;
      await client.query(insertQuery, [job.company, job.position, job.jobLink, job.wfh]);
      console.log(`-> Saved new job: ${job.company} - ${job.position}`);
    }

    // Future expansion: 
    // const indeedJobs = await scrapeIndeed(page, searchQuery);
    // ... insert indeed jobs here ...

  } catch (err) {
    console.error('Error during scraping pipeline:', err);
  } finally {
    client.release();
    await browser.close();
    await pool.end();
    console.log('🏁 Scraping Pipeline Completed.');
  }
}

// Grab the search query from command line arguments, or fallback to default
const args = process.argv.slice(2);
const searchQuery = args.length > 0 ? args.join(' ') : 'api automation testing remote';

// Execute the pipeline
runJobScraper(searchQuery);
