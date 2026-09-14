import { services, type Service } from "./services";

export const printingPages: Service[] = [
  {
    ...services[0],
    id: "fdm-3d-printing",
    name: "FDM 3D Printing",
    intro:
      "Custom FDM 3D printing in Edmonton with engineering filaments and a maximum 305 × 305 × 400 mm build envelope. Replacement parts, fixtures, enclosures and functional prototypes—from one part to a small run.",
    description:
      "FDM 3D printing in Edmonton up to 305 × 305 × 400 mm. Engineering filaments, functional parts and prototypes. Jobs from $20 CAD.",
    applications: [
      "Replacement parts and custom brackets",
      "Functional prototypes and fit-check models",
      "Enclosures, fixtures and workshop accessories",
      "One-off parts and small production runs",
    ],
    materials:
      "PLA, PETG, ABS, ASA, TPU and engineering polymers. We review load, heat, outdoor exposure, flexibility and print orientation before recommending a material. Layer lines and support marks are part of the process; discuss visible surfaces and fit requirements with us.",
  },
  {
    ...services[0],
    id: "resin-3d-printing",
    name: "Resin 3D Printing",
    image: null,
    alt: "",
    short: "Fine detail, from model to finished print.",
    intro:
      "Resin 3D printing in Edmonton for miniatures, figurines, scale models and detailed prototypes. Our Anycubic Photon P1 brings fine textures and small features into focus. One-off projects welcome.",
    description:
      "Detailed miniatures, figurines and prototypes with Photon P1 resin 3D printing in Edmonton. From $30 CAD per job. Request a project quote.",
    applications: [
      "Miniatures, figurines and scale models",
      "Detailed product prototypes and display models",
      "Fine lettering and decorative textures",
      "Jewelry appearance models and master patterns",
    ],
    materials:
      "Resin type and colour are confirmed per project. Standard resin is best approached as a detail and appearance material; loads, heat, flexibility and casting patterns require a suitability review. Washing, curing and support cleanup are considered in the quote.",
    bring:
      "Send your STL or OBJ model, dimensions, quantity and intended use. STEP files, sketches and ideas are welcome too; any design or file preparation is quoted before work begins.",
    outcome:
      "We review scale, orientation, supports and material, confirm your quote, then print, wash, cure and clean up the agreed model.",
  },
];
export const allServices = [...services, ...printingPages];
export const quoteServiceId = (id: string) =>
  id === "fdm-3d-printing"
    ? "3d-printing"
    : id === "resin-3d-printing"
      ? "resin-printing"
      : id;
export const serviceDetails: Record<
  string,
  { heading: string; price: string; pricing: string; faqs: [string, string][] }
> = {
  "3d-printing": {
    heading: "Custom 3D Printing in Edmonton",
    price: "FDM from $20 · Resin from $30 CAD",
    pricing:
      "Choose a process around how your part will be used. Final pricing depends on material, size, quantity and preparation.",
    faqs: [
      [
        "Should I choose FDM or resin?",
        "FDM is often a practical starting point for functional parts and material-specific needs. Resin suits small features, smooth surfaces and detailed models. Send your intended use if you are unsure.",
      ],
    ],
  },
  "fdm-3d-printing": {
    heading: "FDM 3D Printing in Edmonton",
    price: "From $20 CAD per job",
    pricing:
      "Material, print time, supports and quantity determine the final price. Design changes and additional finishing are quoted separately.",
    faqs: [
      [
        "Can you print a replacement for a broken part?",
        "Often, yes. Send photos, dimensions and what the part does. A missing model may need CAD design or reverse engineering first. Suitability depends on the loads, fit and environment.",
      ],
      [
        "Can I order just one print?",
        "Yes. One-off projects and small runs are welcome. Share your file and quantity; we confirm feasibility and pricing before production.",
      ],
    ],
  },
  "resin-3d-printing": {
    heading: "Resin 3D Printing in Edmonton",
    price: "From $30 CAD per job",
    pricing:
      "Resin volume, supports, print height and time, washing, curing and cleanup shape the quote. CAD design, specialty resin and additional finishing are quoted separately.",
    faqs: [
      [
        "How large can a resin part be?",
        "The Photon P1 has a nominal 223 × 126 × 230 mm build volume. Orientation, supports and clearance reduce the space available for a part. Send the model for review.",
      ],
      [
        "Is resin suitable for a functional part?",
        "It depends on the resin and use. Tell us about load, heat and fit requirements. We may recommend FDM or a different material after reviewing the design.",
      ],
      [
        "Will the model be ready to paint?",
        "Washing, curing and support cleanup are considered in the quote. Support marks may need sanding, and painting or additional finishing must be agreed separately.",
      ],
    ],
  },
  "cad-design": {
    heading: "3D Modeling & CAD Design in Edmonton",
    price: "$75 CAD / hour",
    pricing:
      "Design scope, revisions and deliverable formats are agreed before work begins. Manufacturing is quoted separately.",
    faqs: [
      [
        "Can you work from a sketch or an idea?",
        "Yes. Send reference photos, a sketch and key dimensions. We clarify fit and function, then develop a model for your review.",
      ],
      [
        "What files will I receive?",
        "STEP, STL or IGES delivery can be agreed for your project. Tell us whether you need editable geometry, manufacturing files or a printed prototype.",
      ],
    ],
  },
  "3d-scanning": {
    heading: "3D Scanning & Reverse Engineering in Edmonton",
    price: "$75 CAD / hour",
    pricing:
      "Scanning and model reconstruction depend on geometry, surface and the required detail. We review the part and agree scope before starting.",
    faqs: [
      [
        "Is a 3D scan ready to manufacture?",
        "A scan captures surface geometry. It may need cleanup or CAD reconstruction before modification or manufacturing. We discuss that work in the quote.",
      ],
      [
        "Can you reproduce a discontinued part?",
        "Send photos, approximate dimensions and the intended use. Condition, surface, hidden geometry and critical dimensions determine whether scanning and reconstruction are suitable.",
      ],
    ],
  },
  "cnc-woodworking": {
    heading: "CNC Woodworking & Router Services in Edmonton",
    price: "From $100 CAD per project",
    pricing:
      "Size, material, toolpaths, cutting time and finishing determine the quote. One-off signs, panels and custom pieces are welcome.",
    faqs: [
      [
        "Do you accept small woodworking projects?",
        "Yes. Custom signs, engraving, carvings, panels, templates and individual components are welcome. Send a sketch or reference image with dimensions.",
      ],
      [
        "Which materials can I request?",
        "MDF, plywood and hardwood projects can be discussed. Material, thickness, tool access and any finishing are confirmed before work begins.",
      ],
    ],
  },
};
