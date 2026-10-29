import { cloneElement, type ReactElement } from "react";
import type { AccessibilityRole, GestureResponderEvent } from "react-native";
import { useHref, useNavigate } from "react-router";

type LinkChildProps = {
  href?: string;
  accessibilityRole?: AccessibilityRole;
  onPress?: (event: GestureResponderEvent) => void;
};

// Turns its child (a Button or Text) into a real <a href> with client-side navigation.
export function Link({ href, children }: { href: string; children: ReactElement<LinkChildProps> }) {
  const navigate = useNavigate();
  // Includes the base path, so "open in new tab" works on GitHub Pages too.
  const fullHref = useHref(href);

  return cloneElement(children, {
    href: fullHref,
    // Without the link role, react-native-web renders a Button as <button> and drops href.
    accessibilityRole: "link",
    onPress: (event: GestureResponderEvent) => {
      event.preventDefault();
      navigate(href);
    },
  });
}
