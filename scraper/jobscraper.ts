import dotenv from 'dotenv';
import path from 'path';
import { chromium } from 'playwright';
import { Pool } from 'pg';
import { scrapeLinkedIn } from './linkedInScraper';

// Load variables from the root .env file
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

// All valid buckets/tables to check against existing applications
const VALID_TABLES = [
  "new_jobs_found",
  "applied", 
  "i_rejected_them", 
  "waiting_to_hear_back", 
  "pending", 
  "shit_heads_ghosted_me", 
  "assholes_rejected_me", 
  "fuckers"
];

async function runJobScraper(searchQuery: string, headlessMode: boolean) {
  console.log(`🚀 Starting Job Scraping Pipeline with query: "${searchQuery}"`);

  const userDataDir = path.join(__dirname, '../my-browser-profile');

  const browserContext = await chromium.launchPersistentContext(userDataDir, {
    headless: headlessMode, 
    viewport: { width: 1280, height: 800 },
  });

  const pages = browserContext.pages();
  const page = pages.length > 0 ? pages[0] : await browserContext.newPage();
  
  const client = await pool.connect();
  let newJobsSavedCount = 0;

  try {
    const encodedQuery = encodeURIComponent(searchQuery);
    const searchUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodedQuery}`;
    
    console.log(`--- Navigating to: ${searchUrl} ---`);
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Handle sign-in modal if present
    const signInWithEmailBtn = page.locator('button:has-text("Sign in with Email"), button:has-text("Sign in")').filter({ hasText: /email|sign in/i });
    if (await signInWithEmailBtn.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await signInWithEmailBtn.first().click();
      await page.waitForTimeout(2000);
    }

    const emailInput = page.locator('input#session_key, input[name="session_key"], input[placeholder="Email or phone"]');
    const passwordInput = page.locator('input#session_password, input[name="session_password"], input[placeholder="Password"]');
    const submitButton = page.locator('button[type="submit"], button:has-text("Sign in")').last();

    if (await emailInput.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await emailInput.first().click();
      await emailInput.first().fill(process.env.LINKEDIN_EMAIL || '');
      await passwordInput.first().click();
      await passwordInput.first().fill(process.env.LINKEDIN_PASSWORD || '');
      await submitButton.click();
      await page.waitForTimeout(5000);
    }

    // Run scraper (capped at 4 pages max)
    const linkedinJobs = await scrapeLinkedIn(page, searchQuery);
    console.log(`Evaluating ${linkedinJobs.length} scraped jobs against all database buckets...`);

    // Process and check duplicates across ALL tables
    for (const job of linkedinJobs) {
      let existsAnywhere = false;
      const cleanCompany = job.company.trim().toLowerCase();
      const cleanPosition = job.position.trim().toLowerCase();

      // Check every single table for matching company AND position
      for (const table of VALID_TABLES) {
        const queryCheck = `
          SELECT 1 FROM "${table}" 
          WHERE LOWER(TRIM(company)) = $1 AND LOWER(TRIM(position)) = $2 
          LIMIT 1
        `;
        const res = await client.query(queryCheck, [cleanCompany, cleanPosition]);
        if (res.rowCount && res.rowCount > 0) {
          existsAnywhere = true;
          console.log(`-> Duplicate skipped (Found in table "${table}"): ${job.company} - ${job.position}`);
          break;
        }
      }

      if (existsAnywhere) continue;

      // Safe to insert into new_jobs_found since it doesn't exist anywhere else
      try {
        const insertQuery = `
          INSERT INTO new_jobs_found (company, position, job_link, wfh)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT DO NOTHING
        `;
        await client.query(insertQuery, [job.company, job.position, job.jobLink, job.wfh]);
        console.log(`-> Saved new job: ${job.company} - ${job.position}`);
        newJobsSavedCount++;
      } catch (dbErr) {
        console.error(`❌ DB Insert Error for ${job.company} - ${job.position}:`, dbErr);
      }
    }

  } catch (err) {
    console.error('Error during scraping pipeline:', err);
  } finally {
    client.release();
    await browserContext.close();
    await pool.end();
    console.log(`Successfully saved ${newJobsSavedCount} new jobs to the database.`);
    console.log('🏁 Scraping Pipeline Completed.');
  }
}

const args = process.argv.slice(2);
let targetQuery = 'api automation testing remote';
let headlessArg = true;

args.forEach(arg => {
  if (arg.startsWith('--target=')) {
    targetQuery = arg.replace('--target=', '').replace(/['"]+/g, '').trim();
  } else if (arg.startsWith('--headless=')) {
    headlessArg = arg.replace('--headless=', '').trim() === 'true';
  }
});

runJobScraper(targetQuery, headlessArg);