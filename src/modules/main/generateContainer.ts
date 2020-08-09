import { ELEMENT_ID } from 'src/constants';

function generateContainer(parent: Element, uniqueKey: string): HTMLElement {
  const id = ELEMENT_ID.CONTAINER + `-${uniqueKey}`;
  const curContainer = document.getElementById(id);

  if (curContainer) {
    return curContainer;
  }

  const tooltipWidth = parent.getBoundingClientRect().width;
  const minContainerWidth = 256;

  const container = document.createElement('div');
  container.id = id;
  container.style.position = 'relative';
  container.style.width = 'auto';
  container.style.minWidth = tooltipWidth > minContainerWidth
    ? `${tooltipWidth}px`
    : `${minContainerWidth}px`;

  parent.appendChild(container);

  return container;
}

export default generateContainer;
