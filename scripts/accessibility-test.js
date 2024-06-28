const puppeteer = require('puppeteer');
const pa11y = require('pa11y');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  const visitedLinks = new Set();
  const basePathsToIgnore = ['/admin', '/notifications'];
  let combinedResultsText = '';

  function shouldIgnorePath(url) {
    const urlPath = new URL(url).pathname;
    return basePathsToIgnore.some(basePath => urlPath.startsWith(basePath));
  }

  async function testPage(url) {
    if (visitedLinks.has(url) || shouldIgnorePath(url)) {
      return;
    }
    visitedLinks.add(url);

    await page.goto(url);

    console.log(`Testing ${url}`);

    // Test with HTMLCodeSniffer using Pa11y
    const resultsHTMLCS = await pa11y(url, {
      browser: browser,
      page: page,
      standard: 'WCAG2AA',
    });

    // Format results as text
    combinedResultsText += `Results for ${url}\n\n`;

    combinedResultsText += 'Pa11y Results:\n';
    resultsHTMLCS.issues.forEach(issue => {
      combinedResultsText += `Code: ${issue.code}\n`;
      combinedResultsText += `Message: ${issue.message}\n`;
      combinedResultsText += `Selector: ${issue.selector}\n`;
      combinedResultsText += `Context: ${issue.context}\n\n`;
    });

    combinedResultsText += '\n\n';

    // Collect links on the current page and test them recursively
    const links = await page.evaluate(() => Array.from(document.querySelectorAll('a'), a => a.href));
    for (const link of links) {
      // Only test links within the same domain
      if (link.startsWith('http://localhost:3000') || link.startsWith('https://example.com')) {
        await testPage(link);
      }
    }
  }

  // Start testing from the initial URL
  await testPage('http://localhost:3000');

  await browser.close();

  // Save the combined results to a text file
  fs.writeFileSync('accessibility-results.txt', combinedResultsText);

  console.log('Accessibility testing completed. Results saved to accessibility-results.txt');
})();
