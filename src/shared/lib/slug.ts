export const generateSlug = (name: string, suffix: string = '') => {
  let baseSlug = name.toLowerCase()
    .replace(/[^a-z0-9-]/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/-+/g, '-')         // Replace multiple hyphens with a single one
    .replace(/^-|-$/g, '');      // Trim hyphens from start/end

  if (suffix) {
    baseSlug = `${baseSlug}-${suffix}`;
  }
  return baseSlug;
};