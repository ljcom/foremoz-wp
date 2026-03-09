export function sortObjectKeysDeep(value) {
  if (Array.isArray(value)) {
    return value.map(sortObjectKeysDeep);
  }

  if (value && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value).sort()) {
      out[key] = sortObjectKeysDeep(value[key]);
    }
    return out;
  }

  return value;
}

export function canonicalStringify(value) {
  return JSON.stringify(sortObjectKeysDeep(value));
}
