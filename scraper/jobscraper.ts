import dotenv from 'dotenv';
import path from 'path';
import { chromium } from 'playwright';
import { Pool } from 'pg';
import { scrapeLinkedIn } from './linkedInScraper';

// Load variables from the root .env file
dotenv.config({ path: path.join(__dirname, '../.env') });

// Configure your PostgreSQL connection using environment variables
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

async function runJobScraper(searchQuery: string, headlessMode: boolean) {
  console.log(`🚀 Starting Job Scraping Pipeline with query: "${searchQuery}"`);

  // Define a local directory to persist your login session cookies across runs
  const userDataDir = path.join(__dirname, '../my-browser-profile');

  // Launch a persistent browser context so you stay logged in
  const browserContext = await chromium.launchPersistentContext(userDataDir, {
    headless: headlessMode, 
    viewport: { width: 1280, height: 800 },
  });

  // Ensure we only use a single page to prevent duplicate windows
  const pages = browserContext.pages();
  const page = pages.length > 0 ? pages[0] : await browserContext.newPage();
  
  const client = await pool.connect();
  let newJobsSavedCount = 0;

  try {
    // 1. Navigate to LinkedIn Job Search directly with clean query string
    const encodedQuery = encodeURIComponent(searchQuery);
    const searchUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodedQuery}`;
    
    console.log(`--- Navigating to: ${searchUrl} ---`);
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // 2. Check if the "Sign in to view more jobs" modal popup is blocking the screen
    const signInWithEmailBtn = page.locator('button:has-text("Sign in with Email"), button:has-text("Sign in")').filter({ hasText: /email|sign in/i });
    
    if (await signInWithEmailBtn.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('🔑 Sign-in modal detected on page. Clicking "Sign in with Email"...');
      await signInWithEmailBtn.first().click();
      await page.waitForTimeout(2000);
    }

    // 3. Check if standard email/password inputs are visible
    const emailInput = page.locator('input#session_key, input[name="session_key"], input[placeholder="Email or phone"]');
    const passwordInput = page.locator('input#session_password, input[name="session_password"], input[placeholder="Password"]');
    const submitButton = page.locator('button[type="submit"], button:has-text("Sign in")').last();

    if (await emailInput.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('✍️ Filling credentials from .env into login form...');

      await emailInput.first().click();
      await emailInput.first().fill(process.env.LINKEDIN_EMAIL || '');

      await passwordInput.first().click();
      await passwordInput.first().fill(process.env.LINKEDIN_PASSWORD || '');

      await submitButton.click();

      try {
        await page.waitForTimeout(5000);
        console.log('✅ Credentials submitted!');
      } catch (err) {
        console.log('⚠️ Please complete any manual verification if prompted.');
      }
    } else {
      console.log('✨ Session active or no login fields needed.');
    }

    // 4. Run LinkedIn Scraper
    console.log('--- Scraping LinkedIn Jobs ---');
    const linkedinJobs = await scrapeLinkedIn(page, searchQuery);

    // 5. Process, check duplicates against new_jobs_found, and save jobs
    for (const job of linkedinJobs) {
      // Check specifically within the new_jobs_found table
      const duplicateCheck = `
        SELECT 1 FROM new_jobs_found 
        WHERE LOWER(company) = LOWER($1) AND LOWER(position) = LOWER($2) 
        LIMIT 1
      `;
      const existing = await client.query(duplicateCheck, [job.company, job.position]);

      if (existing.rowCount && existing.rowCount > 0) {
        console.log(`-> Duplicate skipped (Already in new_jobs_found): ${job.company} - ${job.position}`);
        continue;
      }

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

// --- Robust CLI Argument Parsing ---
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
