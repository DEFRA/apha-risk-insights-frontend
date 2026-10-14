const COMBINING_MARKS = /[\u0300-\u036f]/g

/**
 * Turns text into a lowercase, hyphenated, URL-safe slug. Accents are
 * removed (Café becomes cafe). Returns an empty string if nothing is usable.
 * @param {string} text
 * @returns {string}
 */
export const slugify = (text) =>
  text
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
