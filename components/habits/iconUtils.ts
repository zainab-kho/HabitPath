// @/components/habits/iconUtils.ts
import { ICON_CATEGORIES } from '@/constants/icons';

/**
 * Icon Storage Utilities
 * 
 * These utilities help you work with icons in your habit system:
 * - Store icon names in Supabase (strings)
 * - Retrieve the actual icon files for display
 * - Handle missing/default icons
 */

/**
 * Get the icon file from an icon name
 * This is used to display the icon after loading from Supabase
 * 
 * @param iconName - The icon name stored in Supabase (e.g., "running", "books")
 * @returns The icon file that can be used in <Image source={...} />
 */
export function getIconFile(iconName: string): any | null {
  if (!iconName) return null;

  // Search through all categories to find the icon
  for (const category in ICON_CATEGORIES) {
    const icon = ICON_CATEGORIES[category].find(i => i.name === iconName);
    if (icon) {
      return icon.file;
    }
  }

  return null; // Icon not found
}

/**
 * Get icon file with fallback to default
 * 
 * @param iconName - The icon name from Supabase
 * @param defaultIcon - The default icon to use if icon not found
 * @returns The icon file or default
 */
export function getIconFileWithDefault(iconName: string | undefined, defaultIcon: any): any {
  if (!iconName) return defaultIcon;
  
  const iconFile = getIconFile(iconName);
  return iconFile || defaultIcon;
}

/**
 * Get all icon names (useful for validation)
 * 
 * @returns Array of all available icon names
 */
export function getAllIconNames(): string[] {
  const names: string[] = [];
  
  for (const category in ICON_CATEGORIES) {
    ICON_CATEGORIES[category].forEach(icon => {
      names.push(icon.name);
    });
  }
  
  return names;
}

/**
 * Validate if an icon name exists
 * 
 * @param iconName - The icon name to validate
 * @returns true if icon exists, false otherwise
 */
export function isValidIconName(iconName: string): boolean {
  return getIconFile(iconName) !== null;
}