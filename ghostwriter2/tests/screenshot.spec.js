const { test, _electron: electron } = require('@playwright/test');
const path = require('path');

test.describe('GhostWriter2 Screenshots', () => {
  let electronApp;
  let page;

  test.beforeAll(async () => {
    electronApp = await electron.launch({
      args: [path.join(__dirname, '..', 'public', 'electron.js')],
      timeout: 15000
    });
    
    page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle'); // Wait for network requests to finish
    
    // Wait for React to render - look for any content
    try {
      await page.waitForSelector('body *', { timeout: 10000 });
      await page.waitForTimeout(2000); // Extra time for animations/transitions
    } catch (e) {
      console.log('Warning: Could not find content selectors');
      await page.waitForTimeout(5000); // Fallback wait
    }
  });

  test.afterAll(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });

  test('capture app demo screenshots', async () => {
    // Debug: log page content to see what's loaded
    const content = await page.content();
    console.log('Page title:', await page.title());
    console.log('Page has body:', content.includes('<body>'));
    
    // Wait for specific React elements that we know should be there
    try {
      await page.waitForSelector('.App, [class*="App"], #root > div', { timeout: 10000 });
    } catch (e) {
      console.log('Could not find main app selectors, taking screenshot anyway');
    }
    
    // Take initial app screenshot
    await page.screenshot({ 
      path: 'test-results/demo-01-home.png', 
      fullPage: true 
    });
    
    // Activate ghost agent
    const ghostAvatar = page.locator('.ghost-avatar');
    if (await ghostAvatar.isVisible()) {
      await ghostAvatar.click();
      await page.waitForTimeout(1000);
      
      await page.screenshot({ 
        path: 'test-results/demo-02-ghost-active.png', 
        fullPage: true 
      });
    }
    
    // Open settings
    const settingsButton = page.locator('.settings-btn');
    if (await settingsButton.isVisible()) {
      await settingsButton.click();
      await page.waitForTimeout(1000);
      
      await page.screenshot({ 
        path: 'test-results/demo-03-settings.png', 
        fullPage: true 
      });
      
      // Close settings
      const closeButton = page.locator('.settings-modal .close-btn');
      if (await closeButton.isVisible()) {
        await closeButton.click();
        await page.waitForTimeout(500);
      }
    }
    
    // Try to create a novel for demo
    const newNovelButton = page.locator('button:has-text("New Novel")');
    if (await newNovelButton.isVisible()) {
      await newNovelButton.click();
      await page.waitForTimeout(1000);
      
      await page.screenshot({ 
        path: 'test-results/demo-04-new-novel.png', 
        fullPage: true 
      });
      
      // Fill in novel name
      const nameInput = page.locator('.novel-name-modal input');
      if (await nameInput.isVisible()) {
        await nameInput.fill('My Fantasy Novel');
        await page.waitForTimeout(500);
        
        const createButton = page.locator('.novel-name-modal button:has-text("Create")');
        if (await createButton.isVisible()) {
          await createButton.click();
          await page.waitForTimeout(2000);
          
          // Screenshot of editor
          await page.screenshot({ 
            path: 'test-results/demo-05-editor.png', 
            fullPage: true 
          });
          
          // Type some content
          const editor = page.locator('.rich-text-editor [contenteditable]');
          if (await editor.isVisible()) {
            await editor.click();
            await editor.type('The ancient castle loomed against the stormy sky, its towers piercing the dark clouds like accusing fingers. Lady Morgana pulled her cloak tighter as she approached the massive oak doors...');
            await page.waitForTimeout(1000);
            
            await page.screenshot({ 
              path: 'test-results/demo-06-editor-with-text.png', 
              fullPage: true 
            });
          }
        }
      }
    }
  });
});