import { test, expect } from '@playwright/test';

test.describe('Job Application Tracker E2E Automation', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to your local frontend application URL
    await page.goto('http://localhost:5173');
  });

  test('Should add, search, update, and move a job across sections', async ({ page }) => {
    // 1. Add a new job in the "applied" section
    await page.click('button#add-job-btn');
    await page.fill('input[name="company"]', 'TestCorp AI');
    await page.fill('input[name="position"]', 'Senior SDET');
    await page.fill('input[name="date_applied"]', 'Oct 24, 2026');
    await page.click('button#save-job-btn');

    // Verify the item appears in the Applied table
    await expect(page.locator('text=TestCorp AI')).toBeVisible();

    // 2. Search for the job
    await page.fill('input#search-bar', 'TestCorp AI');
    await expect(page.locator('text=TestCorp AI')).toBeVisible();

    // 3. Update job notes
    await page.click('tr:has-text("TestCorp AI") button.edit-btn');
    await page.fill('input[name="notes"]', 'First round interview scheduled');
    await page.click('button#update-job-btn');
    await expect(page.locator('text=First round interview scheduled')).toBeVisible();

    // 4. Move the job from "applied" to "no_response" tab
    await page.click('tr:has-text("TestCorp AI") button.move-dropdown-btn');
    await page.click('text=no_response');

    // Verify item is removed from Applied and present in no_response section
    await page.click('button#tab-no_response');
    await expect(page.locator('table#no_response-table tr:has-text("TestCorp AI")')).toBeVisible();
  });

  test('Should delete a job record', async ({ page }) => {
    await page.fill('input#search-bar', 'TestCorp AI');
    await page.click('tr:has-text("TestCorp AI") button.delete-btn');
    
    // Confirm deletion modal/action if applicable
    await page.on('dialog', dialog => dialog.accept());
    
    // Verify item is gone
    await expect(page.locator('text=TestCorp AI')).not.toBeVisible();
  });

});