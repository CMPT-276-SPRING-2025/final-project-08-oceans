import { test, expect } from '@playwright/test';

test.describe('Integration Tests', () => {
  test('Setup Test', () => {
    expect(true).toBe(true);
  });

  test.describe('Quiz Flow', () => {
    test('should navigate to the cat quiz page when Cat card is clicked', async ({ page }) => {
      await page.goto('/quiz');

      
      await page.getByText('Cats').click();

      await page.waitForURL('**/quiz/cats');
      await expect(page).toHaveURL(/.*\/quiz\/cats/);
    });

  });

  test.describe('Contact Form', () => {
    test('should submit the form successfully', async ({ page }) => {
      await page.goto('/contact');

      await page.locator('input[name="firstname"]').fill('Test');
      await page.locator('input[name="lastname"]').fill('User');
      await page.locator('input[name="email"]').fill('test@example.com');
      await page.locator('textarea[name="message"]').fill('This is a test message.');

      await page.getByRole('button', { name: 'Submit' }).click();

      const successMessage = page.locator('p:has-text("Form Submitted Successfully")');
      await expect(successMessage).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Pets Page', () => {
    test('should display the pets list', async ({ page }) => {
      await page.goto('/pets_all');
      await expect(page.locator('h1')).toContainText('All Pets Available for Adoption');
      await page.locator('button:text("All")').first().click();
      await page.locator('button:text("Cats")').first().click();
      await page.locator('button:text("Dogs")').first().click();
      await page.locator('button:text("Birds")').first().click();
      await page.locator('button:text("Reptiles")').first().click();
      await page.locator('button:text("Small Pets")').first().click();
      await page.locator('button:text("Fish")').first().click();
    });
  });

  test.describe('Shelters Page', () => {
    test('should display the shelters list', async ({ page }) => {
      await page.goto('/shelters');
      await expect(page.locator('h2')).toContainText('Search nearby pet shelters');
    });
  });
});