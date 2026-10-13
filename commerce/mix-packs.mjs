export function configureMixPacks(document,offers,unitPrice,allowance){
 const doc=structuredClone(document),root=doc.products.find(p=>p.id===doc.id),packId=doc.id+'-mix-pack';
 if(!root?.groupedDesigns)throw Error('Choose a grouped collection first.');
 if(!Number.isSafeInteger(unitPrice)||unitPrice<=allowance||offers.some(o=>!Number.isInteger(o.quantity)||o.quantity<2||o.quantity>20||!Number.isSafeInteger(o.priceCents)||o.priceCents<=allowance))throw Error('Use valid pack sizes and prices above the included allowance.');
 doc.products=doc.products.filter(p=>p.id!==packId&&p.variantOf!==packId);
 for(const p of doc.products){p.shippingPriceMode='included';p.shippingFeeCents=0;p.basePriceCents=unitPrice-allowance;p.deliveryExtraCents=0;p.pricingSchemaVersion=2;p.priceCents=unitPrice;p.variants?.forEach(v=>Object.assign(v,{priceCents:unitPrice,basePriceCents:unitPrice-allowance,deliveryExtraCents:0,pricingSchemaVersion:2}));}
 root.bundleOffers=offers.map(o=>({quantity:o.quantity,sku:packId+'-'+o.quantity}));
 root.description=root.description.split('Mix & match your mini safari')[0].trim();
 root.description+=' Choose a single animal or build a pack with your favourite designs. Free shipping in Canada.';
 const pack={...root,id:packId,name:root.name.split(' — ')[0]+' — Mix & Match Pack',purchaseOnly:true,listingGroup:doc.id,description:'Build your own animal pack. The selected animal quantities are listed on your order. Free shipping in Canada.',included:'Your selected animal pack, assembled as pictured.',variantLabel:'Pack size',variants:offers.map(o=>({id:packId+'-'+o.quantity,label:o.quantity+' animals',priceCents:o.priceCents,basePriceCents:o.priceCents-allowance,deliveryExtraCents:0,pricingSchemaVersion:2,dimensions:root.dimensions})),priceCents:Math.min(...offers.map(o=>o.priceCents)),basePriceCents:Math.min(...offers.map(o=>o.priceCents))-allowance};
 delete pack.groupedDesigns;delete pack.bundleOffers;doc.products.push(pack);return doc;
}
