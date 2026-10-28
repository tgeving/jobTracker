import { Page } from 'playwright';
import { ScrapedJob } from './jobscraper';

export async function scrapeLinkedIn(page: Page, searchQuery: string): Promise<ScrapedJob[]> {
  const encodedQuery = encodeURIComponent(searchQuery);
  const url = `https://www.linkedin.com/jobs/search/?keywords=${encodedQuery}`;

  console.log(`Navigating to: ${url}`);
  await page.goto(url);
  await page.waitForTimeout(5000); // Allow initial DOM to load

  // Optional: Auto-scroll down to trigger lazy loading of more job cards
  await autoScroll(page);

  const jobCards = await page.locator('.job-card-container').all();
  console.log(`Found ${jobCards.length} raw cards on LinkedIn.`);

  const jobs: ScrapedJob[] = [];

  for (const card of jobCards) {
    try {
      const titleElement = card.locator('.job-card-list__title');
      const companyElement = card.locator('.job-card-container__company-name');
      const linkElement = card.locator('a.job-card-container__link');

      if (await titleElement.count() === 0 || await companyElement.count() === 0) {
        continue;
      }

      const title = (await titleElement.innerText()).trim();
      const company = (await companyElement.innerText()).trim();
      const jobLink = (await linkElement.getAttribute('href')) || '';

      jobs.push({
        company,
        position: title,
        jobLink: jobLink.startsWith('http') ? jobLink : `https://www.linkedin.com${jobLink}`,
        wfh: 'Remote' // Since your query specifies remote
      });
    } catch (cardErr) {
      console.error('Error parsing LinkedIn job card:', cardErr);
    }
  }

  return jobs;
}

// Helper function to scroll down a page so LinkedIn loads more jobs dynamically
async function autoScroll(page: Page) {
  await page.evaluate(async () => {
    const jobListContainer = document.querySelector('.jobs-search-results-list');
    if (jobListContainer) {
      jobListContainer.scrollTop = jobListContainer.scrollHeight;
    } else {
      window.scrollTo(0, document.body.scrollHeight);
    }
  });
  await page.waitForTimeout(2000);
}