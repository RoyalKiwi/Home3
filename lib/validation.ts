/**
 * Validation helper functions for API request parameters
 */

/**
 * Validate and sanitize string input
 */
export function validateString(
  value: any,
  fieldName: string,
  minLength = 1,
  maxLength = 255
): string {
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string`);
  }

  const trimmed = value.trim();

  if (trimmed.length < minLength) {
    throw new Error(`${fieldName} must be at least ${minLength} characters`);
  }

  if (trimmed.length > maxLength) {
    throw new Error(`${fieldName} must be at most ${maxLength} characters`);
  }

  return trimmed;
}

/**
 * Validate integer input
 */
export function validateInteger(
  value: any,
  fieldName: string,
  min = 0
): number {
  const num = parseInt(value, 10);

  if (isNaN(num)) {
    throw new Error(`${fieldName} must be a number`);
  }

  if (num < min) {
    throw new Error(`${fieldName} must be at least ${min}`);
  }

  return num;
}

/**
 * Validate and coerce boolean input
 */
export function validateBoolean(value: any): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (value === 1 || value === '1' || value === 'true') {
    return true;
  }

  if (value === 0 || value === '0' || value === 'false') {
    return false;
  }

  // Default to false for invalid values
  return false;
}

/**
 * Validate enum value
 */
export function validateEnum<T extends string>(
  value: any,
  fieldName: string,
  allowed: T[]
): T {
  if (!allowed.includes(value)) {
    throw new Error(`${fieldName} must be one of: ${allowed.join(', ')}`);
  }

  return value as T;
}

/**
 * Validate URL format
 */
export function validateUrl(value: any, fieldName: string): string {
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string`);
  }

  if (!/^https?:\/\/.+/i.test(value)) {
    throw new Error(`${fieldName} must be a valid URL starting with http:// or https://`);
  }

  return value;
}

/**
 * Validate JSON string
 */
export function validateJSON(value: any, fieldName: string): string {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a JSON string`);
  }

  try {
    JSON.parse(value);
    return value;
  } catch (error) {
    throw new Error(`${fieldName} must be valid JSON`);
  }
}
