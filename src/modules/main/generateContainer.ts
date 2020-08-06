function generateContainer(parent: Element): HTMLElement {
  const tooltipWidth = parent.getBoundingClientRect().width;
  const minContainerWidth = 256;

  const container = document.createElement('div');
  container.className = 'auctionoton-container';
  container.style.position = 'relative';
  container.style.width = 'auto';
  container.style.minWidth = tooltipWidth > minContainerWidth
    ? `${tooltipWidth}px`
    : `${minContainerWidth}px`;

  parent.appendChild(container);

  return container;
}

export default generateContainer;
