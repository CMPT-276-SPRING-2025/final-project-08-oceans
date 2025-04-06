import { test, expect } from '@playwright/test';

test.describe('Integration Tests', () => {
  // Basic test to ensure the suite runs
  test('Setup Test', () => {
    expect(true).toBe(true);
  });

  // --- Quiz Flow Tests ---
  test.describe('Quiz Flow', () => {
    test('should navigate to the cat quiz page when Cat card is clicked', async ({ page }) => {
      await page.goto('/quiz');

      // Find the card containing the text "Cats" and click it
      // Playwright's getByText should find the element, and clicking it often triggers the handler on the parent
      await page.getByText('Cats').click();

      // Wait for navigation and assert the new URL
      await page.waitForURL('**/quiz/cats');
      await expect(page).toHaveURL(/.*\/quiz\/cats/);
    });

    test('should complete the cat quiz and navigate to results', async ({ page }) => {
      await page.goto('/quiz/cats');

      // Wait for the first question to load (check for the question heading)
      await expect(page.locator('h2')).toBeVisible({ timeout: 10000 }); // Increased timeout

      const numberOfQuestions = 5; // Based on catQuestions array length

      for (let i = 0; i < numberOfQuestions; i++) {
        // Wait for options to be visible for the current question
        await expect(page.locator('label').first()).toBeVisible({ timeout: 5000 });

        // Click the first option label
        await page.locator('label').first().click();

        // Find and click the Next/See Results button
        const nextButton = page.getByRole('button', { name: /Next|See Results/i });
        await expect(nextButton).toBeEnabled({ timeout: 5000 }); // Ensure it's enabled after selection
        await nextButton.click();

        // Add a small wait if needed for transition, but waitForSelector below might be enough
        // await page.waitForTimeout(100);

        // If not the last question, wait for the next question heading to potentially update/appear
        if (i < numberOfQuestions - 1) {
           await expect(page.locator('h2')).toBeVisible({ timeout: 5000 });
        }
      }

      // After the last question, expect navigation to the results page
      await page.waitForURL('**/results', { timeout: 15000 }); // Increased timeout for results load
      await expect(page).toHaveURL(/.*\/results/);
    });
  });

  // --- Contact Form Tests ---
  test.describe('Contact Form', () => {
    test('should submit the form successfully', async ({ page }) => {
      await page.goto('/contact');

      // Fill the form fields
      await page.locator('input[name="firstname"]').fill('Test');
      await page.locator('input[name="lastname"]').fill('User');
      await page.locator('input[name="email"]').fill('test@example.com');
      await page.locator('textarea[name="message"]').fill('This is a test message.');

      // Click the submit button
      await page.getByRole('button', { name: 'Submit' }).click();

      // Wait for the success message to appear
      const successMessage = page.locator('p:has-text("Form Submitted Successfully")');
      await expect(successMessage).toBeVisible({ timeout: 10000 }); // Increased timeout for API response
    });
  });

  // --- Pets Page Tests ---
  test.describe('Pets Page', () => {
    test('should filter pets and navigate to detail page', async ({ page }) => {
      await page.goto('/pets_all');

      // Wait for initial pet cards to load
      await expect(page.getByRole('button', { name: 'Adopt me!' }).first()).toBeVisible({ timeout: 15000 });

      // Click Cats filter
      await page.getByRole('button', { name: 'Cats' }).click();
      // Wait for potential DOM update after filtering
      await page.waitForTimeout(500); // Small delay to allow potential re-render
      await expect(page.getByRole('button', { name: 'Adopt me!' }).first()).toBeVisible({ timeout: 10000 }); // Re-check visibility

      // Click Dogs filter
      await page.getByRole('button', { name: 'Dogs' }).click();
      // Wait for potential DOM update after filtering
      await page.waitForTimeout(500);
      await expect(page.getByRole('button', { name: 'Adopt me!' }).first()).toBeVisible({ timeout: 10000 }); // Re-check visibility

      // Click the first "Adopt me!" button
      await page.getByRole('button', { name: 'Adopt me!' }).first().click();

      // Assert navigation to a pet detail page
      await page.waitForURL(/\/pets\/\d+/, { timeout: 10000 }); // Wait for URL matching /pets/[id]
      await expect(page).toHaveURL(/\/pets\/\d+/); // Regex to match /pets/ followed by numbers
    });
  });

  // --- Shelters Page Tests ---
  test.describe('Shelters Page', () => {
    test('should search by location and navigate to shelter details', async ({ page }) => {
      await page.goto('/shelters');

      // Wait for initial shelter cards to load
      await expect(page.getByRole('button', { name: 'View' }).first()).toBeVisible({ timeout: 15000 });

      // Fill location search input
      await page.getByPlaceholder('Location').fill('San Francisco');

      // Click Search button
      await page.getByRole('button', { name: 'Search' }).click();

      // Wait for potential DOM update after search
      await page.waitForTimeout(1000); // Increased delay for search results
      await expect(page.getByRole('button', { name: 'View' }).first()).toBeVisible({ timeout: 10000 }); // Re-check visibility

      // Click the first "View" button
      await page.getByRole('button', { name: 'View' }).first().click();

      // Assert navigation to a shelter detail page
      await page.waitForURL(/\/shelters\/\w+/, { timeout: 10000 }); // Wait for URL matching /shelters/[id] (id can be alphanumeric)
      await expect(page).toHaveURL(/\/shelters\/\w+/); // Regex to match /shelters/ followed by word characters
    });
  });
});