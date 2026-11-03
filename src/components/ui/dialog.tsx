import type { ReactNode } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { X } from "lucide-react";
import { colors, fonts, radius, shared } from "@/lib/theme";

// Below this width (a phone) the panel takes almost the whole screen, with less padding.
const ANGOSTO = 520;

// Centered modal panel. Closes with the X button, a click on the backdrop or Escape.
export function Dialog({
  visible,
  onClose,
  title,
  description,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const angosto = useWindowDimensions().width < ANGOSTO;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.overlay, angosto && styles.overlayAngosto]}>
        <Pressable
          accessibilityLabel="Cerrar"
          focusable={false}
          onPress={onClose}
          style={[StyleSheet.absoluteFill, styles.backdrop]}
        />
        <View style={[shared.panel, styles.panel]}>
          <ScrollView
            style={styles.scroll}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[styles.content, angosto && styles.contentAngosto]}
          >
            <View style={styles.header}>
              <Text style={[styles.title, angosto && styles.titleAngosto]}>{title}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cerrar"
                onPress={onClose}
                style={styles.close}
              >
                <X size={18} color={colors.mutedForeground} />
              </Pressable>
            </View>
            {description ? <Text style={styles.description}>{description}</Text> : null}
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  overlayAngosto: {
    padding: 8,
  },
  backdrop: {
    backgroundColor: colors.backdrop,
  },
  panel: {
    width: "100%",
    maxWidth: 448,
    maxHeight: "100%",
    overflow: "hidden",
    borderRadius: radius["2xl"],
    backgroundColor: colors.card,
  },
  // Lets a long form scroll inside the panel instead of growing past the screen.
  scroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  content: {
    padding: 24,
  },
  contentAngosto: {
    padding: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  title: {
    flexShrink: 1,
    fontFamily: fonts.headingBold,
    fontSize: 26,
    lineHeight: 32,
    color: colors.foreground,
  },
  titleAngosto: {
    fontSize: 22,
    lineHeight: 28,
  },
  close: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
  },
  description: {
    marginTop: 4,
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.mutedForeground,
  },
});
