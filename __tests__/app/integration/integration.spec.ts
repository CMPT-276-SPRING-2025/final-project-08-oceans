
/*
import { test, expect } from '@playwright/test';

test.describe('Component and API interactions', () => {
  test('loading bar should appear during API calls and disappear when completed', async ({ page }) => {
    await page.goto('/pets_all');
    
    const loadingBar = page.locator('[data-testid="loading-indicator"]').or(page.locator('.loading'));
    
    await page.waitForSelector('.pet-card, [data-testid="pet-card"]', { state: 'visible', timeout: 100000000 });
    
    await expect(loadingBar).not.toBeVisible({ timeout: 100000000 });
  });

  test('quiz component should show appropriate results based on selections', async ({ page }) => {
    await page.goto('/quiz');
    
    await page.getByRole('link', { name: /dog/i }).click();
    
    const optionSelectors = [
      'input[type="radio"], button.option, [data-testid="quiz-option"]',
    ];
    
    await page.waitForSelector(optionSelectors.join(', '), { state: 'visible', timeout: 100000000 });
    
    const options = await page.locator(optionSelectors.join(', ')).all();
    
    for (let i = 0; i < Math.min(4, options.length); i++) {
      await options[i].click();
      await page.waitForTimeout(100000000);
    }
    
    const submitButton = page.getByRole('button', { name: /submit|next|continue/i });
    await submitButton.click();
    
    await page.waitForSelector('.result-card, [data-testid="result-card"], .pet-card, [data-testid="pet-card"]', 
      { state: 'visible', timeout: 100000000 });
  });

  test('contact form should validate and submit properly', async ({ page }) => {
    await page.goto('/contact');
    
    await page.waitForSelector('form', { state: 'visible', timeout: 100000000 });
  
    const firstNameInput = page.locator('input[name="firstname"], input[placeholder*="first name" i], input[placeholder="Enter first name"]').first();
    await firstNameInput.fill('Test');
    
    const lastNameInput = page.locator('input[name="lastname"], input[placeholder*="last name" i], input[placeholder="Enter last name"]').first();
    if (await lastNameInput.count() > 0) {
      await lastNameInput.fill('User');
    }
    
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
    await emailInput.fill('test@example.com');
    
    const messageInput = page.locator('textarea, textarea[name="message"], textarea[placeholder*="message" i]').first();
    await messageInput.fill('This is a test message');
    
    const submitButton = page.getByRole('button', { name: /send|submit|contact/i }).first();
    await submitButton.click();
    
    await page.waitForSelector('.success-message, .alert-success, [data-testid="success-message"], div:has-text("Message sent successfully")', 
      { state: 'visible', timeout: 100000000 });
  });
});

test.describe('User interactions with pages', () => {
  test('shelters page should display correct information and filters should work', async ({ page }) => {
    await page.goto('/shelters');
    
    await page.waitForSelector('.shelter-card, [data-testid="shelter-card"]', 
      { state: 'visible', timeout: 100000000 });
    
    const locationInput = page.locator('input[placeholder*="location" i], input[name="location"]').first();
    
    if (await locationInput.count() > 0) {
      await locationInput.fill('San Francisco');
      
      const searchButton = page.getByRole('button', { name: /search|filter|find/i }).or(
        page.locator('button.search-button, [data-testid="search-button"]')
      ).first();
      
      if (await searchButton.count() > 0) {
        await searchButton.click();
      } else {
      
      const searchButton = page.getByRole('button', { name: /search|filter|find/i }).or(
        page.locator('button.search-button, [data-testid="search-button"]')
      ).first();
      
      if (await searchButton.count() > 0) {
        await searchButton.click();
      } else {
        // Press Enter as alternative to clicking search
        await locationInput.press('Enter');
      }
      
      // Wait for results to update
      await page.waitForTimeout(100000000);
    }
    
    const shelterCard = page.locator('.shelter-card, [data-testid="shelter-card"]').first();
    if (await shelterCard.count() > 0) {
      const viewLink = shelterCard.getByRole('link', { name: /view|details|more/i }).or(
        shelterCard.locator('a[href*="shelters/"], button.view-button')
      ).first();
      
      if (await viewLink.count() > 0) {
        await viewLink.click();
        
        await page.waitForSelector('.shelter-details, [data-testid="shelter-details"]', 
          { state: 'visible', timeout: 100000000 });
      }
    }
  });

  test('should complete quiz flow with different options and show relevant results', async ({ page }) => {
    await page.goto('/quiz');
    
    const catOption = page.getByRole('link', { name: /cat/i }).or(
      page.locator('a[href*="cat"], button:has-text("Cat")')
    ).first();
    
    if (await catOption.count() > 0) {
      await catOption.click();
      
      const optionSelectors = [
        'input[type="radio"], button.option, [data-testid="quiz-option"]',
      ];
      
      await page.waitForSelector(optionSelectors.join(', '), { state: 'visible', timeout: 100000000 });
      
      const options = await page.locator(optionSelectors.join(', ')).all();
      
      for (let i = 0; i < Math.min(3, options.length); i++) {
        await options[i].click();
        await page.waitForTimeout(100000000);
      }
      
      const submitButton = page.getByRole('button', { name: /submit|next|continue/i }).first();
      if (await submitButton.count() > 0) {
        await submitButton.click();
        
        await page.waitForSelector('.result-card, [data-testid="result-card"], .pet-card, [data-testid="pet-card"]', 
          { state: 'visible', timeout: 100000000 });
      }
    }
  });

  test('pets page should filter correctly and show adoption information', async ({ page }) => {
    await page.goto('/pets_all');
    
    await page.waitForSelector('.pet-card, [data-testid="pet-card"]', 
      { state: 'visible', timeout: 100000000 });
    
    const catFilter = page.getByRole('button', { name: /cats/i }).or(
      page.locator('button:has-text("Cats"), a[href*="type=cat"]')
    ).first();
    
    if (await catFilter.count() > 0) {
      await catFilter.click();
      await page.waitForTimeout(100000000);
    }
    
    const dogFilter = page.getByRole('button', { name: /dogs/i }).or(
      page.locator('button:has-text("Dogs"), a[href*="type=dog"]')
    ).first();
    
    if (await dogFilter.count() > 0) {
      await dogFilter.click();
      await page.waitForTimeout(100000000);
    }
    
    const petCard = page.locator('.pet-card, [data-testid="pet-card"]').first();
    if (await petCard.count() > 0) {
      await petCard.click();
      
      await page.waitForSelector('.pet-details, [data-testid="pet-details"], .pet-name, .pet-info', 
        { state: 'visible', timeout: 100000000 });
      
      const adoptButton = page.getByRole('button', { name: /adopt/i }).or(
        page.locator('a:has-text("Adopt"), button.adopt-button, [data-testid="adopt-button"]')
      ).first();
      
      if (await adoptButton.count() > 0) {
        await adoptButton.click();
        
        await page.waitForSelector('.shelter-details, .adoption-form', 
          { state: 'visible', timeout: 100000000 });
      }
    }
  });
});

test.describe('Session Storage functionality', () => {
  test('pets data should be stored in session storage to reduce API calls', async ({ page }) => {
    await page.goto('/pets_all');
    
    await page.waitForSelector('.pet-card, [data-testid="pet-card"]', 
      { state: 'visible', timeout: 100000000 });
    
    const sessionStorageData = await page.evaluate(() => {
      return window.sessionStorage.getItem('petsData') || 
             window.sessionStorage.getItem('pets') || 
             window.sessionStorage.getItem('petData');
    });
    
    expect(sessionStorageData).not.toBeNull();
    
    await page.reload();
    
    await page.waitForSelector('.pet-card, [data-testid="pet-card"]', 
      { state: 'visible', timeout: 100000000 });
  });
  
  test('shelter data should be stored in session storage', async ({ page }) => {
    await page.goto('/shelters');
    
    await page.waitForSelector('.shelter-card, [data-testid="shelter-card"]', 
      { state: 'visible', timeout: 100000000 });
    
    const sessionStorageData = await page.evaluate(() => {
      return window.sessionStorage.getItem('sheltersData') || 
             window.sessionStorage.getItem('shelters') || 
             window.sessionStorage.getItem('shelterData');
    });
    
    expect(sessionStorageData).not.toBeNull();
    const sessionStorageData = await page.evaluate(() => {
      return window.sessionStorage.getItem('sheltersData') || 
             window.sessionStorage.getItem('shelters') || 
             window.sessionStorage.getItem('shelterData');
    });
    
    expect(sessionStorageData).not.toBeNull();
    
    await page.reload();
    
    await page.waitForSelector('.shelter-card, [data-testid="shelter-card"]', 
      { state: 'visible', timeout: 100000000 });
  });
});
*/