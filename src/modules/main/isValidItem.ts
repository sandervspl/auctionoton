function isValidItem(str: string | undefined): boolean {
  if (!str) {
    return false;
  }

  str = str.toLowerCase();

  return !str.includes('picked up') && !str.includes('quest');
}

export default isValidItem;
