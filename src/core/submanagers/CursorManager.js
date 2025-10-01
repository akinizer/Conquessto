 export const CursorManager = (() => {
    // This map associates the standard cursor names with our custom SVG data URIs.
    const cursorSVGs = {
        // N: North (up)
        'n-resize': `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32'%3E%3Cpath d='M10 22 L16 10 L22 22 M16 10 V22 M10 22 L10 16 M22 22 L22 16' stroke='%2350fa7b' stroke-width='2' fill='none' style='filter: drop-shadow(0 0 1.5px %2350fa7b);'/%3E%3C/svg%3E") 16 16, n-resize`,
        // W: West (left)
        'w-resize': `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32'%3E%3Cpath d='M22 10 L10 16 L22 22 M10 16 H22 M22 10 L16 10 M22 22 L16 22' stroke='%2350fa7b' stroke-width='2' fill='none' style='filter: drop-shadow(0 0 1.5px %2350fa7b);'/%3E%3C/svg%3E") 16 16, w-resize`,
        // E: East (right)
        'e-resize': `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32'%3E%3Cpath d='M10 10 L22 16 L10 22 M10 16 H22 M10 10 L16 10 M10 22 L16 22' stroke='%2350fa7b' stroke-width='2' fill='none' style='filter: drop-shadow(0 0 1.5px %2350fa7b);'/%3E%3C/svg%3E") 16 16, e-resize`,
        // S: South (down)
        's-resize': `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32'%3E%3Cpath d='M10 10 L16 22 L22 10 M16 22 V10 M10 10 L10 16 M22 10 L22 16' stroke='%2350fa7b' stroke-width='2' fill='none' style='filter: drop-shadow(0 0 1.5px %2350fa7b);'/%3E%3C/svg%3E") 16 16, s-resize`,
        // NW: North-West
        'nw-resize': `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32'%3E%3Cpath d='M10 20 L20 10 M10 20 L10 16 M10 16 L14 16 M10 16 L10 12 M20 10 L20 14 M20 14 L16 14' stroke='%2350fa7b' stroke-width='2' fill='none' style='filter: drop-shadow(0 0 1.5px %2350fa7b);'/%3E%3C/svg%3E") 16 16, nw-resize`,
        // NE: North-East
        'ne-resize': `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32'%3E%3Cpath d='M12 12 L22 22 M12 12 L12 16 M12 16 L16 16 M22 22 L22 18 M22 18 L18 18 M22 22 L18 22' stroke='%2350fa7b' stroke-width='2' fill='none' style='filter: drop-shadow(0 0 1.5px %2350fa7b);'/%3E%3C/svg%3E") 16 16, ne-resize`,
        // SW: South-West
        'sw-resize': `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32'%3E%3Cpath d='M10 10 L20 20 M10 10 L10 14 M10 14 L14 14 M10 10 L14 10 M20 20 L20 16 M20 16 L16 16' stroke='%2350fa7b' stroke-width='2' fill='none' style='filter: drop-shadow(0 0 1.5px %2350fa7b);'/%3E%3C/svg%3E") 16 16, sw-resize`,
        // SE: South-East
        'se-resize': `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32'%3E%3Cpath d='M12 20 L22 10 M12 20 L12 16 M12 16 L16 16 M22 10 L22 14 M22 14 L18 14 M22 10 L18 10' stroke='%2350fa7b' stroke-width='2' fill='none' style='filter: drop-shadow(0 0 1.5px %2350fa7b);'/%3E%3C/svg%3E") 16 16, se-resize`,
    };

    // This is the public function that applies the correct cursor
    const loadCursors = (element, cursorType) => {
        const cursor = cursorSVGs[cursorType] || 'default';
        element.style.cursor = cursor;
    };

    return { loadCursors };
})();