// Web-only props supported by react-native-web but missing from the react-native types.
import "react-native";

declare module "react-native" {
  interface PressableProps {
    href?: string;
    hrefAttrs?: { target?: string; rel?: string; download?: boolean | string };
  }

  interface TextProps {
    href?: string;
  }

  interface ViewStyle {
    backgroundImage?: string;
  }
}
