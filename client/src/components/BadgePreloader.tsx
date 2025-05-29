import { useEffect } from 'react';
import { BadgeType, BADGE_INFO } from '@/lib/badge-service';

/**
 * This component preloads badge images in the background 
 * to ensure faster display when badges are earned.
 * It's invisible and should be mounted once at app initialization.
 */
export default function BadgePreloader() {
  useEffect(() => {
    // Preload all thumbnail WebP images
    const preloadImages = () => {
      const badgeTypes = Object.keys(BADGE_INFO) as BadgeType[];
      
      badgeTypes.forEach(badgeType => {
        const badgeName = BADGE_INFO[badgeType].imageUrl.split('/').pop()?.replace('.png', '');
        
        // Preload the thumbnail WebP version
        const thumbnailUrl = `/badges/thumbnails/${badgeName}.webp`;
        const thumbnailImg = new Image();
        thumbnailImg.src = thumbnailUrl;
        
        // Also preload the optimized full-size WebP version
        // We'll load this with lower priority to not block other resources
        setTimeout(() => {
          const optimizedUrl = `/badges/optimized-${badgeName}.webp`;
          const optimizedImg = new Image();
          optimizedImg.src = optimizedUrl;
        }, 3000); // Delay by 3 seconds to prioritize initial page load
      });
    };
    
    // Run preloading either immediately or after initial page load
    if (document.readyState === 'complete') {
      preloadImages();
    } else {
      window.addEventListener('load', preloadImages);
      return () => window.removeEventListener('load', preloadImages);
    }
  }, []);
  
  // This component doesn't render anything visible
  return null;
}