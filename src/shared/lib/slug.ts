export const generateSlug = (name: string, suffix: string = '') => {
  let baseSlug = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  if (!baseSlug) {
    baseSlug = 'video';
  }

  if (suffix) {
    const normalizedSuffix = suffix
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    if (normalizedSuffix) {
      baseSlug = `${baseSlug}-${normalizedSuffix}`;
    }
  }

  return baseSlug;
};
