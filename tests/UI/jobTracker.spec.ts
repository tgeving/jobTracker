import { test, expect } from '@playwright/test';

// white background rgb(255, 255, 255)
// edit button light gray/blue rgb(226, 232, 240) (#e2e8f0)
// delete button light red background rgb(254, 215, 215) (#fed7d7)

declare global {
  var baseURL: string;
}

globalThis.baseURL = 'http://localhost:5173/';

// Define your bucket enum (you can also place this in a shared constants file)
enum JobBucket {
  All = 'All',
  NewJobsFound = 'New Jobs Found',
  Applied = 'Applied',
  IRejectedThem = 'I Rejected Them',
  WaitingToHearBack = 'Waiting to Hear Back',
  Pending = 'Pending',
  TheyGhostedMe = 'They Ghosted Me',
  TheyRejectedMe = 'They Rejected Me',
  Disappointing = 'Disappointing',
}

test('Validate bucket titles are named properly after table migration in the UI', async ({ page }) => {
  await page.goto(globalThis.baseURL);
  await expect(page.locator('h1')).toHaveText('JobFinder - Application Tracker');

  const tabs = page.locator('.tabs')
  for (const bucketName of Object.values(JobBucket)) {
    await expect(
      tabs.getByRole('button', { name: bucketName, exact: true })
    ).toHaveText(bucketName);
  }
});

test('Validate that btn backgrounds update properly when clicked on or off', async ({ page }) => {

  await page.goto(globalThis.baseURL);
  await expect(page.locator('h1')).toHaveText('JobFinder - Application Tracker');

  // 1. Get the tabs that the tests will be working with
  const allTab = page.locator('button', { hasText: 'All' });
  const rejectedTab = page.locator('button', { hasText: 'I Rejected Them' });

  // 2. Click the ALL button tab
  await allTab.click();

  // 3. Validate that the All tab now has the active blue background color
  await expect(allTab).toHaveCSS('background-color', 'rgb(49, 130, 206)');

  // 4. Click the Rejected button tab
  await rejectedTab.click();

  // 5. Validate that the Pending tab now has the active blue background color and All tab to have all white background
  await expect(rejectedTab).toHaveCSS('background-color', 'rgb(49, 130, 206)');
  await expect(allTab).toHaveCSS('background-color', 'rgb(255, 255, 255)');
});
