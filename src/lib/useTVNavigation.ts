import { useEffect } from 'react';

export function useTVNavigation() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle arrow keys
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        
        // Find all focusable elements
        const focusableElements = Array.from(
          document.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
        ) as HTMLElement[];
        
        const currentFocus = document.activeElement as HTMLElement;
        
        if (!currentFocus || currentFocus === document.body) {
          // Focus first element if nothing is focused
          if (focusableElements.length > 0) {
            focusableElements[0].focus();
          }
          return;
        }

        const currentRect = currentFocus.getBoundingClientRect();
        let nextElement: HTMLElement | null = null;
        let minDistance = Infinity;

        focusableElements.forEach((el) => {
          if (el === currentFocus) return;
          
          const rect = el.getBoundingClientRect();
          
          // Skip hidden elements
          if (rect.width === 0 || rect.height === 0) return;

          let isMatch = false;
          let distance = 0;

          // Calculate center points
          const dx = (rect.left + rect.width / 2) - (currentRect.left + currentRect.width / 2);
          const dy = (rect.top + rect.height / 2) - (currentRect.top + currentRect.height / 2);

          // Determine direction and calculate a distance score
          // We prioritize elements that are directly in the path by weighing the cross-axis distance more
          switch (e.key) {
            case 'ArrowUp':
              if (dy < 0 && Math.abs(dy) > Math.abs(dx)) {
                isMatch = true;
                distance = Math.abs(dy) + Math.abs(dx) * 3;
              }
              break;
            case 'ArrowDown':
              if (dy > 0 && Math.abs(dy) > Math.abs(dx)) {
                isMatch = true;
                distance = Math.abs(dy) + Math.abs(dx) * 3;
              }
              break;
            case 'ArrowLeft':
              if (dx < 0 && Math.abs(dx) > Math.abs(dy)) {
                isMatch = true;
                distance = Math.abs(dx) + Math.abs(dy) * 3;
              }
              break;
            case 'ArrowRight':
              if (dx > 0 && Math.abs(dx) > Math.abs(dy)) {
                isMatch = true;
                distance = Math.abs(dx) + Math.abs(dy) * 3;
              }
              break;
          }

          if (isMatch && distance < minDistance) {
            minDistance = distance;
            nextElement = el;
          }
        });

        if (nextElement) {
          (nextElement as HTMLElement).focus();
        }
      } else if (e.key === 'Enter') {
        const currentFocus = document.activeElement as HTMLElement;
        if (currentFocus && currentFocus !== document.body && currentFocus.tagName !== 'INPUT') {
          // For inputs, enter might do something else, but for buttons it should click
          // Actually, browsers trigger click on Enter for buttons anyway, but this ensures it
          currentFocus.click();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
