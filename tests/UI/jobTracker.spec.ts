import { test, expect } from '@playwright/test';

declare global {
  var baseURL: string;
}

globalThis.baseURL = 'http://localhost:5173/';

// Define your allowed bucket types (matching your database/UI states)
export type BucketKey = 
  | 'all' 
  | 'new_jobs_found' 
  | 'applied' 
  | 'waiting_to_hear_back' 
  | 'pending' 
  | 'withdrew' 
  | 'unresponsive'
  | 'declined' 
  | 'disappointed';

export interface BucketItem {
  key: BucketKey;
  label: string;
}

// Your centralized list of buckets
export const JobBuckets: BucketItem[] = [
  { key: 'all', label: 'All' },
  { key: 'new_jobs_found', label: 'New Jobs' },
  { key: 'applied', label: 'Applied' },
  { key: 'withdrew', label: 'Withdrew' },
  { key: 'waiting_to_hear_back', label: 'Waiting To Hear Back' },
  { key: 'pending', label: 'Pending' },
  { key: 'withdrew', label: 'Withdrew' },
  { key: 'unresponsive', label: 'Unresponsive' },
  { key: 'declined', label: 'Declined' },
  { key: 'disappointed', label: 'Disappointed' },
];

test.describe('JobTracker UI Comprehensive Suite', () => {

  test('Validate bucket tab headers are named properly in the UI', async ({ page }) => {
    await page.goto(globalThis.baseURL);
    await expect(page.locator('h1')).toHaveText('JobFinder - Application Tracker');

    for (const bucketName of JobBuckets.map(bucket => bucket.label)) {
      await expect(
        page.getByRole('button', { name: bucketName, exact: true }).first()
      ).toBeVisible();
    }
  });

  test('Validate core control buttons and search bar are present in the UI', async ({ page }) => {
    await page.goto(globalThis.baseURL);
    await expect(page.getByRole('button', { name: 'Add New Job', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Run Scraper', exact: true })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Search all buckets', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Search', exact: true })).toBeVisible();
  });

  test('Validate that table headers appear properly in the UI', async ({ page }) => {
    await page.goto(globalThis.baseURL);
    const tableHeaders = ['#', 'Company', 'Position', 'Date Applied', 'WFH', 'Link', 'Notes', 'Interviews', 'Move to', 'Actions'];

    await expect(page.locator('table thead th')).toHaveText(tableHeaders);
  });

  test('Validate "Edit" and "Delete" buttons are present in table rows', async ({ page }) => {
    await page.goto(globalThis.baseURL);
    const row = page.locator('table tbody tr').first();
    const editButton = row.getByRole('button', { name: 'Edit', exact: true });
    const deleteButton = row.getByRole('button', { name: 'Delete', exact: true });
    
    await expect(editButton).toBeVisible();
    await expect(deleteButton).toBeVisible();
  });

  test('Validate Move To column dropdown has the correct bucket options', async ({ page }) => {
    await page.goto(globalThis.baseURL);
    const row = page.locator('table tbody tr').first();
    const dropdown = row.locator('select');

    for (const bucketName of JobBuckets.map(bucket => bucket.label)) {
      if (bucketName !== 'All') {
        await expect(dropdown.getByRole('option', { name: bucketName, exact: true })).toHaveText(bucketName);
      }
    }
  });

  test('Validate that button backgrounds update properly when switching tabs', async ({ page }) => {
    await page.goto(globalThis.baseURL);
    await expect(page.locator('h1')).toHaveText('JobFinder - Application Tracker');

    const allTab = page.getByRole('button', { name: 'All', exact: true });
    const declinedTab = page.getByRole('button', { name: 'Declined', exact: true });

    // Click All tab
    await allTab.click();
    await expect(allTab).toHaveClass(/active/);

    // Click Declined tab
    await declinedTab.click();
    await expect(declinedTab).toHaveClass(/active/);
    await expect(allTab).not.toHaveClass(/active/);
  });

  test('Validate pipeline metric cards and counts display correctly', async ({ page }) => {
    await page.goto(globalThis.baseURL);
    
    // Check main sections
    await expect(page.locator('text=Application Pipeline Metrics')).toBeVisible();
    
    // Verify specific metric categories using valid CSS ID selectors (#)
    await expect(page.locator('#jmNewJobs')).toBeVisible();
    await expect(page.locator('#jmApplied')).toBeVisible();
    await expect(page.locator('#jmWaiting')).toBeVisible();
    await expect(page.locator('#jmPending')).toBeVisible();
    await expect(page.locator('#jmUnresponsive')).toBeVisible();
    await expect(page.locator('#jmDeclined')).toBeVisible();
    await expect(page.locator('#jmWithdrew')).toBeVisible();
    await expect(page.locator('#jmDisappointed')).toBeVisible();
  });

  test('Validate user can search for a company, that company appears in the global search results and then clears the results when the search is cleared', async ({ page }) => {
    await page.goto(globalThis.baseURL);

    const searchParam = page.getByPlaceholder('Search all buckets');
    await searchParam.fill('KnowBe$');
    await page.getByRole('button', { name: 'Search', exact: true }).click();

    // Verify the table filters down to show the company
    const filterBCompany = page.locator('table tbody tr').filter({ hasText: 'KnowBe$' });
    await expect(filterBCompany).toHaveCount(1);

    // Clear the search input
    await page.getByRole('button', { name: 'Clear', exact: true }).click();
    const allComp = page.locator('table tbody tr');
    await expect(allComp).not.toHaveCount(1); // Expect more than 1 row to be present after clearing the search
  });

  test('Validate pagination and rows per page controls', async ({ page }) => {
    await page.goto(globalThis.baseURL);

    // Check pagination status text
    await expect(page.locator('text=Showing entries 1 - 25 of 214')).toBeVisible();

    // Change rows per page selector to 50
    const rowsDropdown = page.locator('select').filter({ hasText: '25' }).last();
    await rowsDropdown.selectOption('50');
    
    await expect(page.locator('text=Showing entries 1 - 50 of 214')).toBeVisible();

    // Click Next page
    await page.getByRole('button', { name: 'Next', exact: true }).first().click();

    await expect(page.locator('text=Page 2 of ').first()).toBeVisible();
  });

  test('Validate a user can add a new job successfully', async ({ page }) => {
    await page.goto(globalThis.baseURL);
    
    // Navigate to 'New Jobs' tab so deletions default to a valid non-all table context
    await page.getByRole('button', { name: 'New Jobs', exact: true }).click();

    await page.getByRole('button', { name: 'Add New Job', exact: true }).click();
    
    // Verify input fields for adding a job appear
    await expect(page.getByPlaceholder('Company *')).toBeVisible();
    await expect(page.getByPlaceholder('Position *')).toBeVisible();
    await expect(page.getByPlaceholder('Date Applied')).toBeVisible();
    await expect(page.getByPlaceholder('WFH (Yes/No/Hybrid)')).toBeVisible();
    await expect(page.getByPlaceholder('Job Link')).toBeVisible();
    await expect(page.getByPlaceholder('Notes')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save Job', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeVisible();

    // Fill in the form and submit
    await page.getByPlaceholder('Company *').fill('Test Company');
    await page.getByPlaceholder('Position *').fill('Test Position');
    await page.getByPlaceholder('Date Applied').fill('2024-06-01');
    await page.getByPlaceholder('WFH (Yes/No/Hybrid)').fill('Yes');
    await page.getByPlaceholder('Job Link').fill('https://example.com/job');
    await page.getByPlaceholder('Notes').fill('This is a test note.');
    await page.getByRole('button', { name: 'Save Job', exact: true }).click();

    // Verify the new job appears in the table
    const searchParam = page.getByPlaceholder('Search all buckets');
    await searchParam.fill('Test Company');
    await page.getByRole('button', { name: 'Search', exact: true }).click();

    const newJobRow = page.locator('table tbody tr').filter({ hasText: 'Test Company' }).filter({ hasText: 'Test Position' });
    await expect(newJobRow).toHaveCount(1);

    // Set up native dialog handler to automatically accept the window.confirm() popup
    page.once('dialog', async dialog => {
      await dialog.accept();
    });

    // Clean up by deleting the test job
    await newJobRow.getByRole('button', { name: 'Delete', exact: true }).click();

    // Verify the job is removed from the search results
    const deletedJobRow = page.locator('table tbody tr').filter({ hasText: 'Test Company' }).filter({ hasText: 'Test Position' });
    await expect(deletedJobRow).toHaveCount(0);
  });
});