// hreflang-checker.js
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const config = require('./config.json');
const urls = config.urls;

const resultsDir = path.join(__dirname, 'results');
if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir);
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const outputFile = path.join(resultsDir, `hreflang-results-${timestamp}.csv`);

// headers for the CSV output
const headers = [
    'Page URL',
    'hreflang',
    'href',
    'In Head?',
    'Self-Referencing?',
    'Self-Referencing Reason',
    'Absolute URL?',
    'Absolute URL Reason',
    'Valid Language Code?',
    'Valid Language Code Reason',
    'hreflang href same with canonical?',
    'hreflang href same with canonical? Reason',
    'Has x-default?',
    'Overall Issues'
];

// Helper for hreflang value validation (ISO 639-1 + ISO 3166-1)
const validLangPattern = /^([a-z]{2}(-[A-Z]{2})?|x-default)$/;

(async () => {
    const startTime = Date.now();
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    const output = [headers.join(',')];
    let totalUrls = 0;
    let totalFailures = 0;

    for (const url of urls) {
        totalUrls++;
        console.log(`\nChecking: ${url}`);
        await page.goto(url, { waitUntil: 'domcontentloaded' });

        // Extract hreflang tags
        const hreflangs = await page.$$eval('link[rel="alternate"]', links =>
            links.map(link => ({
                hreflang: link.getAttribute('hreflang'),
                href: link.getAttribute('href'),
                inHead: link.parentElement.tagName === 'HEAD'
            }))
        );

        // Get page metadata
        const canonical = await page.$eval('link[rel="canonical"]', el => el.href).catch(() => null);
        const currentUrl = page.url();

        // Check if the page has x-default and self-referencing hreflang
        const hasXDefault = hreflangs.some(h => h.hreflang === 'x-default');
        const hasSelfRef = hreflangs.some(h => h.href === currentUrl);

        if (hreflangs.length === 0) {
            // No hreflang tags found
            totalFailures++;
            output.push([
                url, '', '', '', '', '', '', '', '', '', '', '', 'FAIL', 'No hreflang tags found'
            ].join(','));
        } else {
            // Check each hreflang tag
            hreflangs.forEach(entry => {
                const issues = [];

                // Check if hreflang tag is placed in the HTML <head> section
                // This is required for search engines to properly recognize hreflang tags
                const inHead = entry.inHead ? 'OK' : 'FAIL';

                // Check if hreflang tag references the current page (self-referencing)
                // Every page must include a self-referencing hreflang tag pointing to itself
                const isSelfRef = entry.href === currentUrl ? 'OK' : 'FAIL';
                const selfRefReason = isSelfRef === 'FAIL' ? 'Does not reference current page' : '';
                if (isSelfRef === 'FAIL') issues.push('Not self-referencing');

                // Check if hreflang uses absolute URLs (full URLs with http/https)
                // Relative URLs can cause indexing issues and misinterpretation by search engines
                const isAbsolute = entry.href && entry.href.startsWith('http') ? 'OK' : 'FAIL';
                const absoluteReason = isAbsolute === 'FAIL' ? 'Relative URL used instead of absolute' : '';
                if (isAbsolute === 'FAIL') issues.push('Relative URL');

                // Check if hreflang value follows correct ISO format (language-country or x-default)
                // Must use ISO 639-1 language codes and ISO 3166-1 country codes
                const isValidLang = validLangPattern.test(entry.hreflang) ? 'OK' : 'FAIL';
                const langReason = isValidLang === 'FAIL' ? `Invalid format: ${entry.hreflang}` : '';
                if (isValidLang === 'FAIL') issues.push('Invalid language code');

                // Check if hreflang URL matches the page's canonical URL
                // Only canonical URLs should be referenced in hreflang tags to avoid confusion
                const canonicalConsistent = !canonical || entry.href === canonical || entry.hreflang === 'x-default' ? 'OK' : 'FAIL';
                const canonicalReason = canonicalConsistent === 'FAIL' ? 'hreflang URL differs from canonical URL' : '';
                if (canonicalConsistent === 'FAIL') issues.push('Canonical mismatch');

                // Check if page has x-default hreflang tag
                // x-default specifies the default page when no language/region matches the user
                const xDefaultStatus = hasXDefault ? 'OK' : 'FAIL';

                // Overall issues summary
                const overallIssues = issues.length > 0 ? issues.join('; ') : 'No issues';

                // Count failures for this hreflang entry
                if (inHead === 'FAIL' || isSelfRef === 'FAIL' || isAbsolute === 'FAIL' ||
                    isValidLang === 'FAIL' || canonicalConsistent === 'FAIL' || xDefaultStatus === 'FAIL') {
                    totalFailures++;
                }

                output.push([
                    url,
                    entry.hreflang,
                    entry.href,
                    inHead,
                    isSelfRef,
                    selfRefReason,
                    isAbsolute,
                    absoluteReason,
                    isValidLang,
                    langReason,
                    canonicalConsistent,
                    canonicalReason,
                    xDefaultStatus,
                    overallIssues
                ].join(','));
            });

            // Add page-level summary if there are critical missing elements
            const pageLevelIssues = [];
            if (!hasXDefault) pageLevelIssues.push('Missing x-default');
            if (!hasSelfRef) pageLevelIssues.push('No self-referencing hreflang');

            if (pageLevelIssues.length > 0) {
                totalFailures++;
                output.push([
                    url, '', '', '', '', '', '', '', '', '', '', '', 'FAIL',
                    `Page-level issues: ${pageLevelIssues.join('; ')}`
                ].join(','));
            }
        }

        // Add blank line between URLs for clarity
        output.push('');
    }

    const endTime = Date.now();
    const processingTime = ((endTime - startTime) / 1000).toFixed(2);

    fs.writeFileSync(outputFile, output.join('\n'), 'utf8');
    console.log(`\nResults saved to ${outputFile}`);
    console.log(`\n=== SUMMARY ===`);
    console.log(`URLs checked: ${totalUrls}`);
    console.log(`Total failures found: ${totalFailures}`);
    console.log(`Processing time: ${processingTime} seconds`);

    await browser.close();
})();
