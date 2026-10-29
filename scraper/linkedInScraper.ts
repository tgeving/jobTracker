import { Page } from 'playwright';
import { ScrapedJob } from './jobscraper';

export async function scrapeLinkedIn(page: Page, searchQuery: string): Promise<ScrapedJob[]> {
  console.log(`--- Scraping LinkedIn Jobs for query: "${searchQuery}" ---`);

  // Wait explicitly for the job results list container to appear on the page
  try {
    await page.waitForSelector('.jobs-search-results-list, .scaffold-layout__list', { timeout: 15000 });
  } catch (e) {
    console.log('⚠️ Timed out waiting for job list container. Continuing anyway...');
  }

  // Allow a brief moment for initial cards to render
  await page.waitForTimeout(3000);

  // Auto-scroll down to trigger lazy loading of more job cards
  await autoScroll(page);

  // Use a flexible combined locator to catch LinkedIn's job card items
  const jobCards = await page.locator('li.jobs-search-results__list-item, div.job-card-container, .scaffold-layout__list-item').all();
  console.log(`Found ${jobCards.length} raw cards on LinkedIn.`);

  const jobs: ScrapedJob[] = [];

  for (const card of jobCards) {
    try {
      // Look for title and company using flexible inner selectors
      const titleElement = card.locator('.job-card-list__title, .job-card-container__link strong, a.disabled.ember-view');
      const companyElement = card.locator('.job-card-container__company-name, .artdeco-entity-lockup__subtitle');
      const linkElement = card.locator('a.job-card-container__link, a.card-click-target, a[href*="/jobs/view/"]');

      if (await titleElement.count() === 0 || await companyElement.count() === 0) {
        continue;
      }

      // Clean up the title text and remove duplicate sub-lines/spans
      let title = (await titleElement.first().innerText()).trim();
      title = title.split('\n')[0].trim();

      const company = (await companyElement.first().innerText()).trim();
      let jobLink = (await linkElement.first().getAttribute('href')) || '';

      // Clean up relative links and query parameters
      if (jobLink && !jobLink.startsWith('http')) {
        jobLink = `https://www.linkedin.com${jobLink.split('?')[0]}`;
      } else if (jobLink) {
        jobLink = jobLink.split('?')[0];
      }

      // Avoid duplicates inside the current run batch
      if (jobs.some(j => j.jobLink === jobLink)) continue;

      jobs.push({
        company,
        position: title,
        jobLink,
        wfh: 'Remote'
      });
    } catch (cardErr) {
      console.error('Error parsing LinkedIn job card:', cardErr);
    }
  }

  console.log(`Successfully parsed ${jobs.length} unique jobs.`);
  return jobs;
}

// Helper function to scroll down the results pane so LinkedIn loads more jobs dynamically
async function autoScroll(page: Page) {
  try {
    await page.evaluate(async () => {
      const jobListContainer = document.querySelector('.jobs-search-results-list');
      if (jobListContainer) {
        jobListContainer.scrollTop = jobListContainer.scrollHeight;
      } else {
        window.scrollTo(0, document.body.scrollHeight);
      }
    });
    await page.waitForTimeout(2000);
  } catch (err) {
    console.log('Auto-scroll skipped:', err);
  }
}