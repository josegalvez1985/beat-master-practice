/// <reference types="expo/types" />

// Expo SDK 57 no longer ships declarations for static image imports.
declare module "*.jpg" {
  const source: import("react-native").ImageSourcePropType;
  export default source;
}

declare module "*.png" {
  const source: import("react-native").ImageSourcePropType;
  export default source;
}
