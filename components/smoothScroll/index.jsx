/**
 * Page wrapper kept for the pages that use it. Scrolling is the browser's own:
 * no scroll-jacking library, so scrolling stays fast and accessible, the
 * keyboard and screen readers behave as expected, and deep links (#section)
 * land where they point.
 */
export default function SmoothScroll({ children }) {
  return children;
}
