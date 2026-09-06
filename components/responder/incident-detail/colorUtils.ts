// components/responder/incident-detail/colorUtils.ts
// Hand-picked darker shade of an arbitrary incident color, used as the
// second gradient stop on gradient-fill badges and buttons -- incident
// colors are dynamic (per report category), not theme tokens, so there's
// no "Dark" variant to reference the way COLORS.primaryDark works.
export function darken(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, (num >> 16) - amount);
  const g = Math.max(0, ((num >> 8) & 0x00ff) - amount);
  const b = Math.max(0, (num & 0x0000ff) - amount);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}
