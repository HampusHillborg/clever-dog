/// <reference types="vite/client" />

// This file contains TypeScript declarations for modules without built-in types
// Add any additional types needed for the application here

// Declaration for image files with vite-imagetools query parameters
declare module '*.jpg?*' {
  const src: string;
  export default src;
}

declare module '*.jpeg?*' {
  const src: string;
  export default src;
}

declare module '*.png?*' {
  const src: string;
  export default src;
}

declare module '*.webp?*' {
  const src: string;
  export default src;
}
