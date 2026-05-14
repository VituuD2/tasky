function normalizeHex(hex: string) {
  const value = hex.replace("#", "").trim();

  if (value.length === 3) {
    return value
      .split("")
      .map((char) => `${char}${char}`)
      .join("");
  }

  return value.padEnd(6, "0").slice(0, 6);
}

function hexToRgb(hex: string) {
  const normalized = normalizeHex(hex);
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function clamp(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((channel) => clamp(channel).toString(16).padStart(2, "0")).join("")}`;
}

export function getReadableOptionTone(color: string) {
  const { r, g, b } = hexToRgb(color);
  const text = rgbToHex(r * 1.36 + 38, g * 1.36 + 38, b * 1.36 + 38);
  const background = `rgba(${r}, ${g}, ${b}, 0.22)`;
  const border = `rgba(${clamp(r * 1.2)}, ${clamp(g * 1.2)}, ${clamp(b * 1.2)}, 0.72)`;

  return {
    color: text,
    backgroundColor: background,
    borderColor: border,
  };
}
