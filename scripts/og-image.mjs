// Renders public/og.png (1200x630) from an inline HTML card with an installed Chrome.
// Usage: node scripts/og-image.mjs   (set PW_CHANNEL=msedge to use Edge instead)
import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const out = fileURLToPath(new URL('../public/og.png', import.meta.url));
const mark = `<svg width="72" height="72" viewBox="0 0 24 24"><path d="M12 2.8c4.6 0 8.6 2.9 9 7.4.4 4.8-3 9.6-8.3 10.9C7.4 22.4 2.8 19 2.6 13.7 2.4 7.8 6.6 2.8 12 2.8Z" fill="none" stroke="#2DD4BF" stroke-opacity=".45" stroke-width="1.2"/><path d="M12.6 6.6c2.9.1 5.1 2 5.2 4.8.1 3.1-2.2 5.8-5.4 6.1-3 .3-5.4-1.7-5.5-4.6C6.8 9.6 9.3 6.5 12.6 6.6Z" fill="none" stroke="#2DD4BF" stroke-opacity=".8" stroke-width="1.2"/><path d="M13 10.1c1.3 0 2.3.9 2.3 2.2 0 1.4-1.1 2.5-2.5 2.5-1.3 0-2.2-.9-2.2-2.1 0-1.4 1-2.6 2.4-2.6Z" fill="#2DD4BF"/></svg>`;
const rings = Array.from({ length: 11 }, (_, i) => `<ellipse cx="930" cy="300" rx="${60 + i * 46}" ry="${40 + i * 30}" transform="rotate(${-12 + i * 2} 930 300)" fill="none" stroke="${i === 5 ? '#2DD4BF' : '#2A323B'}" stroke-opacity="${i === 5 ? 0.8 : 0.9}" />`).join('');
const html = `<!doctype html><html><body style="margin:0;width:1200px;height:630px;background:#0B0D10;font-family:Inter,Segoe UI,system-ui,sans-serif;color:#E6EAEE;overflow:hidden;position:relative">
<svg width="1200" height="630" style="position:absolute;inset:0">${rings}</svg>
<div style="position:absolute;left:80px;bottom:96px;max-width:620px">
${mark}
<div style="font-family:Consolas,monospace;font-size:22px;color:#2DD4BF;margin-top:28px">Security visualization kit</div>
<div style="font-size:120px;font-weight:600;letter-spacing:-5px;line-height:1;margin-top:8px">Atlas</div>
<div style="font-size:36px;line-height:1.25;margin-top:20px">Charts that read your infrastructure like a map.</div>
</div></body></html>`;

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'chrome' });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html);
await page.screenshot({ path: out });
await browser.close();
console.log('wrote', out);
