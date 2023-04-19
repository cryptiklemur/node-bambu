export function getContrastTextColor(hexColor: string): string {
  // Convert hex color to RGB values
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);

  // Calculate the relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Return white or black based on the relative luminance
  return luminance > 0.5 ? '000000' : 'FFFFFF';
}
