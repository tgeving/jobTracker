import { Page } from 'playwright';
import { ScrapedJob } from './jobscraper';

export async function scrapeLinkedIn(page: Page, searchQuery: string): Promise<ScrapedJob[]> {
  console.log(`--- Scraping LinkedIn Jobs for query: "${searchQuery}" (Max 4 Pages) ---`);

  // Explicitly construct and force navigation to the target search URL
  const encodedQuery = encodeURIComponent(searchQuery);
  const searchUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodedQuery}`;

  console.log(`--- Navigating directly to search feed: ${searchUrl} ---`);
  await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);

  // Handle any login prompts if they popped up on the way
  const emailInput = page.locator('input#session_key, input[name="session_key"], input[placeholder="Email or phone"]');
  const passwordInput = page.locator('input#session_password, input[name="session_password"], input[placeholder="Password"]');
  const submitButton = page.locator('button[type="submit"], button:has-text("Sign in")').last();

  if (await emailInput.first().isVisible({ timeout: 2000 }).catch(() => false)) {
    console.log('🔐 Login prompt detected during navigation. Entering credentials...');
    await emailInput.first().click();
    await emailInput.first().fill(process.env.LINKEDIN_EMAIL || '');
    await passwordInput.first().click();
    await passwordInput.first().fill(process.env.LINKEDIN_PASSWORD || '');
    await submitButton.click();
    await page.waitForTimeout(5000);
    
    // Re-navigate to the job search URL just in case logging in redirected to the feed
    console.log(`🔄 Re-navigating to jobs page post-login...`);
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);
  }

  try {
    // Wait for the main results container to load
    await page.waitForSelector('.jobs-search-results-list, .scaffold-layout__list, main', { timeout: 15000 });
  } catch (e) {
    console.log('⚠️ Timed out waiting for job list container. Continuing anyway...');
  }

  await page.waitForTimeout(4000);

  const allJobs: ScrapedJob[] = [];
  let currentPageNum = 1;
  const maxPagesLimit = 4; // Hard ceiling of 4 pages maximum

  while (currentPageNum <= maxPagesLimit) {
    console.log(`--- Scraping LinkedIn Page ${currentPageNum} of ${maxPagesLimit} ---`);

    // Perform an aggressive multi-step scroll to force LinkedIn's lazy loader to populate all cards
    await aggressiveScroll(page);

    // Broadened selector targeting any li or container wrapping job view links
    const jobCards = await page.locator('li, div').filter({ has: page.locator('a[href*="/jobs/view/"]') }).all();
    console.log(`Found ${jobCards.length} potential card containers on page ${currentPageNum}.`);

    for (const card of jobCards) {
      try {
        const linkElement = card.locator('a[href*="/jobs/view/"]').first();
        if (await linkElement.count() === 0) continue;

        // Strictly target actual job title elements first to avoid grabbing description blocks
        const titleElement = card.locator('.job-card-list__title, .base-search-card__title, a.job-card-container__link').first();
        const companyElement = card.locator('.job-card-container__company-name, .base-search-card__subtitle, .artdeco-entity-lockup__subtitle').first();

        if (await titleElement.count() === 0) continue;

        let title = '';
        try {
          title = (await titleElement.innerText()).trim();
        } catch {
          title = (await titleElement.textContent() || '').trim();
        }
        title = title.split('\n')[0].replace(/with verification/gi, '').trim();

        // Validation: Skip if the text is clearly a description block, too long, or invalid
        if (
          !title ||
          title.toLowerCase() === 'view job' ||
          title.length < 3 ||
          title.length > 90 || // Job titles shouldn't be whole paragraphs
          title.toLowerCase().includes('who we are') ||
          title.toLowerCase().includes('this position is') ||
          title.toLowerCase().includes('partner company')
        ) {
          continue;
        }

        let company = 'Unknown Company';
        if (await companyElement.count() > 0) {
          try {
            company = (await companyElement.innerText()).trim().split('\n')[0];
          } catch {
            company = (await companyElement.textContent() || '').trim().split('\n')[0];
          }
        }

        let jobLink = (await linkElement.getAttribute('href')) || '';

        if (jobLink && !jobLink.startsWith('http')) {
          jobLink = `https://www.linkedin.com${jobLink.split('?')[0]}`;
        } else if (jobLink) {
          jobLink = jobLink.split('?')[0];
        }

        if (!jobLink) continue;

        // Prevent duplicate entries in our local array
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
        // Ignore individual card parse noise
      }
    }

    console.log(`Successfully collected ${allJobs.length} unique jobs so far.`);

    if (currentPageNum >= maxPagesLimit) {
      console.log('🏁 Reached the maximum page limit of 4. Stopping pagination.');
      break;
    }

    // Pagination buttons
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

// Aggressive scroll function to ensure LinkedIn's virtualized list renders every card into the DOM
async function aggressiveScroll(page: Page) {
  try {
    await page.evaluate(async () => {
      const pane = document.querySelector('.jobs-search-results-list') || document.querySelector('.scaffold-layout__list') || window;
      for (let i = 0; i < 5; i++) {
        if (pane instanceof HTMLElement) {
          pane.scrollBy(0, 800);
        } else {
          window.scrollBy(0, 800);
        }
        await new Promise((resolve) => setTimeout(resolve, 600));
      }
    });
    await page.waitForTimeout(2000);
  } catch (err) {
    console.log('Scroll action skipped:', err);
  }
}