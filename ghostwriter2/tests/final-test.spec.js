const { test, _electron: electron } = require('@playwright/test');
const path = require('path');

test.describe('GhostWriter2 Final Screenshots', () => {
  let electronApp;
  let page;

  test.beforeAll(async () => {
    console.log('Launching Electron app for final screenshots...');
    
    // Force production mode to avoid DevTools
    const env = { 
      ...process.env, 
      NODE_ENV: 'production',
      ELECTRON_IS_DEV: '0'
    };
    
    electronApp = await electron.launch({
      args: [path.join(__dirname, '..', 'public', 'electron.js')],
      timeout: 20000,
      env
    });
    
    // Get all windows and find the main app window (not DevTools)
    const windows = electronApp.windows();
    console.log(`Found ${windows.length} initial windows`);
    
    // Wait for the main window to appear
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const allWindows = electronApp.windows();
    console.log(`Total windows after wait: ${allWindows.length}`);
    
    // Find the main application window (not DevTools)
    let mainWindow = null;
    for (const window of allWindows) {
      const url = window.url();
      const title = await window.title().catch(() => 'Unknown');
      console.log(`Window: ${title} - ${url}`);
      
      if (!url.includes('devtools') && !url.includes('chrome-extension')) {
        mainWindow = window;
        break;
      }
    }
    
    if (!mainWindow) {
      // Fallback to first window
      mainWindow = allWindows[0];
    }
    
    page = mainWindow;
    
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(5000); // Give plenty of time for React to render
  });

  test.afterAll(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });

  test('capture final working screenshots', async () => {
    console.log('Taking final screenshots...');
    
    try {
      const title = await page.title();
      const url = page.url();
      console.log(`Final - Title: ${title}, URL: ${url}`);
      
      // Take screenshot
      await page.screenshot({ 
        path: 'test-results/final-app-screenshot.png', 
        fullPage: true 
      });
      
      // Get some content info
      const bodyText = await page.locator('body').textContent().catch(() => '');
      console.log('Has content:', bodyText.length > 10);
      
      // Look for React root or main app container
      const reactRoot = await page.locator('#root').count();
      const appDiv = await page.locator('[class*="App"], [class*="app"]').count();
      const allDivs = await page.locator('div').count();
      
      console.log(`React root: ${reactRoot}, App divs: ${appDiv}, Total divs: ${allDivs}`);
      
      if (reactRoot > 0 || appDiv > 0) {
        console.log('Found React elements, taking additional screenshots');
        await page.waitForTimeout(2000);
        await page.screenshot({ 
          path: 'test-results/final-app-with-react.png', 
          fullPage: true 
        });
      }
      
    } catch (error) {
      console.error('Error during screenshot capture:', error.message);
      // Try to take a screenshot anyway
      await page.screenshot({ 
        path: 'test-results/final-app-error.png', 
        fullPage: true 
      });
    }
  });
});