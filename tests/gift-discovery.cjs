const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const products=JSON.parse(fs.readFileSync('commerce/products.json'));
 for(const p of products.filter(p=>!p.variantOf)) {
  const html=fs.readFileSync(`dist/shop/${p.id}/index.html`,'utf8');
  assert(html.includes(`href="https://custombuildstudio.ca/shop/${p.id}/"`));
  const schema=JSON.parse(html.match(/id="structured-data"[^>]*>(.*?)<\/script>/s)[1]);
  const data=schema['@graph'][0];
  for(const item of data.hasVariant||[data]) {
   const source=products.find(p=>p.id===item.sku);
   assert.equal(Number(item.offers.price)*100,source.priceCents);
   assert.equal(item.offers.priceCurrency,'CAD');
  }
 }
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try {
  const page=await browser.newPage();
  for(const width of [1440,390]) {
   await page.setViewportSize({width,height:900});
   for(const route of ['/shop/','/shop/halloween/','/shop/mood-ghost/?variant=mood-ghost-design-b','/shop/octopus-wine-bottle-holder/?variant=octopus-wine-bottle-holder-345']) {
    await page.goto('http://127.0.0.1:4173'+route);
    await page.waitForTimeout(200);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    assert.equal(await page.locator('h1').count(),1);
   }
   assert.match(await page.locator('.shop-price').innerText(),/109.99/);
   await page.getByRole('button',{name:'Add to Cart',exact:true}).click();
   assert.match(await page.locator('.shop-added-confirmation').innerText(),/3.45/);
  }
  console.log('14 product schemas/canonicals and desktop/mobile category, variant deep-links and add-to-cart passed.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
