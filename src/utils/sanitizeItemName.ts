function sanitizeItemName(name: string): string {
  return decodeURI(name)
    .toLowerCase()
    .replace(/\s/g, '-')
    .replace(/[^-a-zA-Z0-6]/g, '')
    .trim();
}

export default sanitizeItemName;
