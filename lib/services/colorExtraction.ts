import sharp from 'sharp';
import path from 'path';

const DATA_PATH = process.env.DATA_PATH || './data';

interface ColorInfo {
  hex: string;
  count: number;
}

/**
 * Extract dominant colors from an image
 * Returns 2-3 most prominent colors as hex values
 */
export async function extractDominantColors(iconPath: string): Promise<string[]> {
  try {
    // Resolve full path
    const fullPath = path.join(DATA_PATH, iconPath);

    console.log(`🎨 Extracting colors from: ${fullPath}`);

    // Resize image to small size for faster processing
    const image = sharp(fullPath).resize(100, 100, { fit: 'inside' });

    // Get raw pixel data
    const { data, info } = await image
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Quantize colors (group similar colors together)
    const colorMap = new Map<string, number>();

    for (let i = 0; i < data.length; i += info.channels) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const alpha = info.channels === 4 ? data[i + 3] : 255;

      // Skip transparent pixels
      if (alpha < 128) continue;

      // Quantize to reduce similar colors (group by 32-value buckets)
      const qr = Math.floor(r / 32) * 32;
      const qg = Math.floor(g / 32) * 32;
      const qb = Math.floor(b / 32) * 32;

      const hex = rgbToHex(qr, qg, qb);
      colorMap.set(hex, (colorMap.get(hex) || 0) + 1);
    }

    // Sort by frequency
    const colors: ColorInfo[] = Array.from(colorMap.entries())
      .map(([hex, count]) => ({ hex, count }))
      .sort((a, b) => b.count - a.count);

    // Filter out very dark (near black) and very light (near white) colors
    const filteredColors = colors.filter((color) => {
      const { r, g, b } = hexToRgb(color.hex);
      const brightness = (r + g + b) / 3;
      return brightness > 30 && brightness < 240; // Avoid extremes
    });

    // Get top 2-3 colors
    const dominantColors = filteredColors.slice(0, 3).map((c) => c.hex);

    // If we got less than 2 colors, add fallback colors
    while (dominantColors.length < 2) {
      dominantColors.push('#3B82F6'); // Default blue
    }

    console.log(`✅ Extracted colors: ${dominantColors.join(', ')}`);

    return dominantColors;
  } catch (error) {
    console.error('Color extraction error:', error);
    // Return default colors on error
    return ['#3B82F6', '#A855F7'];
  }
}

/**
 * Convert RGB to hex
 */
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
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
    : { r: 0, g: 0, b: 0 };
}
