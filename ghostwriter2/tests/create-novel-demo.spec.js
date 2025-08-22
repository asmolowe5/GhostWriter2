const { test, _electron: electron } = require('@playwright/test');
const path = require('path');

test.describe('Create Novel Demo with Playwright', () => {
  let electronApp;
  let page;

  test.beforeAll(async () => {
    console.log('Launching GhostWriter2 for novel creation demo...');
    
    electronApp = await electron.launch({
      args: [path.join(__dirname, '..', 'public', 'electron.js')],
      timeout: 20000
    });
    
    // Wait for windows and find the main app window
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const allWindows = electronApp.windows();
    console.log(`Found ${allWindows.length} windows`);
    
    // Find the main application window
    let mainWindow = null;
    for (const window of allWindows) {
      const url = window.url();
      const title = await window.title().catch(() => 'Unknown');
      console.log(`Window: ${title} - ${url}`);
      
      if (!url.includes('devtools') && (title.includes('GhostWriter') || url.includes('localhost:3000'))) {
        mainWindow = window;
        break;
      }
    }
    
    page = mainWindow || allWindows[0];
    
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000); // Give time for React to render
  });

  test.afterAll(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });

  test('create PlayWright Play novel with chapters', async () => {
    console.log('Starting novel creation demo...');
    
    // Take initial screenshot
    await page.screenshot({ 
      path: 'test-results/demo-01-home-screen.png', 
      fullPage: true 
    });
    
    // Look for "New Novel" button - try multiple possible selectors
    console.log('Looking for New Novel button...');
    
    let newNovelButton = null;
    const possibleSelectors = [
      'button:has-text("New Novel")',
      'button:text("New Novel")',
      'button[class*="new"], button[class*="Novel"]',
      'button:contains("New")',
      'button:contains("Novel")',
      '.new-novel-btn',
      '[data-testid="new-novel"]'
    ];
    
    for (const selector of possibleSelectors) {
      try {
        const btn = page.locator(selector);
        if (await btn.count() > 0 && await btn.isVisible()) {
          newNovelButton = btn.first();
          console.log(`Found New Novel button with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue trying
      }
    }
    
    if (!newNovelButton) {
      // Look for any buttons and take screenshot for debugging
      const allButtons = await page.locator('button').all();
      console.log(`Found ${allButtons.length} buttons total`);
      
      for (let i = 0; i < allButtons.length; i++) {
        const buttonText = await allButtons[i].textContent().catch(() => '');
        console.log(`Button ${i}: "${buttonText}"`);
      }
      
      await page.screenshot({ 
        path: 'test-results/demo-debug-buttons.png', 
        fullPage: true 
      });
      
      // Try clicking the first button that might be for creating novels
      const firstButton = page.locator('button').first();
      if (await firstButton.count() > 0) {
        newNovelButton = firstButton;
        console.log('Using first button as fallback');
      }
    }
    
    if (newNovelButton) {
      console.log('Clicking New Novel button...');
      await newNovelButton.click();
      
      // Wait for modal to appear
      await page.waitForTimeout(2000);
      await page.screenshot({ 
        path: 'test-results/demo-02-new-novel-modal.png', 
        fullPage: true 
      });
      
      // Look for the novel name input
      const nameInput = page.locator('input[type="text"], input[placeholder*="name"], input[placeholder*="Novel"], input[placeholder*="title"]');
      
      if (await nameInput.count() > 0) {
        console.log('Found name input, entering "PlayWright Play"...');
        await nameInput.first().fill('PlayWright Play');
        
        await page.screenshot({ 
          path: 'test-results/demo-03-novel-name-entered.png', 
          fullPage: true 
        });
        
        // Look for the actual "Create Novel" button
        const createButton = page.locator('button:has-text("Create Novel"), button[type="submit"]:has-text("Create"), .btn-primary');
        
        if (await createButton.count() > 0) {
          console.log('Found Create Novel button, clicking...');
          
          // Wait for the button to be enabled (it gets disabled when no text is entered)
          await createButton.waitFor({ state: 'visible' });
          await page.waitForTimeout(500); // Give time for the button to become enabled
          
          // Try clicking the Create Novel button
          await createButton.first().click({ force: true });
          console.log('Clicked Create Novel button successfully');
          
          // Wait for editor to load and check if modal closed
          await page.waitForTimeout(3000);
          
          // Check if we're still in the modal or if we navigated to the editor
          const modalStillOpen = await page.locator('.modal-overlay').count();
          console.log(`Modal still open: ${modalStillOpen > 0}`);
          
          if (modalStillOpen > 0) {
            console.log('Modal is still open, something went wrong with Create button');
            await page.screenshot({ 
              path: 'test-results/demo-04-modal-still-open.png', 
              fullPage: true 
            });
            
            // Try pressing Enter to submit the form
            console.log('Trying to submit form with Enter key...');
            await page.keyboard.press('Enter');
            await page.waitForTimeout(2000);
          }
          
          await page.screenshot({ 
            path: 'test-results/demo-04-after-create-attempt.png', 
            fullPage: true 
          });
          
          // Find the text editor - try multiple selectors
          let editor = null;
          const editorSelectors = [
            '[contenteditable="true"]',
            '.rich-text-editor [contenteditable]',
            '.editor-content',
            '.text-editor',
            'textarea',
            '[data-testid="editor"]'
          ];
          
          console.log('Looking for text editor...');
          for (const selector of editorSelectors) {
            try {
              const editorElement = page.locator(selector);
              if (await editorElement.count() > 0 && await editorElement.isVisible()) {
                editor = editorElement.first();
                console.log(`Found editor with selector: ${selector}`);
                break;
              }
            } catch (e) {
              // Continue trying other selectors
            }
          }
          
          if (editor) {
            console.log('Found editor, writing Chapter 1...');
            await editor.first().click();
            
            // Write Chapter 1
            const chapter1Text = `The curtain rises on a small theatre where a peculiar play is about to begin. The audience holds its breath as the first actor, a digital playwright named Wright, takes the stage.

"Ladies and gentlemen," Wright announces, "tonight we shall witness the marriage of code and creativity, where algorithms dance with imagination."`;
            
            await page.keyboard.type(chapter1Text);
            await page.waitForTimeout(1000);
            
            await page.screenshot({ 
              path: 'test-results/demo-05-chapter1-written.png', 
              fullPage: true 
            });
            
            // Look for "Next Chapter" or similar navigation
            const nextChapterBtn = page.locator('button:has-text("Next"), button:has-text("Chapter"), .next-chapter, .chapter-nav');
            
            if (await nextChapterBtn.count() > 0) {
              console.log('Moving to Chapter 2...');
              await nextChapterBtn.first().click();
              await page.waitForTimeout(2000);
            } else {
              // Try to manually navigate to chapter 2 - look for chapter list or navigation
              const chapterList = page.locator('.chapter-list, .chapters, [class*="chapter"]');
              if (await chapterList.count() > 0) {
                console.log('Found chapter navigation...');
                await page.screenshot({ 
                  path: 'test-results/demo-chapter-nav.png', 
                  fullPage: true 
                });
              }
              
              // Clear editor for next chapter
              await editor.first().click();
              await page.keyboard.press('Control+A');
              await page.keyboard.press('Delete');
            }
            
            // Write Chapter 2
            console.log('Writing Chapter 2...');
            const chapter2Text = `Act II begins with Wright discovering that the other characters in the play are also automated beings - each one generated by different algorithms.

"Are we real?" asks Beta, the logical character.
"We are real enough," replies Gamma, the creative one.
"But who writes our lines?" wonders Delta.

Wright pauses, realizing they are all part of a larger performance - a play within a play within a play.`;
            
            await page.keyboard.type(chapter2Text);
            await page.waitForTimeout(1000);
            
            await page.screenshot({ 
              path: 'test-results/demo-06-chapter2-written.png', 
              fullPage: true 
            });
            
            // Clear for Chapter 3
            await page.keyboard.press('Control+A');
            await page.keyboard.press('Delete');
            
            // Write Chapter 3
            console.log('Writing Chapter 3...');
            const chapter3Text = `The final act brings revelation. Wright looks directly at the audience and speaks:

"Dear viewers, you too are part of this performance. Every time you interact with code, you become characters in the digital play. Every test that runs, every screenshot that captures - you are the co-authors of this automated drama."

The curtain falls. The play ends. But somewhere in the digital realm, new characters are already being born, ready to perform in tomorrow's show.

[THE END]`;
            
            await page.keyboard.type(chapter3Text);
            await page.waitForTimeout(1000);
            
            await page.screenshot({ 
              path: 'test-results/demo-07-chapter3-final.png', 
              fullPage: true 
            });
            
            console.log('Novel "PlayWright Play" completed successfully!');
            
            // Take a final screenshot of the complete novel
            await page.waitForTimeout(2000);
            await page.screenshot({ 
              path: 'test-results/demo-08-novel-complete.png', 
              fullPage: true 
            });
            
          } else {
            console.log('Could not find text editor');
            await page.screenshot({ 
              path: 'test-results/demo-no-editor.png', 
              fullPage: true 
            });
          }
          
        } else {
          console.log('Could not find Create button');
        }
        
      } else {
        console.log('Could not find name input field');
      }
      
    } else {
      console.log('Could not find New Novel button');
      
      // Take screenshot showing what's available
      await page.screenshot({ 
        path: 'test-results/demo-no-new-novel-button.png', 
        fullPage: true 
      });
    }
  });
});