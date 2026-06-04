export const homeKeys = {
  all: ['home'] as const,
  exhibition: () => [...homeKeys.all, 'exhibition'] as const,
};
