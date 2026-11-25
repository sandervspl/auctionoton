import { RefObject, useEffect, useState } from 'react';

interface Args extends IntersectionObserverInit {
  freezeOnceVisible?: boolean;
  disconnectOnceVisible?: boolean;
}

function useIntersectionObserver(
  elementRef: RefObject<Element>,
  {
    threshold = 0,
    root = null,
    rootMargin = '0%',
    freezeOnceVisible = false,
    disconnectOnceVisible = false,
  }: Args,
): IntersectionObserverEntry | undefined {
  const [entry, setEntry] = useState<IntersectionObserverEntry>();

  const frozen = entry?.isIntersecting && freezeOnceVisible;

  // Compare array thresholds by value so inline arrays do not recreate the observer.
  const thresholdKey = JSON.stringify(threshold);

  useEffect(() => {
    const node = elementRef?.current; // DOM Ref
    const hasIOSupport = !!window.IntersectionObserver;

    if (!hasIOSupport || frozen || !node) return;

    const updateEntry = (
      [entry]: IntersectionObserverEntry[],
      observer: IntersectionObserver,
    ): void => {
      if (disconnectOnceVisible && entry.isIntersecting) {
        observer.disconnect();
      }
      setEntry(entry);
    };

    const observerParams = { threshold: JSON.parse(thresholdKey), root, rootMargin };
    const observer = new IntersectionObserver(updateEntry, observerParams);

    observer.observe(node);

    return () => observer.disconnect();
  }, [elementRef, thresholdKey, root, rootMargin, frozen, disconnectOnceVisible]);

  return entry;
}

export default useIntersectionObserver;
