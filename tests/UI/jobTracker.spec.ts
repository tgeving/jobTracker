import { test, expect } from '@playwright/test';

// white background rgb(255, 255, 255)
// edit button light gray/blue rgb(226, 232, 240) (#e2e8f0)
// delete button light red background rgb(254, 215, 215) (#fed7d7)

declare global {
  var baseURL: string;
}

globalThis.baseURL = 'http://localhost:5173/';

// Define your allowed bucket types
export type BucketKey = 
  | 'all' 
  | 'new_jobs_found' 
  | 'applied' 
  | 'waiting_to_hear_back' 
  | 'pending' 
  | 'i_rejected_them' 
  | 'they_ghosted_me' 
  | 'they_rejected_me' 
  | 'disappointing';

export interface BucketItem {
  key: BucketKey;
  label: string;
}

// Your centralized list of buckets
export const JobBuckets: BucketItem[] = [
  { key: 'all', label: 'All' },
  { key: 'new_jobs_found', label: 'New Jobs Found' },
  { key: 'applied', label: 'Applied' },
  { key: 'waiting_to_hear_back', label: 'Waiting To Hear Back' },
  { key: 'pending', label: 'Pending' },
  { key: 'i_rejected_them', label: 'I Rejected Them' },
  { key: 'they_ghosted_me', label: 'They Ghosted Me' },
  { key: 'they_rejected_me', label: 'They Rejected Me' },
  { key: 'disappointing', label: 'Disappointing' },
];

test('Validate bucket headers are named properly after table migration in the UI', async ({ page }) => {
  await page.goto(globalThis.baseURL);
  await expect(page.locator('h1')).toHaveText('JobFinder - Application Tracker');

  const tabs = page.locator('.tabs')
  for (const bucketName of JobBuckets.map(bucket => bucket.label)) {
    await expect(
      tabs.getByRole('button', { name: bucketName, exact: true })
    ).toHaveText(bucketName);
  }
});

test('Validate "Add New Job" and "Run Scraper" buttons are present in the UI', async ({ page }) => {
  await page.goto(globalThis.baseURL);
  await expect(page.getByRole('button', { name: 'Add New Job', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Run Scraper', exact: true })).toBeVisible();
});

test('Validate "Edit" and "Delete" buttons are present in the UI', async ({ page }) => {
  await page.goto(globalThis.baseURL);
  const row = page.locator('table tbody tr').first();
  const editButton = row.getByRole('button', { name: 'Edit', exact: true });
  const deleteButton = row.getByRole('button', { name: 'Delete', exact: true });
  
  await expect(editButton).toBeVisible();
  await expect(deleteButton).toBeVisible();
});

test('Validate Move To column dropdown has the correct value types', async ({ page }) => {
  await page.goto(globalThis.baseURL);
  const row = page.locator('table tbody tr').first();
  const col = row.locator('td').filter({ hasText: 'Move To' });

  const dropdown = col.locator('select');

  for (const bucketName of JobBuckets.map(bucket => bucket.label)) {
    if (bucketName !== 'All') await expect(dropdown.getByRole('option', { name: bucketName, exact: true })).toHaveText(bucketName);
    else continue; // Skip the "All" option since it's not a valid move-to option
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
  //await expect(allTab).toHaveCSS('background-color', 'rgb(49, 130, 206)');
  await expect(allTab).toHaveClass(/active/);

  // 4. Click the Rejected button tab
  await rejectedTab.click();

  // 5. Validate that the Pending tab now has the active blue background color and All tab to have all white background
  await expect(rejectedTab).toHaveClass(/active/);
  await expect(allTab).not.toHaveClass(/active/);
});
