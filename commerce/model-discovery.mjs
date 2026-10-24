import defaults from './model-discovery.json' with { type: 'json' };

const text = (value, label, max, optional = false) => {
  if (typeof value !== 'string' || value.length > max || (!optional && !value.trim())) throw new Error(`Enter a valid ${label}.`);
  return value.trim();
};
export function validateModelDiscovery(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid model discovery settings.');
  if (typeof input.enabled !== 'boolean') throw new Error('Choose whether model discovery is enabled.');
  const clean = { enabled: input.enabled };
  for (const [key, max] of Object.entries({ headline: 100, introduction: 400, buttonLabel: 60, quoteButtonLabel: 60, helperText: 400, permissionText: 400, responseTime: 160 })) {
    clean[key] = text(input[key], key, max, key === 'responseTime');
  }
  clean.placements = {};
  for (const key of Object.keys(defaults.placements)) {
    if (typeof input.placements?.[key] !== 'boolean') throw new Error('Choose valid model discovery placements.');
    clean.placements[key] = input.placements[key];
  }
  if (!Array.isArray(input.libraries) || input.libraries.length > 12 || !input.libraries.length) throw new Error('Add between 1 and 12 model libraries.');
  const ids = new Set();
  clean.libraries = input.libraries.map(library => {
    const id = text(library.id, 'library ID', 40);
    if (!/^[a-z0-9-]+$/.test(id) || ids.has(id)) throw new Error('Library IDs must be unique lowercase words or numbers.');
    ids.add(id);
    const url = new URL(text(library.url, 'library URL', 500));
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Library links must use HTTPS without sign-in details.');
    if (typeof library.enabled !== 'boolean') throw new Error('Choose whether each library is visible.');
    return { id, name: text(library.name, 'library name', 60), url: url.href, description: text(library.description, 'library description', 200), enabled: library.enabled };
  });
  if (clean.enabled && !clean.libraries.some(library => library.enabled)) throw new Error('Keep at least one library visible, or turn off model discovery.');
  return clean;
}

export function modelDiscoveryFor(content) {
  const input = content?.modelDiscovery;
  if (!input) return structuredClone(defaults);
  try { return validateModelDiscovery({ ...defaults, ...input, placements: { ...defaults.placements, ...input.placements } }); }
  catch { return structuredClone(defaults); }
}
