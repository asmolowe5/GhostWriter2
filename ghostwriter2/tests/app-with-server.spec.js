const { test, _electron: electron } = require('@playwright/test');
const { spawn } = require('child_process');
const path = require('path');

test.describe('GhostWriter2 with Dev Server', () => {
  let electronApp;
  let page;
  let devServer;

  test.beforeAll(async () => {
    console.log('Starting React dev server...');
    
    // Start the React development server
    devServer = spawn('npm', ['start'], {
      cwd: path.join(__dirname, '..'),
      shell: true,
      stdio: 'pipe'
    });

    // Wait for dev server to be ready
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Dev server timeout')), 60000);
      
      devServer.stdout.on('data', (data) => {
        const output = data.toString();
        console.log('Dev server:', output);
        if (output.includes('webpack compiled') || output.includes('Local:') || output.includes('compiled successfully')) {
          clearTimeout(timeout);
          resolve();
        }
      });
      
      devServer.stderr.on('data', (data) => {
        console.log('Dev server error:', data.toString());
      });
    });

    // Give it an extra moment to be fully ready
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('Launching Electron app...');
    
    // Now launch Electron
    electronApp = await electron.launch({
      args: [path.join(__dirname, '..', 'public', 'electron.js')],
      timeout: 30000
    });
    
    page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle');
    
    // Wait for React app to load
    try {
      await page.waitForSelector('.App, [class*="App"], #root > div', { timeout: 15000 });
      console.log('React app loaded successfully');
    } catch (e) {
      console.log('Warning: React app selectors not found');
      await page.waitForTimeout(5000);
    }
  });

  test.afterAll(async () => {
    if (electronApp) {
      await electronApp.close();
    }
    if (devServer) {
      devServer.kill();
    }
  });

  test('capture working app screenshots', async () => {
    console.log('Taking screenshots...');
    
    // Debug info
    const title = await page.title();
    console.log('Page title:', title);
    
    const url = page.url();
    console.log('Page URL:', url);
    
    // Take screenshot
    await page.screenshot({ 
      path: 'test-results/working-app-home.png', 
      fullPage: true 
    });
    
    // Try to find and interact with elements
    const body = await page.locator('body');
    const content = await body.innerHTML();
    console.log('Page has content:', content.length > 100);
    
    // Look for common elements more generically
    const buttons = await page.locator('button').count();
    console.log('Found buttons:', buttons);
    
    if (buttons > 0) {
      await page.screenshot({ 
        path: 'test-results/working-app-with-ui.png', 
        fullPage: true 
      });
    }
  });
});