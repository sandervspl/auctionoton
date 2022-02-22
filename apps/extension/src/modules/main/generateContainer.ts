import { ELEMENT_ID } from 'src/constants';


function generateContainer(parent: Element, uniqueKey: string): HTMLElement | void {
  if (!parent) {
    return;
  }

  const id = ELEMENT_ID.CONTAINER + `-${uniqueKey}`;
  const curContainer = document.getElementById(id);

  if (curContainer) {
    return curContainer;
  }

  const tooltipWidth = parent.getBoundingClientRect().width;
  const minContainerWidth = 350;

  const container = document.createElement('div');
  container.id = id;
  container.className = 'relative w-auto';
  container.style.minWidth = tooltipWidth > minContainerWidth
    ? `${tooltipWidth}px`
    : `${minContainerWidth}px`;

  parent.appendChild(container);

  return container;
}

export default generateContainer;
