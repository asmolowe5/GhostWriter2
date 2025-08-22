const { _electron: electron } = require('playwright');
const path = require('path');

async function globalSetup() {
  console.log('Setting up Playwright for Electron...');
  
  // Store the electron app path for tests to use
  process.env.ELECTRON_APP_PATH = path.join(__dirname, '..', 'public', 'electron.js');
  
  return async () => {
    console.log('Global setup complete');
  };
}

module.exports = globalSetup;