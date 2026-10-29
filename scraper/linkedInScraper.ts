import { Page } from 'playwright';
import { ScrapedJob } from './jobscraper';

export async function scrapeLinkedIn(page: Page, searchQuery: string): Promise<ScrapedJob[]> {
  console.log(`--- Scraping LinkedIn Jobs for query: "${searchQuery}" (Max 4 Pages) ---`);

  try {
    await page.waitForSelector('.jobs-search-results-list, .scaffold-layout__list', { timeout: 15000 });
  } catch (e) {
    console.log('⚠️ Timed out waiting for job list container. Continuing anyway...');
  }

  await page.waitForTimeout(3000);

  const allJobs: ScrapedJob[] = [];
  let currentPageNum = 1;
  const maxPagesLimit = 4; // Hard ceiling of 4 pages maximum

  while (currentPageNum <= maxPagesLimit) {
    console.log(`--- Scraping LinkedIn Page ${currentPageNum} of ${maxPagesLimit} ---`);

    await autoScroll(page);

    const jobCards = await page.locator('li.jobs-search-results__list-item, div.job-card-container, .scaffold-layout__list-item').all();
    console.log(`Found ${jobCards.length} raw cards on page ${currentPageNum}.`);

    for (const card of jobCards) {
      try {
        const titleElement = card.locator('.job-card-list__title, .job-card-container__link strong, a.disabled.ember-view');
        const companyElement = card.locator('.job-card-container__company-name, .artdeco-entity-lockup__subtitle');
        const linkElement = card.locator('a.job-card-container__link, a.card-click-target, a[href*="/jobs/view/"]');

        if (await titleElement.count() === 0 || await companyElement.count() === 0) {
          continue;
        }

        let title = (await titleElement.first().innerText()).trim();
        title = title.split('\n')[0].replace(/with verification/gi, '').trim();

        let company = (await companyElement.first().innerText()).trim();
        company = company.split('\n')[0].trim();

        let jobLink = (await linkElement.first().getAttribute('href')) || '';

        if (jobLink && !jobLink.startsWith('http')) {
          jobLink = `https://www.linkedin.com${jobLink.split('?')[0]}`;
        } else if (jobLink) {
          jobLink = jobLink.split('?')[0];
        }

        if (!jobLink) continue;

        if (allJobs.some(j => j.jobLink === jobLink || (j.company.toLowerCase() === company.toLowerCase() && j.position.toLowerCase() === title.toLowerCase()))) {
          continue;
        }

        allJobs.push({
          company,
          position: title,
          jobLink,
          wfh: 'Remote'
        });
      } catch (cardErr) {
        console.error('Error parsing LinkedIn job card:', cardErr);
      }
    }

    if (currentPageNum >= maxPagesLimit) {
      console.log('🏁 Reached the maximum page limit of 4. Stopping pagination.');
      break;
    }

    const nextButton = page.locator('button.artdeco-pagination__button--next, button[aria-label="View next page"]');
    const specificNextPageBtn = page.locator(`button[aria-label="Page ${currentPageNum + 1}"]`);

    let targetNextBtn = specificNextPageBtn.first();
    if (!(await targetNextBtn.isVisible().catch(() => false))) {
      targetNextBtn = nextButton.first();
    }

    const isNextVisible = await targetNextBtn.isVisible().catch(() => false);
    if (!isNextVisible) {
      console.log('🏁 No further page buttons found. Ending pagination.');
      break;
    }

    const isDisabled = await targetNextBtn.getAttribute('disabled');
    if (isDisabled !== null) {
      console.log('🏁 Next page button is disabled. Reached the end.');
      break;
    }

    console.log(`➡️ Moving to LinkedIn page ${currentPageNum + 1}...`);
    await targetNextBtn.click();
    currentPageNum++;
    await page.waitForTimeout(4000);
  }

  console.log(`Successfully parsed a total of ${allJobs.length} unique jobs across up to 4 pages.`);
  return allJobs;
}

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