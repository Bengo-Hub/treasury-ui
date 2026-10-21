'use client';

// shared-ui-lib's dist drops 'use client', so server components (the public document pages)
// import MediaImage through this client boundary.
export { MediaImage } from '@bengo-hub/shared-ui-lib/media';
