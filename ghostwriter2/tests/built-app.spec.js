const { test, _electron: electron } = require('@playwright/test');
const path = require('path');

// This test uses the built version of the app (production mode)
test.describe('GhostWriter2 Built App Screenshots', () => {
  let electronApp;
  let page;

  test.beforeAll(async () => {
    console.log('Launching Electron app in production mode...');
    
    // Set NODE_ENV to production to force built version
    const env = { ...process.env, NODE_ENV: 'production' };
    
    electronApp = await electron.launch({
      args: [path.join(__dirname, '..', 'public', 'electron.js')],
      timeout: 15000,
      env
    });
    
    page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle');
    
    // Wait for the app to fully render
    await page.waitForTimeout(3000);
  });

  test.afterAll(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });

  test('capture production app screenshots', async () => {
    console.log('Taking production app screenshots...');
    
    // Debug info
    const title = await page.title();
    const url = page.url();
    console.log('Page title:', title);
    console.log('Page URL:', url);
    
    // Get page content to debug
    const bodyText = await page.locator('body').textContent();
    console.log('Body has text:', bodyText ? bodyText.length > 0 : false);
    console.log('First 200 chars:', bodyText ? bodyText.substring(0, 200) : 'No text');
    
    // Take screenshot regardless
    await page.screenshot({ 
      path: 'test-results/production-app-home.png', 
      fullPage: true 
    });
    
    // Check what elements exist
    const allElements = await page.locator('*').count();
    console.log('Total elements on page:', allElements);
    
    // Look for any interactive elements
    const buttons = await page.locator('button').count();
    const inputs = await page.locator('input').count();
    const divs = await page.locator('div').count();
    
    console.log(`Found: ${buttons} buttons, ${inputs} inputs, ${divs} divs`);
    
    if (allElements > 5) {
      console.log('Page seems to have content, taking additional screenshots');
      
      // Wait a bit more and take another screenshot
      await page.waitForTimeout(2000);
      await page.screenshot({ 
        path: 'test-results/production-app-loaded.png', 
        fullPage: true 
      });
    }
  });
});