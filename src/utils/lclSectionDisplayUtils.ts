/**
 * Extract the custom section name from stored name format.
 * Stored format: "SECTION C: Custom Name" or "Section C: Custom Name"
 * Returns: "Custom Name"
 */
export function getDisplaySectionName(fullName: string): string {
  if (!fullName) return '';
  
  // Match pattern like "SECTION C: " or "Section C: " and extract everything after the colon
  const match = fullName.match(/^(?:SECTION|Section)\s+[A-Z]:\s*(.+)$/);
  if (match) {
    return match[1];
  }
  
  // If no match, check if it has a colon and return everything after
  const colonIndex = fullName.indexOf(':');
  if (colonIndex !== -1) {
    return fullName.substring(colonIndex + 1).trim();
  }
  
  // Fallback to the full name
  return fullName;
}

/**
 * Get section letter from section ID.
 * E.g., "section_c" → "C", "section_a" → "A"
 */
export function getSectionLetterFromId(sectionId: string): string {
  const match = sectionId.match(/section[_-]?([a-z])/i);
  if (match) {
    return match[1].toUpperCase();
  }
  return '';
}

/**
 * Build the display format for a section header.
 * Returns: "SECTION C: Custom Name"
 */
export function buildSectionDisplayHeader(
  sectionLetter: string,
  customName: string
): string {
  return `SECTION ${sectionLetter}: ${customName}`;
}

/**
 * Normalize section name by extracting custom part and rebuilding with correct letter.
 * This is useful when renumbering: if section was "SECTION D: Materials" and needs to become "C",
 * this will return "SECTION C: Materials"
 */
export function normalizeSectionName(
  fullName: string,
  newSectionLetter: string
): string {
  const customName = getDisplaySectionName(fullName);
  return buildSectionDisplayHeader(newSectionLetter, customName);
}
