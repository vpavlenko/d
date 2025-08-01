/// <reference types="vite/client" />

// Declare MP3 files as importable modules that return URLs
declare module "*.mp3" {
  const src: string;
  export default src;
}

// Declare MP3 files with ?arraybuffer suffix as ArrayBuffer imports
declare module "*.mp3?arraybuffer" {
  const buffer: ArrayBuffer;
  export default buffer;
}
