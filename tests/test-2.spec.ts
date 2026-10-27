import { test, expect } from '@playwright/test';

// white background rgb(255, 255, 255)
// edit button light gray/blue rgb(226, 232, 240) (#e2e8f0)
// delete button light red background rgb(254, 215, 215) (#fed7d7)

test('Validate that btn backgrounds update properly when clicked on or off', async ({ page }) => {

  await page.goto('http://localhost:5173/');
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
