export const business = {
  name: "Custom Build Studio",
  origin: "https://custombuildstudio.ca",
  email: "custombuildstudio@gmail.com",
  phone: "780-203-0081",
  telephone: "+17802030081",
  googleProfile: "https://share.google/r0qV4iw8FxD8SLkLL",
  etsy: "https://www.etsy.com/shop/CustomBuildStudio",
  etsyReviews: "https://www.etsy.com/shop/CustomBuildStudio#reviews",
  instagram: "https://instagram.com/Custom_Build_Studio",
  facebook: "https://www.facebook.com/profile.php?id=61582467820321",
};

export const reviewSummary = {
  rating: "5.0",
  googleCount: 21,
  etsyCount: 5,
  totalCount: 26,
};

export type VerifiedReview = {
  id: string;
  name: string;
  platform: "Google" | "Etsy";
  context: string;
  text: string;
  source: string;
};

// Publish only verbatim public testimonials approved by the owner, with direct source links.
export const verifiedReviews: VerifiedReview[] = [
  {
    id: "etsy-amninder-lamp",
    name: "Amninder",
    platform: "Etsy",
    context: "Verified Etsy buyer · Illuminated table lamp",
    text: "I was pleasantly surprised by the lamp's exceptional quality; it's a true work of art. Plus, the fast delivery and top-notch service made the entire experience seamless and delightful.",
    source: "https://www.etsy.com/shop/CustomBuildStudio#reviews",
  },
  {
    id: "google-ziyi-liu",
    name: "ziyi liu",
    platform: "Google",
    context: "Google Review · Edmonton studio",
    text: "Amazing shop! The owner is super friendly, and the quality of the model is excellent. I’ll definitely come back if I need anything else! Highly recommended!",
    source: "https://share.google/r0qV4iw8FxD8SLkLL",
  },
  {
    id: "etsy-veronica-lamp",
    name: "Veronica",
    platform: "Etsy",
    context: "Verified Etsy buyer · Custom gift lamp",
    text: "Absolutely love this, and beautifully made! :)))",
    source: "https://www.etsy.com/shop/CustomBuildStudio#reviews",
  },
  {
    id: "google-bill-beck",
    name: "Bill Beck",
    platform: "Google",
    context: "Google Review · Custom order",
    text: "Gary at CBS was very accommodating had my work order done promptly. Great customer support and finished product. If you can’t find it; build it at Custom build Studios…",
    source: "https://share.google/r0qV4iw8FxD8SLkLL",
  },
  {
    id: "etsy-simone-lamp",
    name: "Simone",
    platform: "Etsy",
    context: "Verified Etsy buyer · Decorative table lamp",
    text: "Peaceful and beautiful. A lovely home addition.",
    source: "https://www.etsy.com/shop/CustomBuildStudio#reviews",
  },
  {
    id: "google-yin",
    name: "Yin",
    platform: "Google",
    context: "Google Review · Edmonton studio",
    text: "Amazing quality and service, smooth transaction as well.",
    source: "https://share.google/r0qV4iw8FxD8SLkLL",
  },
  {
    id: "google-sean-throne",
    name: "sean throne",
    platform: "Google",
    context: "Google Review · Custom 3D-printed part",
    text: "The finished parts fit exactly the way they were supposed to, and I couldn’t be happier with the result. What impressed me most was his patience, attention to detail, and willingness to make sure I was happy with the finished product.",
    source: "https://share.google/r0qV4iw8FxD8SLkLL",
  },
  {
    id: "google-des-schwindt",
    name: "Des Schwindt",
    platform: "Google",
    context: "Google Review · 3D printing & finish",
    text: "3D printed parts were to exact spec finish and good pricing. Customer service was top notch and great to deal with , was kept in the loop on project build and completion.",
    source: "https://share.google/r0qV4iw8FxD8SLkLL",
  },
];
