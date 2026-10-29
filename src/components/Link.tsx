import { cloneElement, type ReactElement } from "react";
import type { AccessibilityRole, GestureResponderEvent } from "react-native";
import { useNavigate } from "react-router";

type LinkChildProps = {
  href?: string;
  accessibilityRole?: AccessibilityRole;
  onPress?: (event: GestureResponderEvent) => void;
};

// Turns its child (a Button or Text) into a real <a href> with client-side navigation.
export function Link({ href, children }: { href: string; children: ReactElement<LinkChildProps> }) {
  const navigate = useNavigate();

  return cloneElement(children, {
    href,
    // Without the link role, react-native-web renders a Button as <button> and drops href.
    accessibilityRole: "link",
    onPress: (event: GestureResponderEvent) => {
      event.preventDefault();
      navigate(href);
    },
  });
}
