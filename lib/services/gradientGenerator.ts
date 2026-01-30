/**
 * Generate a 4-color gradient from extracted colors
 * Blends with Void theme colors for consistency
 */
export function generateGradient(dominantColors: string[]): string[] {
  // Void theme colors
  const voidColors = {
    voidBlack: '#050608',
    deepNavy: '#0a192f',
    cyan: '#3B82F6',
    purple: '#A855F7',
  };

  // Start with the dominant colors
  const gradient: string[] = [];

  // Add first dominant color
  if (dominantColors[0]) {
    gradient.push(dominantColors[0]);
  } else {
    gradient.push(voidColors.cyan);
  }

  // Add second dominant color
  if (dominantColors[1]) {
    gradient.push(dominantColors[1]);
  } else {
    gradient.push(voidColors.purple);
  }

  // Add a blend of the first color with deep navy for depth
  const blended1 = blendColors(dominantColors[0] || voidColors.cyan, voidColors.deepNavy, 0.3);
  gradient.push(blended1);

  // Add a fourth color - either third dominant or a blend
  if (dominantColors[2]) {
    gradient.push(dominantColors[2]);
  } else {
    // Create a darker variant of the first color
    const blended2 = blendColors(
      dominantColors[0] || voidColors.cyan,
      voidColors.voidBlack,
      0.4
    );
    gradient.push(blended2);
  }

  console.log(`🌈 Generated gradient: ${gradient.join(', ')}`);

  return gradient;
}

/**
 * Blend two hex colors together
 * @param color1 First hex color
 * @param color2 Second hex color
 * @param ratio Blend ratio (0 = all color1, 1 = all color2)
 */
function blendColors(color1: string, color2: string, ratio: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);

  const r = Math.round(c1.r * (1 - ratio) + c2.r * ratio);
  const g = Math.round(c1.g * (1 - ratio) + c2.g * ratio);
  const b = Math.round(c1.b * (1 - ratio) + c2.b * ratio);

  return rgbToHex(r, g, b);
}

/**
 * Convert hex to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 59, g: 130, b: 246 }; // Default to cyan
}

/**
 * Convert RGB to hex
 */
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
}
