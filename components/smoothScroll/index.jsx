'use client';
import { useEffect } from 'react'
import Lenis from '@studio-freight/lenis'

/** The element a deep link (#section) points at, if any. */
function hashTarget() {
    const id = decodeURIComponent(window.location.hash.slice(1));
    return id ? document.getElementById(id) : null;
}

/** Page position of an element from layout alone — fade-in transforms must not move the landing spot. */
function layoutTop(el) {
    let top = 0;
    for (let node = el; node; node = node.offsetParent) top += node.offsetTop;
    return top;
}

export default function SmoothScroll({children}) {

    useEffect( () => {
        const lenis = new Lenis({
            lerp: 0.1,
            smoothWheel: true,
        })

        // Start at the top, unless the URL points at a section (deep links, redirects to #anchors).
        const target = hashTarget();
        if (target) {
            const margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
            lenis.scrollTo(Math.max(0, layoutTop(target) - margin), { immediate: true });
        } else {
            window.scrollTo(0,0);
        }

        let rafId;

        function raf(time) {
          lenis.raf(time)
          rafId = requestAnimationFrame(raf)
        }

        rafId = requestAnimationFrame(raf)

        // Cleanup on unmount
        return () => {
            cancelAnimationFrame(rafId)
            lenis.destroy()
        }
    }, [])

    return children
}
