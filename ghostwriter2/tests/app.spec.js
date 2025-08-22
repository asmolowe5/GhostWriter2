const { test, expect, _electron: electron } = require('@playwright/test');
const path = require('path');

test.describe('GhostWriter2 Electron App', () => {
  let electronApp;
  let page;

  test.beforeAll(async () => {
    // Launch Electron app
    electronApp = await electron.launch({
      args: [path.join(__dirname, '..', 'public', 'electron.js')],
      // Increase timeout for app startup
      timeout: 15000
    });
    
    // Get the main window
    page = await electronApp.firstWindow();
    
    // Wait for app to be ready
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000); // Give React time to render
  });

  test.afterAll(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });

  test('should launch successfully', async () => {
    // Take screenshot of initial state
    await page.screenshot({ path: 'test-results/app-launch.png', fullPage: true });
    
    // Check that the main elements are present
    await expect(page.locator('.app-container')).toBeVisible();
    await expect(page.locator('.header')).toBeVisible();
    await expect(page.locator('.ghostwriter-agent')).toBeVisible();
  });

  test('should display welcome screen', async () => {
    // Check for welcome content
    const welcomeText = page.locator('text=Welcome to GhostWriter');
    await expect(welcomeText).toBeVisible();
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/welcome-screen.png', fullPage: true });
  });

  test('should open settings modal', async () => {
    // Click settings gear icon
    const settingsButton = page.locator('.settings-btn');
    if (await settingsButton.isVisible()) {
      await settingsButton.click();
      
      // Wait for modal to appear
      await page.waitForSelector('.settings-modal', { timeout: 5000 });
      
      // Take screenshot of settings modal
      await page.screenshot({ path: 'test-results/settings-modal.png', fullPage: true });
      
      // Close modal
      const closeButton = page.locator('.settings-modal .close-btn');
      if (await closeButton.isVisible()) {
        await closeButton.click();
      }
    }
  });

  test('should activate ghost agent', async () => {
    // Click on ghost avatar to activate
    const ghostAvatar = page.locator('.ghost-avatar');
    await expect(ghostAvatar).toBeVisible();
    await ghostAvatar.click();
    
    // Wait for ghost panel to appear
    await page.waitForSelector('.ghost-panel', { timeout: 5000 });
    
    // Take screenshot of active ghost
    await page.screenshot({ path: 'test-results/ghost-active.png', fullPage: true });
    
    // Check that usage tracker is visible
    const usageTracker = page.locator('.usage-tracker');
    await expect(usageTracker).toBeVisible();
  });

  test('should show new novel creation dialog', async () => {
    // Click new novel button
    const newNovelButton = page.locator('button:has-text("New Novel")');
    if (await newNovelButton.isVisible()) {
      await newNovelButton.click();
      
      // Wait for novel name modal
      await page.waitForSelector('.novel-name-modal', { timeout: 5000 });
      
      // Take screenshot
      await page.screenshot({ path: 'test-results/new-novel-modal.png', fullPage: true });
      
      // Cancel the dialog
      const cancelButton = page.locator('.novel-name-modal button:has-text("Cancel")');
      if (await cancelButton.isVisible()) {
        await cancelButton.click();
      }
    }
  });

  test('should handle text editor interaction', async () => {
    // First create a test novel
    const newNovelButton = page.locator('button:has-text("New Novel")');
    if (await newNovelButton.isVisible()) {
      await newNovelButton.click();
      
      // Wait for modal and enter novel name
      await page.waitForSelector('.novel-name-modal', { timeout: 5000 });
      const nameInput = page.locator('.novel-name-modal input');
      await nameInput.fill('Test Novel');
      
      const createButton = page.locator('.novel-name-modal button:has-text("Create")');
      await createButton.click();
      
      // Wait for editor to appear
      await page.waitForSelector('.rich-text-editor', { timeout: 10000 });
      
      // Type some text
      const editor = page.locator('.rich-text-editor [contenteditable]');
      await editor.click();
      await editor.type('This is a test chapter for the novel.');
      
      // Take screenshot of editor with content
      await page.screenshot({ path: 'test-results/editor-with-content.png', fullPage: true });
      
      // Test formatting toolbar
      const boldButton = page.locator('.formatting-toolbar button[title="Bold"]');
      if (await boldButton.isVisible()) {
        await boldButton.click();
        await page.screenshot({ path: 'test-results/formatting-toolbar.png', fullPage: true });
      }
    }
  });
});