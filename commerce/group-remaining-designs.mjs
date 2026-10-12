// Idempotent migration: keep production IDs, prices and checkout SKUs intact.
export function groupRemainingDesigns(catalog) {
  const result = structuredClone(catalog);
  const families = [
    {id:'figurine-fidget-designs', name:'Figurines & Fidgets — Choose Your Design', category:'Creatures & collectibles', ids:['skeleton-chameleon','articulated-baby-dragon','articulated-hermes-the-hermit-crab','joyful-axolotl','dinosaur-skeleton-collection'], description:'Choose a character for your shelf or desk. Explore each design’s photos and price before ordering. The Dinosaur Skeleton Collection option includes all six figures; other options include one figure.'},
    {id:'halloween-candy-holder-designs', name:'Halloween Bowls & Candy Holders — Choose Your Design', category:'Halloween candy holders', ids:['melting-pumpkin-candy-dispenser','spectral-candy-holder','walkin-pumpkin-candy-holder','glutton-ghost-bowl','ghost-duo-trinket-dish','skull-web-trinket-dish'], description:'Choose a spooky bowl, candy holder, dispenser or trinket dish. Each design has its own photos, dimensions and price. Includes one selected item; candy and display props are not included. Use bowls for wrapped treats or decorative storage.'},
  ];
  for (const family of families) {
    const existing = result.products.find(p=>p.id===family.id);
    if(existing?.designGroupingRevision===1) continue;
    const designs = family.ids.map(id=>result.products.find(p=>p.id===id)).filter(Boolean);
    if(!designs.length) continue;
    const parent = {...(existing || designs[0]), id:family.id, name:family.name, category:family.category, description:family.description,
      included:'One selected design. The Dinosaur Skeleton Collection option includes six figures.',
      dimensions:'', priceCents:Math.min(...designs.map(p=>p.priceCents)), variantLabel:'Design', designGroupingRevision:1,
      groupedDesigns:designs.map(p=>({id:p.id,label:p.name,optionIds:[p.id]})),
      variants:designs.map(p=>({id:p.id,label:p.name,priceCents:p.priceCents,dimensions:p.dimensions})),
      images:designs.map(p=>p.images[0]).filter(Boolean)};
    if(family.id==='halloween-candy-holder-designs')parent.included='One selected bowl, holder, dispenser or dish. Candy and props are not included.';
    for(const key of ['listingGroup','video','videos','source','bundleContents','notes'])delete parent[key];
    for(const p of designs)p.listingGroup=family.id;
    result.products=result.products.filter(p=>p.id!==family.id);result.products.push(parent);
    for(const collection of result.collections){
      collection.products=[...new Set(collection.products.map(id=>family.ids.includes(id)?family.id:id))];
      if(family.ids.includes(collection.coverProduct))collection.coverProduct=family.id;
    }
  }
  return result;
}
