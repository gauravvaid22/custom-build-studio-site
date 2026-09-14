export const services = [
  {
    id: "3d-printing",
    number: "01",
    name: "Custom 3D Printing",
    short: "Your design. A tangible part.",
    description:
      "FDM for functional parts. Resin for fine detail, miniatures and display models. One-off prints and small runs welcome.",
    intro:
      "Custom FDM and resin 3D printing in Edmonton. Bring a file or an idea: we help choose the process and material for functional parts, detailed models and prototypes.",
    applications: [
      "Functional prototypes & enclosures",
      "Replacement components & brackets",
      "Automotive fit-check parts",
      "Fixtures, accessories & small runs",
      "Resin miniatures, figurines & detailed display models",
    ],
    materials:
      "FDM options include PLA, PETG, ABS, ASA, TPU and engineering polymers. Resin type and colour are confirmed per project. Selection depends on detail, load, temperature and the environment your part will see.",
    bring:
      "STL, STEP or CAD files, a sketch, photos, measurements or the part itself. STEP and other design files may need preparation before printing.",
    image: "/images/work/pa6cf-gear-mount-1.jpg",
    alt: "3D printed gear and motor mount assembly in PA6-CF",
    outcome:
      "A physical part made to the agreed design, with material and manufacturing approach reviewed before production.",
  },
  {
    id: "cad-design",
    number: "02",
    name: "3D Modeling / CAD Design",
    short: "Make your idea manufacturable.",
    description:
      "Turn sketches, measurements and product ideas into digital models ready for the next step.",
    intro:
      "A good part starts with a considered design. We develop and modify 3D models around how your component needs to fit, function and be manufactured.",
    applications: [
      "Product concepts & custom designs",
      "Mechanical components & replacement parts",
      "Prototype development",
      "Design changes & manufacturing preparation",
    ],
    materials:
      "Models developed for the intended manufacturing process. STEP, STL or IGES delivery can be agreed as part of your project.",
    bring:
      "A sketch, reference photos, key dimensions or an existing CAD model. Explain what the part does and what it needs to connect to.",
    image: "/images/work/gauge-pod.jpg",
    alt: "Gauge pod CAD model above the finished printed dashboard part",
    outcome:
      "A reviewable digital design, followed by the agreed manufacturing files or a physical prototype.",
  },
  {
    id: "3d-scanning",
    number: "03",
    name: "3D Scanning / Reverse Engineering",
    short: "Start with the part you have.",
    description:
      "Capture an existing shape, rebuild the geometry and adapt it for repair, reproduction or a better fit.",
    intro:
      "When a drawing does not exist, the physical part can be the starting point. Scanning captures its shape; reverse engineering turns that information into a usable model.",
    applications: [
      "Discontinued & replacement components",
      "Custom-fit parts",
      "Automotive components",
      "Existing products that need modification",
    ],
    materials:
      "Suitability depends on the part’s size, surface, condition and required detail. Critical dimensions and fit requirements are reviewed separately.",
    bring:
      "Photos and approximate dimensions of the physical part, what needs to change, and how the finished piece will be used.",
    image: "/images/work/toy-car-collage.jpg",
    alt: "Original vintage toy car and digital scan used for a scaled reproduction",
    outcome:
      "Physical part → 3D scan → digital model → agreed modifications → reproduction or manufacturing.",
  },
  {
    id: "cnc-woodworking",
    number: "04",
    name: "CNC Woodworking",
    short: "Custom details, cut with purpose.",
    description:
      "CNC router services for signs, carving, engraving, panels and furniture components. One-off projects welcome.",
    intro:
      "Bring your woodworking idea to life with custom CNC routing in Edmonton. We work with homeowners, makers, designers and businesses on individual pieces and small batches.",
    applications: [
      "Custom signs, engraving & carving",
      "Decorative wall & door panels",
      "Cabinet & furniture components",
      "Patterns, templates & personalized pieces",
    ],
    materials:
      "MDF, plywood and hardwood projects. Material, thickness, dimensions, tool access and any finishing are confirmed when quoting.",
    bring:
      "A drawing, reference image, vector file, dimensions or a rough concept. Include the size, material preference and where the piece will be used.",
    image: null,
    alt: "",
    outcome:
      "An agreed design and routing plan for your sign, panel, component or custom wooden piece.",
  },
];
export type Service = (typeof services)[number];
export const quoteServices = services.flatMap((service) =>
  service.id === "3d-printing"
    ? [
        { id: service.id, name: "3D Printing — FDM / help me choose" },
        { id: "resin-printing", name: "3D Printing — High-detail resin" },
      ]
    : [{ id: service.id, name: service.name }],
);
