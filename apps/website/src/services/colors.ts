const getQualityColor = (quality?: number | null) => {
  switch (quality) {
    case 0:
      return 'var(--c-poor)';
    case 1:
      return 'var(--c-common)';
    case 2:
      return 'var(--c-uncommon)';
    case 3:
      return 'var(--c-rare)';
    case 4:
      return 'var(--c-epic)';
    case 5:
      return 'var(--c-legendary)';
    default:
      return 'var(--c-common)';
  }
};

export const getRingQualityColor = (quality: number | undefined | null) => {
  return {
    '--tw-ring-color': `rgb(${getQualityColor(quality)})`,
  };
};

export const getTextQualityColor = (quality: number | undefined | null) => {
  return {
    color: `rgb(${getQualityColor(quality)})`,
  };
};
