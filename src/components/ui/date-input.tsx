import type { CSSProperties } from "react";
import { colors, fonts, radius } from "@/lib/theme";

// Native browser date picker styled like Input. Value is "YYYY-MM-DD".
export function DateInput({
  value,
  onChange,
  label,
  min,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  min?: string;
}) {
  return (
    <input
      type="date"
      aria-label={label}
      value={value}
      min={min}
      onChange={(event) => onChange(event.target.value)}
      style={style}
    />
  );
}

const style: CSSProperties = {
  boxSizing: "border-box",
  width: "100%",
  height: 36,
  padding: "0 12px",
  border: `1px solid ${colors.input}`,
  borderRadius: radius.md,
  background: "transparent",
  color: colors.foreground,
  fontFamily: fonts.sans,
  fontSize: 16,
  colorScheme: "dark",
  outlineColor: colors.ring,
};
