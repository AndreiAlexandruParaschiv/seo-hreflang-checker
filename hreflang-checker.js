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

const outputFile = path.join(resultsDir, 'hreflang-results.csv');
const headers = [
    'Page URL', 'hreflang', 'href', 'inHead', 'isSelfReferencing', 'isAbsolute', 'matchesCanonical'
];

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    const output = [headers.join(',')];

    for (const url of urls) {
        console.log(`\nChecking: ${url}`);
        await page.goto(url, { waitUntil: 'domcontentloaded' });

        const hreflangs = await page.$$eval('link[rel="alternate"]', links =>
            links.map(link => ({
                hreflang: link.getAttribute('hreflang'),
                href: link.getAttribute('href'),
                inHead: link.parentElement.tagName === 'HEAD'
            }))
        );

        const canonical = await page.$eval('link[rel="canonical"]', el => el.href).catch(() => null);
        const currentUrl = page.url();

        const results = hreflangs.map(entry => ({
            ...entry,
            isSelfReferencing: entry.href === currentUrl,
            isAbsolute: entry.href.startsWith('http'),
            matchesCanonical: entry.href === canonical
        }));

        results.forEach(result => {
            output.push([
                url,
                result.hreflang,
                result.href,
                result.inHead,
                result.isSelfReferencing,
                result.isAbsolute,
                result.matchesCanonical
            ].join(','));
        });
    }

    fs.writeFileSync(outputFile, output.join('\n'), 'utf8');
    console.log(`\nResults saved to ${outputFile}`);
    await browser.close();
})();
