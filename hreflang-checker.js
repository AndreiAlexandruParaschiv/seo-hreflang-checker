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
const headers = [
    'Page URL', 'hreflang', 'href',
    'inHead', 'inHeadReason',
    'isSelfReferencing', 'isSelfReferencingReason',
    'isAbsolute', 'isAbsoluteReason',
    'matchesCanonical', 'matchesCanonicalReason',
    'htmlLang',
    'canonicalMismatch', 'canonicalMismatchReason',
    'ogUrlMismatch', 'ogUrlMismatchReason',
    'langMismatch', 'langMismatchReason',
    'reasons'
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
        const ogUrl = await page.$eval('meta[property="og:url"]', el => el.content).catch(() => null);
        const htmlLang = await page.$eval('html', el => el.lang).catch(() => null);
        const currentUrl = page.url();

        const canonicalMismatch = canonical && canonical !== currentUrl ? 'FAIL' : 'OK';
        const ogUrlMismatch = ogUrl && ogUrl !== currentUrl ? 'FAIL' : 'OK';

        const results = hreflangs.map(entry => {
            const reasons = [];

            const isSelfReferencing = entry.href === currentUrl ? 'OK' : 'FAIL';
            if (isSelfReferencing === 'FAIL') reasons.push('hreflang not self-referencing');

            const isAbsolute = entry.href.startsWith('http') ? 'OK' : 'FAIL';
            if (isAbsolute === 'FAIL') reasons.push('hreflang href is not absolute');

            const matchesCanonical = entry.href === canonical ? 'OK' : 'FAIL';
            if (matchesCanonical === 'FAIL') reasons.push('hreflang does not match canonical');

            if (canonicalMismatch === 'FAIL') reasons.push('canonical points to a different URL');
            if (ogUrlMismatch === 'FAIL') reasons.push('og:url points to a different URL');

            const langMismatch = htmlLang && entry.hreflang && !entry.hreflang.startsWith(htmlLang) ? 'FAIL' : 'OK';
            if (langMismatch === 'FAIL') reasons.push('lang attribute mismatch between html and hreflang');

            const inHead = entry.inHead ? 'OK' : 'FAIL';
            if (inHead === 'FAIL') reasons.push('hreflang not inside <head>');

            return {
                ...entry,
                isSelfReferencing,
                isAbsolute,
                matchesCanonical,
                htmlLang,
                canonicalMismatch,
                ogUrlMismatch,
                langMismatch,
                inHead,
                reasons: reasons.join('; ')
            };
        });

        results.forEach(result => {
            output.push([
                url,
                result.hreflang,
                result.href,
                result.inHead,
                result.inHead === 'FAIL' ? 'FAIL → hreflang tag is not inside <head>' : '',
                result.isSelfReferencing,
                result.isSelfReferencing === 'FAIL' ? 'FAIL → hreflang does not point to self' : '',
                result.isAbsolute,
                result.isAbsolute === 'FAIL' ? 'FAIL → href is not absolute' : '',
                result.matchesCanonical,
                result.matchesCanonical === 'FAIL' ? 'FAIL → hreflang href does not match canonical' : '',
                result.htmlLang,
                result.canonicalMismatch,
                result.canonicalMismatch === 'FAIL' ? 'FAIL → Canonical tag does not point to this page' : '',
                result.ogUrlMismatch,
                result.ogUrlMismatch === 'FAIL' ? 'FAIL → Open Graph URL does not match current page' : '',
                result.langMismatch,
                result.langMismatch === 'FAIL' ? `FAIL → html lang is "${result.htmlLang}", hreflang is "${result.hreflang}"` : '',
                `"${result.reasons}"`
            ].join(','));
        });
    }

    fs.writeFileSync(outputFile, output.join('\n'), 'utf8');
    console.log(`\nResults saved to ${outputFile}`);
    await browser.close();
})();
