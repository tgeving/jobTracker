// filepath: c:\Users\bug_c\Desktop\jobTracker\scraper\jobscraper.ts
import dotenv from 'dotenv';
import path from 'path';
import { chromium } from 'playwright';
import { Pool } from 'pg';
import { scrapeLinkedIn } from './linkedInScraper';

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

const ALL_TRACKED_TABLES = [
  'new_jobs_found',
  'applied',
  'withdrew',
  'waiting_to_hear_back',
  'pending',
  'unresponsive',
  'declined',
  'disappointed',
];

// Helper to normalize strings: lowercase and strip punctuation (e.g. "Sr." vs "Sr")
function normalizeString(str: string): string {
  return (str || '')
    .toLowerCase()
    .replace(/[^\w\s]/gi, '') // Removes periods, commas, dashes, special chars
    .replace(/\s+/g, ' ')      // Collapses multiple spaces into one
    .trim();
}

export async function runJobScraper(searchQuery: string, headlessMode: boolean) {
  console.log(`🚀 Starting Job Scraping Pipeline with query: "${searchQuery}"`);
  console.log(`⚙️ Headless Mode is set to: ${headlessMode}`);

  const userDataDir = path.resolve(__dirname, '../my-browser-profile');
  console.log(`📂 Using browser profile directory: ${userDataDir}`);

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

    const linkedinJobs = await scrapeLinkedIn(page, searchQuery);
    console.log(`📊 Evaluation Phase: Total unique jobs extracted from LinkedIn = ${linkedinJobs.length}`);

    for (const job of linkedinJobs) {
      let existsAnywhere = false;
      const cleanCompany = normalizeString(job.company);
      const cleanPosition = normalizeString(job.position);

      if (!cleanCompany || !cleanPosition) continue;

      // Check against ALL historical tables with normalized comparison
      for (const table of ALL_TRACKED_TABLES) {
        try {
          const res = await client.query(`SELECT company, position FROM "${table}"`);
          
          const isDuplicate = res.rows.some(row => 
            normalizeString(row.company) === cleanCompany && 
            normalizeString(row.position) === cleanPosition
          );

          if (isDuplicate) {
            existsAnywhere = true;
            console.log(`-> Duplicate skipped (Normalized match in "${table}"): ${job.company} - ${job.position}`);
            break;
          }
        } catch (tableErr) {
          // Skip missing table errors gracefully
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
        console.log(`✨ -> Saved new job: ${job.company} - ${job.position}`);
        newJobsSavedCount++;
      } catch (dbErr) {
        console.error(`❌ DB Insert Error for ${job.company} - ${job.position}:`, dbErr);
      }
    }

    return newJobsSavedCount;
  } catch (err) {
    console.error('❌ Error during scraping pipeline execution:', err);
    return 0;
  } finally {
    client.release();
    await browserContext.close();
  }
}

async function main() {
  const args = process.argv.slice(2);
  let targetQuery = 'Senior QA Automation SDET Engineer Test Remote';
  let headlessArg = false;

  args.forEach((arg) => {
    if (arg.startsWith('--target=')) {
      targetQuery = arg.replace('--target=', '').replace(/['"]+/g, '').trim();
    } else if (arg.startsWith('--headless=')) {
      headlessArg = arg.replace('--headless=', '').trim() === 'true';
    }
  });

  try {
    const saved = await runJobScraper(targetQuery, headlessArg);
    console.log(`🎉 Successfully saved ${saved} new jobs to the database.`);
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