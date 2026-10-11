const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const products = JSON.parse(fs.readFileSync('commerce/products.json', 'utf8'));
const groups = products.filter(product => product.groupedDesigns?.length);
const origin = 'http://127.0.0.1:4173';
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const width of [1440, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/.netlify/functions/**', route => route.fulfill({ contentType: 'application/json', body: '{}' }));
      await page.route('**/myshopify.com/**', route => route.abort());
      for (const group of groups) {
        const owners = group.groupedDesigns.map(design => products.find(product => product.id === design.id));
        const count = new Set(owners.flatMap(owner => owner.images.map(image => image.src))).size + (group.galleryOverviewCover ? 1 : 0);
        await page.goto(`${origin}/shop/${group.id}?analytics_test=1`);
        await page.getByText(`Explore all ${owners.length} designs`, { exact: true }).waitFor();
        const thumbs = page.locator('.shop-thumbs button');
        const photos = page.locator('.shop-thumbs button[aria-label*="product photo"]');
        assert.equal(await photos.count(), count, group.id + ' overview');
        const videoCount = owners.reduce((total, owner) => total + (owner.videos?.length || (owner.video ? 1 : 0)), 0);
        assert.equal(await page.locator('.shop-video-thumb').count(), videoCount, 'all design videos');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, group.id + ' overflow');
        assert((await page.locator('.shop-thumbs').boundingBox()).height < 180, 'compact overview');
        for (let i = 0; i < owners.length; i++) {
          const owner = owners[i];
          await page.locator('.shop-design-options button').nth(i).click();
          await page.getByText('Selected design photos', { exact: true }).waitFor();
          assert.equal(await photos.count(), owner.images.length, owner.id + ' selected photos');
          assert.equal(await page.locator('.shop-video-thumb').count(), owner.videos?.length || (owner.video ? 1 : 0), 'selected videos');
          assert((await page.locator('.shop-main-image img').last().getAttribute('src')).includes(owner.images[0].src.replace(/\.[^.]+$/, '')), owner.id + ' image');
          const selectedUrl = page.url();
          await page.getByRole('button', { name: 'Show all designs', exact: true }).click();
          assert.equal(await photos.count(), count);
          assert.equal(page.url(), selectedUrl, 'overview preserves selected SKU');
        }
        if (group.id === 'personalized-photo-holder-designs') {
          fs.mkdirSync('test-results', { recursive: true });
          await page.screenshot({ path: `test-results/grouped-gallery-${width}.png` });
        }
        const variant = group.groupedDesigns.at(-1).optionIds[0];
        await page.goto(`${origin}/shop/${group.id}?variant=${variant}&analytics_test=1`);
        await page.getByText('Selected design photos', { exact: true }).waitFor();
        assert.equal(await photos.count(), owners.at(-1).images.length, 'deep link');
      }
      assert.deepEqual(errors, []);
      await page.close();
      console.log(`Grouped galleries passed at ${width}px (${groups.length} groups, every design).`);
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
