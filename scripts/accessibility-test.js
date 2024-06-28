const puppeteer = require('puppeteer');
const pa11y = require('pa11y');
const axe = require('axe-core');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('https://localhost:3000');

  // Example function to collect links on the page
  const links = await page.evaluate(() => Array.from(document.querySelectorAll('a'), a => a.href));

  let combinedResultsText = '';

  for (let link of links) {
    console.log(`Testing ${link}`);

    // Test with HTMLCodeSniffer
    const resultsHTMLCS = await pa11y(link, {
      browser: browser,
      page: page,
      standard: 'WCAG2AA',
    });

    // Inject and run Axe
    await page.goto(link);
    const axeResults = await page.evaluate(async (axeSource) => {
      const script = document.createElement('script');
      script.innerHTML = axeSource;
      document.head.appendChild(script);
      return await axe.run();
    }, axe.source);

    // Format results as text
    combinedResultsText += `Results for ${link}\n\n`;

    combinedResultsText += 'Pa11y Results:\n';
    resultsHTMLCS.issues.forEach(issue => {
      combinedResultsText += `Code: ${issue.code}\n`;
      combinedResultsText += `Message: ${issue.message}\n`;
      combinedResultsText += `Selector: ${issue.selector}\n`;
      combinedResultsText += `Context: ${issue.context}\n\n`;
    });

    combinedResultsText += 'Axe Results:\n';
    axeResults.violations.forEach(violation => {
      combinedResultsText += `ID: ${violation.id}\n`;
      combinedResultsText += `Description: ${violation.description}\n`;
      combinedResultsText += `Impact: ${violation.impact}\n`;
      combinedResultsText += `Tags: ${violation.tags.join(', ')}\n`;
      combinedResultsText += `Help: ${violation.help}\n`;
      combinedResultsText += `Help URL: ${violation.helpUrl}\n`;
      combinedResultsText += `Nodes:\n`;
      violation.nodes.forEach(node => {
        combinedResultsText += `  HTML: ${node.html}\n`;
        combinedResultsText += `  Target: ${node.target.join(', ')}\n\n`;
      });
    });

    combinedResultsText += '\n\n';
  }

  await browser.close();

  // Save the combined results to a text file
  fs.writeFileSync('accessibility-results.txt', combinedResultsText);

  console.log('Accessibility testing completed. Results saved to accessibility-results.txt');
})();
