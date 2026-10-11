import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { gunzipSync, brotliDecompressSync } from 'node:zlib';

const pages = ['','hunddagis','hundpensionat','priser','vanliga-fragor'];
const titles = new Set();
const descriptions = new Set();
for (const page of pages) {
  const html = await readFile(resolve('dist',page ? `${page}.html` : 'index.html'),'utf8');
  const filename = page ? `${page}.html` : 'index.html';
  assert.equal(gunzipSync(await readFile(resolve('dist',`${filename}.gz`))).toString(),html,'Gzip matches generated page');
  assert.equal(brotliDecompressSync(await readFile(resolve('dist',`${filename}.br`))).toString(),html,'Brotli matches generated page');
  const url = `https://cleverdog.se/${page}`;
  assert.equal((html.match(/<h1(?:\s|>)/g)||[]).length,1,`${page}: exactly one H1`);
  assert.ok(html.includes(`href="${url}"`),`${page}: self canonical`);
  assert.ok(html.includes('data-prerendered="true"'),`${page}: generated content`);
  assert.ok(!html.includes('[style*="opacity:0"]'),`${page}: preserve decorative fractional opacity`);
  assert.ok(!/name="robots"[^>]*noindex/.test(html),`${page}: indexable`);
  assert.ok(!html.includes('/src/assets/'),`${page}: no development assets`);
  assert.ok(!html.includes('The server did not finish this Suspense boundary'),`${page}: completed lazy rendering`);
  const title = html.match(/<title>(.*?)<\/title>/)?.[1];
  const description = html.match(/<meta name="description" content="([^"]*)"/)?.[1];
  // Homepage and daycare must have distinct search titles too.
  assert.ok(title && !titles.has(title),`${page}: unique title`); titles.add(title);
  assert.ok(description && !descriptions.has(description),`${page}: unique description`); descriptions.add(description);
  for (const other of pages.filter(Boolean)) assert.ok(html.includes(`href="/${other}"`),`${page}: linked ${other}`);
  for (const match of html.matchAll(/(?:src|href)="(\/assets\/[^"?]+)"/g)) {
    await access(resolve('dist',match[1].slice(1)));
  }
  for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) JSON.parse(match[1]);
  console.log(`SEO checks passed: ${url}`);
}
const home = await readFile('dist/index.html','utf8');
assert.ok(/3700\s+SEK/.test(home.replace(/<[^>]*>/g,'')),'Homepage prices present before JavaScript');
assert.ok(home.includes('id="contact"'),'Homepage contact present before JavaScript');
const shell = await readFile('dist/app-shell.html','utf8');
assert.ok(shell.includes('noindex, nofollow'),'Private app shell not indexable');
assert.ok(!shell.includes('<h1'),'Private app shell excludes public prerender');
const sitemap = await readFile('dist/sitemap.xml','utf8');
assert.equal((sitemap.match(/<loc>/g)||[]).length,5,'Five public sitemap pages');
for (const page of pages) assert.ok(sitemap.includes(`<loc>https://cleverdog.se/${page}</loc>`));
const redirects = await readFile('dist/_redirects','utf8');
const rules = redirects.split('\n').filter(line=>line.trim() && !line.trim().startsWith('#')).map(line=>line.trim().split(/\s+/));
for (const [from,to,status] of rules) {
  if (/^30[12]/.test(status)) {
    assert.notEqual(from.replace(/\/$/,''),to.replace(/\/$/,''),`${from}: Netlify ignores trailing slashes when matching redirects`);
  }
  if (status === '200' && from !== '/api/*') {
    assert.ok(!rules.some(([redirectFrom,,redirectStatus])=>redirectFrom===to && /^30[12]!$/.test(redirectStatus)),`${from}: rewrite target must not force a redirect loop`);
  }
}
assert.ok(redirects.includes('/app-shell.html'),'Private route rewrites retained');
assert.ok(/\/\*\s+\/404.html\s+404/.test(redirects),'Unknown paths retain real 404');
console.log('SEO build verification complete.');
