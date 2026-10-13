type SearchRecord = {name?:string;description?:string;seoTitle?:string;seoDescription?:string};
export function searchTitle(product:SearchRecord):string;
export function brandedSearchTitle(product:SearchRecord):string;
export function searchDescription(product:SearchRecord):string;
