// filepath: c:\Users\bug_c\Desktop\jobTracker\scraper\jobscraper.ts
import dotenv from 'dotenv';
import path from 'path';
import { chromium } from 'playwright';
import { Pool } from 'pg';
import { scrapeLinkedIn } from './linkedInScraper';

// Load variables from the root .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

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
  'new_jobs_found',
  'applied',
  'i_rejected_them',
  'waiting_to_hear_back',
  'pending',
  'they_ghosted_me',
  'they_rejected_me',
  'disappointing',
];

export async function runJobScraper(searchQuery: string, headlessMode: boolean) {
  console.log(`🚀 Starting Job Scraping Pipeline with query: "${searchQuery}"`);

  const userDataDir = path.resolve(__dirname, '../my-browser-profile');

  const browserContext = await chromium.launchPersistentContext(userDataDir, {
    headless: headlessMode,
    viewport: { width: 1280, height: 800 },
  });

  const page = browserContext.pages()[0] ?? (await browserContext.newPage());

  const client = await pool.connect();
  let newJobsSavedCount = 0;

  try {
    const encodedQuery = encodeURIComponent(searchQuery);
    const searchUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodedQuery}`;

    console.log(`--- Navigating to: ${searchUrl} ---`);
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Handle sign-in modal if present
    const signInWithEmailBtn = page
      .locator('button:has-text("Sign in with Email"), button:has-text("Sign in")')
      .filter({ hasText: /email|sign in/i });

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

    const linkedinJobs = await scrapeLinkedIn(page, searchQuery);
    console.log(`Evaluating ${linkedinJobs.length} scraped jobs against all database buckets...`);

    for (const job of linkedinJobs) {
      let existsAnywhere = false;
      const cleanCompany = job.company.trim().toLowerCase();
      const cleanPosition = job.position.trim().toLowerCase();

      for (const table of VALID_TABLES) {
        const queryCheck = `
          SELECT 1
          FROM "${table}"
          WHERE LOWER(TRIM(company)) = $1
            AND LOWER(TRIM(position)) = $2
          LIMIT 1
        `;

        const res = await client.query(queryCheck, [cleanCompany, cleanPosition]);

        if (res.rows.length > 0) {
          existsAnywhere = true;
          console.log(`-> Duplicate skipped (Found in table "${table}"): ${job.company} - ${job.position}`);
          break;
        }
      }

      if (existsAnywhere) continue;

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

    return newJobsSavedCount;
  } catch (err) {
    console.error('Error during scraping pipeline:', err);
    return 0;
  } finally {
    client.release();
    await browserContext.close();
  }
}

async function main() {
  const args = process.argv.slice(2);
  let targetQuery = 'api automation testing remote';
  let headlessArg = true;

  args.forEach((arg) => {
    if (arg.startsWith('--target=')) {
      targetQuery = arg.replace('--target=', '').replace(/['"]+/g, '').trim();
    } else if (arg.startsWith('--headless=')) {
      headlessArg = arg.replace('--headless=', '').trim() === 'true';
    }
  });

  try {
    const saved = await runJobScraper(targetQuery, headlessArg);
    console.log(`Successfully saved ${saved} new jobs to the database.`);
    console.log('🏁 Scraping Pipeline Completed.');
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Fatal scraper error:', err);
    process.exitCode = 1;
  });
}