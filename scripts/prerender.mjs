import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PassThrough } from 'node:stream';
import { gzipSync, brotliCompressSync } from 'node:zlib';
import { renderToPipeableStream } from 'react-dom/server';
import { createServer } from 'vite';

const dist = resolve('dist');
const template = await readFile(resolve(dist, 'index.html'), 'utf8');
const manifest = JSON.parse(await readFile(resolve(dist, '.vite/manifest.json'), 'utf8'));
const rootPattern = /<div id="root">[\s\S]*<\/div>(?=\s*<\/body>)/;
if (!rootPattern.test(template)) throw new Error('Root markup placeholder not found');

const escapeHtml = value => value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
async function writeCompressed(filename, content) {
  await writeFile(resolve(dist,filename),content,'utf8');
  // Vite compressed the original template; replace stale sidecars as well.
  await writeFile(resolve(dist,`${filename}.gz`),gzipSync(content));
  await writeFile(resolve(dist,`${filename}.br`),brotliCompressSync(content));
}
function metadata(html, page) {
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(page.title)}</title>`);
  for (const [attr, key, value] of [
    ['name','description',page.description], ['property','og:title',page.title],
    ['property','og:description',page.description], ['property','og:url',page.url],
    ['name','twitter:title',page.title], ['name','twitter:description',page.description],
  ]) {
    const pattern = new RegExp(`<meta ${attr}="${key}"[^>]*>`);
    if (!pattern.test(html)) throw new Error(`Missing metadata: ${key}`);
    html = html.replace(pattern, `<meta ${attr}="${key}" content="${escapeHtml(value)}" />`);
  }
  return html.replace(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${page.url}" />`);
}

async function markup(tree) {
  return new Promise((resolvePromise,reject) => {
    const chunks = [];
    const output = new PassThrough();
    output.on('data',chunk => chunks.push(chunk));
    output.on('end',() => { clearTimeout(timer); resolvePromise(Buffer.concat(chunks).toString()); });
    output.on('error',reject);
    const stream = renderToPipeableStream(tree, {
      onAllReady() { stream.pipe(output); },
      onError(error) { clearTimeout(timer); reject(error); },
    });
    const timer = setTimeout(() => { stream.abort(); reject(new Error('Prerender timed out')); },30000);
  });
}

function assets(html) {
  return html.replace(/\/src\/assets\/[^"\s<>]+/g, source => {
    const entry = manifest[source.slice(1)];
    if (!entry?.file) throw new Error(`No production asset mapping for ${source}`);
    return `/${entry.file}`;
  });
}

// The client build remains unchanged. Only the isolated Node rendering context
// aliases the booking database module; no auth sessions or user data are loaded.
const vite = await createServer({
  configFile: resolve('vite.config.ts'), mode: 'production', appType: 'custom',
  server: { middlewareMode: true, watch: null },
  optimizeDeps: { noDiscovery: true, include: [] },
  ssr: { noExternal: ['react-router-dom', 'react-router'], resolve: { conditions: ['node', 'module-sync', 'import'] } },
  resolve: { alias: [{ find: /\.\.\/lib\/database$/, replacement: resolve('scripts/prerender-database.mjs') }] },
});
try {
  const { publicTree, servicePages } = await vite.ssrLoadModule('/src/seo/prerender-entry.tsx');
  const homepage = {
    path: '/', title: 'Hunddagis i Staffanstorp nära Malmö & Lund | Clever Dog',
    description: 'Tryggt hunddagis och hundpensionat i Staffanstorp, nära Malmö och Lund. Godkänt av Länsstyrelsen. Se priser och boka plats hos Clever Dog.',
  };
  for (const page of [homepage,...servicePages]) {
    const url = `https://cleverdog.se${page.path}`;
    const body = assets(await markup(await publicTree(page.path)));
    let html = metadata(template,{...page,url}).replace(rootPattern,`<div id="root" data-prerendered="true">${body}</div>`);
    // Framer Motion's initial opacity is normally hidden until JS observes
    // visibility. Keep the built page usable when JS is disabled/slow.
    html = html.replace('</head>', '<style>#root[data-prerendered] [style*="opacity:0"]{opacity:1!important;transform:none!important}</style></head>');
    html = html.replace('<html lang="sv"', '<html lang="sv" data-seo-build="static-v1"');
    if (page.path !== '/') {
      const breadcrumb = { '@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[
        {'@type':'ListItem',position:1,name:'Clever Dog',item:'https://cleverdog.se/'},
        {'@type':'ListItem',position:2,name:page.label,item:url},
      ]};
      html = html.replace('</head>',`<script type="application/ld+json">${JSON.stringify(breadcrumb).replaceAll('<','\\u003c')}</script></head>`);
    }
    const filename = page.path === '/' ? 'index.html' : `${page.path.slice(1)}.html`;
    await writeCompressed(filename,html);
    console.log(`Prerendered ${page.path} (${Buffer.byteLength(html)} bytes)`);
  }
  // App/private routes must not receive prerendered marketing content or
  // accidentally inherit its canonical/schema. Routing and auth remain client-side.
  let shell = template.replace(rootPattern,'<div id="root"></div>')
    .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g,'')
    .replace(/<meta name="robots"[^>]*>/g,'')
    .replace(/<link rel="canonical"[^>]*>/g,'')
    .replace(/<title>[\s\S]*?<\/title>/,'<title>Clever Dog</title>')
    .replace('</head>','<meta name="robots" content="noindex, nofollow" /></head>');
  await writeCompressed('app-shell.html',shell);
  const urls = ['/',...servicePages.map(page=>page.path)];
  // Deliberately omit artificial daily lastmod dates: unrelated deploys do not
  // mean every service page's content changed.
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(path=>`  <url><loc>https://cleverdog.se${path}</loc></url>`).join('\n')}\n</urlset>\n`;
  await writeCompressed('sitemap.xml',sitemap);
  // Independent deployment marker for verifying Git-triggered production.
  await mkdir(resolve(dist,'.well-known'),{recursive:true});
  await writeFile(resolve(dist,'.well-known/seo-build.json'),JSON.stringify({
    commit: process.env.COMMIT_REF || null, pages: urls, renderer: 'static-v1',
  })+'\n');
} finally {
  await vite.close();
}
