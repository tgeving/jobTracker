import { test, expect } from '@playwright/test';

test('JobFinder application loads and displays the correct title', async ({ page }) => {
  // 1. Navigate to your running local React app
  await page.goto('http://localhost:5173/');

  // 2. Assert that the browser tab title equals "Job Finder"
  await expect(page).toHaveTitle('Job Finder');

  // 3. Assert that the main heading header is visible on the page
  const headerHeading = page.locator('h1', { hasText: 'JobFinder - Application Tracker' });
  await expect(headerHeading).toBeVisible();
});