/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  message?: string;
}

/**
 * Validate email format
 * @param email - Email to validate
 * @returns Validation result
 */
export function validateEmail(email: string): ValidationResult {
  if (!email || email.trim() === '') {
    return { valid: false, message: 'Email is required' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, message: 'Please enter a valid email address' };
  }

  return { valid: true };
}

/**
 * Validate password strength
 * @param password - Password to validate
 * @param minLength - Minimum password length (default: 6)
 * @returns Validation result
 */
export function validatePassword(
  password: string,
  minLength: number = 6
): ValidationResult {
  if (!password) {
    return { valid: false, message: 'Password is required' };
  }

  if (password.length < minLength) {
    return { valid: false, message: `Password must be at least ${minLength} characters` };
  }

  if (password.length > 128) {
    return { valid: false, message: 'Password must be less than 128 characters' };
  }

  return { valid: true };
}

/**
 * Validate username format
 * @param username - Username to validate
 * @returns Validation result
 */
export function validateUsername(username: string): ValidationResult {
  if (!username || username.trim() === '') {
    return { valid: false, message: 'Username is required' };
  }

  if (username.length < 3) {
    return { valid: false, message: 'Username must be at least 3 characters' };
  }

  if (username.length > 30) {
    return { valid: false, message: 'Username must be less than 30 characters' };
  }

  const usernameRegex = /^[a-zA-Z][a-zA-Z0-9_]*$/;
  if (!usernameRegex.test(username)) {
    return {
      valid: false,
      message: 'Username must start with a letter and contain only letters, numbers, and underscores'
    };
  }

  return { valid: true };
}

/**
 * Validate required field
 * @param value - Value to validate
 * @param fieldName - Name of the field for error message
 * @returns Validation result
 */
export function validateRequired(value: any, fieldName: string = 'Field'): ValidationResult {
  if (value === null || value === undefined) {
    return { valid: false, message: `${fieldName} is required` };
  }

  if (typeof value === 'string' && value.trim() === '') {
    return { valid: false, message: `${fieldName} is required` };
  }

  return { valid: true };
}

/**
 * Validate string length
 * @param value - String to validate
 * @param min - Minimum length
 * @param max - Maximum length
 * @param fieldName - Name of the field for error message
 * @returns Validation result
 */
export function validateLength(
  value: string,
  min: number,
  max: number,
  fieldName: string = 'Text'
): ValidationResult {
  if (!value) {
    return { valid: false, message: `${fieldName} is required` };
  }

  if (value.length < min) {
    return { valid: false, message: `${fieldName} must be at least ${min} characters` };
  }

  if (value.length > max) {
    return { valid: false, message: `${fieldName} must be less than ${max} characters` };
  }

  return { valid: true };
}

/**
 * Validate URL format
 * @param url - URL to validate
 * @returns Validation result
 */
export function validateUrl(url: string): ValidationResult {
  if (!url || url.trim() === '') {
    return { valid: false, message: 'URL is required' };
  }

  try {
    new URL(url);
    return { valid: true };
  } catch {
    return { valid: false, message: 'Please enter a valid URL' };
  }
}

/**
 * Validate phone number (basic validation)
 * @param phone - Phone number to validate
 * @returns Validation result
 */
export function validatePhone(phone: string): ValidationResult {
  if (!phone || phone.trim() === '') {
    return { valid: false, message: 'Phone number is required' };
  }

  // Remove common separators
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');

  // Check if it contains only digits and starts with +
  const phoneRegex = /^\+?[0-9]{7,15}$/;
  if (!phoneRegex.test(cleaned)) {
    return { valid: false, message: 'Please enter a valid phone number' };
  }

  return { valid: true };
}

/**
 * Validate multiple validators
 * @param value - Value to validate
 * @param validators - Array of validator functions
 * @returns Combined validation result
 */
export function validateMultiple(
  value: any,
  validators: Array<(value: any) => ValidationResult>
): ValidationResult {
  for (const validator of validators) {
    const result = validator(value);
    if (!result.valid) {
      return result;
    }
  }
  return { valid: true };
}

/**
 * Create a custom validator
 * @param validatorFn - Custom validation function
 * @param errorMessage - Error message to return if validation fails
 * @returns Validation result
 */
export function createValidator(
  validatorFn: (value: any) => boolean,
  errorMessage: string
): (value: any) => ValidationResult {
  return (value: any) => {
    const isValid = validatorFn(value);
    return { valid: isValid, message: isValid ? undefined : errorMessage };
  };
}
