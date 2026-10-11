const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const products = JSON.parse(fs.readFileSync('commerce/products.json', 'utf8'));
const group = products.find(p => p.id === 'straw-topper-charm-designs');
const origin = 'http://127.0.0.1:4173';
(async () => {
 const browser = await chromium.launch({channel:'msedge',headless:true});
 try {
  for (const width of [1440,390]) {
   const page = await browser.newPage({viewport:{width,height:900}});
   await page.route('**/.netlify/functions/**', r => r.fulfill({contentType:'application/json',body:'{}'}));
   let cartInput;
   await page.route('https://aqk73w-k2.myshopify.com/api/**', route => {
    const payload=route.request().postDataJSON();
    if(payload.query.includes('CreateCart')) { cartInput=payload.variables.input;return route.fulfill({contentType:'application/json',body:JSON.stringify({data:{cartCreate:{cart:{checkoutUrl:origin+'/checkout-test'},userErrors:[],warnings:[]}}})}); }
    const data={};
    for(const [key,handle] of Object.entries(payload.variables)) {
     const p=products.find(p=>p.id===handle);
     data['product'+key.replace('handle','')]={handle,title:p?.name||handle,variants:{nodes:[handle,handle+'-pickup'].map(sku=>({sku,id:'gid://shopify/ProductVariant/'+sku,availableForSale:true,price:{amount:((p?.priceCents||2999)-(sku.endsWith('-pickup')?(p?.pickupPriceDifferenceCents??1000):0))/100+'',currencyCode:'CAD'}}))}};
    }
    return route.fulfill({contentType:'application/json',body:JSON.stringify({data})});
   });
   await page.goto(origin+'/shop/tumbler-accessories?analytics_test=1');
   assert.equal(await page.locator('.shop-card').count(),1);
   await page.goto(origin+'/shop/'+group.id+'?analytics_test=1');
   await page.getByText('Explore all 6 designs',{exact:true}).waitFor();
   assert.equal(await page.locator('.shop-thumbs button[aria-label*="product photo"]').count(),48);
   assert.equal(await page.locator('.shop-video-thumb').count(),6);
   for (let i=0;i<6;i++) {
    const product=products.find(p => p.id===group.groupedDesigns[i].id);
    await page.locator('.shop-design-options button').nth(i).click();
    await page.getByText('Selected design photos',{exact:true}).waitFor();
    assert((await page.locator('.shop-price').innerText()).includes((product.priceCents/100).toFixed(2)));
    if(group.launchReady) {
     await page.getByRole('button',{name:/Edmonton pickup/}).click();
     assert((await page.locator('.shop-price').innerText()).includes((product.priceCents/100).toFixed(2)));
     await page.getByRole('button',{name:/Delivered to you/}).click();
     await page.getByRole('button',{name:'Add to cart',exact:true}).click();
    } else assert.equal(await page.getByRole('button',{name:'Preview only — ordering not open',exact:true}).isEnabled(),false);
    assert.equal(await page.locator('.shop-thumbs button[aria-label*="product photo"]').count(),product.images.length);
    await page.locator('.shop-video-thumb').click();
    const video=page.locator('.shop-main-image video');
    await video.waitFor();
    await page.waitForFunction(() => document.querySelector('.shop-main-image video')?.readyState>=2);
    assert((await video.evaluate(v=>v.currentSrc)).includes(product.id));
    assert.equal(await video.evaluate(v=>v.error),null);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   }
   await page.locator('.shop-design-options button').first().click();
   await page.getByRole('button',{name:'Show all designs',exact:true}).click();
   await page.locator('.gallery-pending').waitFor({state:'hidden'});
   await page.locator('.shop-detail-info h1').scrollIntoViewIfNeeded();
   fs.mkdirSync('test-results',{recursive:true});
   await page.screenshot({path:`test-results/tumbler-accessories-${width}.png`});
   if(group.launchReady) {
    await page.goto(origin+'/shop/cart?analytics_test=1');
    await page.getByRole('button',{name:'Secure checkout ↗',exact:true}).waitFor();
    assert((await page.locator('.shop-total').nth(1).innerText()).includes('$5.00'));
    assert((await page.locator('.shop-cart-total').innerText()).includes('$101.94'));
    await page.getByRole('button',{name:/Edmonton pickup/}).click();
    assert((await page.locator('.shop-total').nth(1).innerText()).includes('Free'));
    assert((await page.locator('.shop-cart-total').innerText()).includes('$96.94'));
    await page.getByRole('button',{name:/Delivered to you/}).click();
    await page.getByRole('button',{name:'Secure checkout ↗',exact:true}).click();
    await page.waitForURL(origin+'/checkout-test');
    assert.equal(cartInput.lines.length,6);
    assert.deepEqual(cartInput.lines.map(l=>l.merchandiseId).sort(),group.groupedDesigns.map(d=>'gid://shopify/ProductVariant/'+d.id).sort());
   }
   await page.close();
   console.log(`PASS ${width}px: one grouped card, 48 photos, six prices/designs and six playable videos.`);
  }
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});


