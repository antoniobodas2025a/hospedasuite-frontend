// ============================================================================
// HOTEL QUALITY SERVICE - Single Responsibility for quality validation
// ============================================================================
// This is a PURE SERVICE with no external dependencies.
// It receives data and returns validation results.
// Following Uncle Bob's Clean Architecture: no Supabase, no Resend, no DB.

// ============================================================================
// TYPES
// ============================================================================

export interface HotelQualityCheck {
  field: string;
  passed: boolean;
  message: string;
}

export interface HotelQualityResult {
  isValid: boolean;
  score: number; // 0-100
  checks: HotelQualityCheck[];
  failedCritical: string[]; // Critical fields that failed
}

// ============================================================================
// QUALITY RULES - Business Logic Only
// ============================================================================

interface HotelData {
  name?: string;
  description?: string;
  location?: string;
  city?: string;
  address?: string;
  phone?: string;
  email?: string;
  main_image_url?: string;
  cover_photo_url?: string;
  gallery_urls?: string[];
  stars?: number;
  min_price?: number;
  amenities?: string[];
  tagline?: string;
  policies?: {
    check_in?: string;
    check_out?: string;
    cancellation?: string;
  };
}

// Critical fields - must pass for approval
const CRITICAL_FIELDS = ['name', 'location', 'city', 'description', 'main_image_url'];

// Weights for scoring (total = 100)
const WEIGHTS: Record<string, number> = {
  name: 15,
  description: 15,
  location: 10,
  city: 10,
  address: 5,
  phone: 5,
  email: 5,
  main_image_url: 15,
  cover_photo_url: 5,
  gallery_urls: 5,
  stars: 5,
  min_price: 5,
  amenities: 5,
  tagline: 3,
  policies: 7,
};

// ============================================================================
// VALIDATION FUNCTIONS - Pure, testable, no side effects
// ============================================================================

function validateField(
  field: string,
  value: unknown,
  min_length?: number
): HotelQualityCheck {
  const exists = value !== undefined && value !== null && value !== '';
  const hasMinLength = min_length
    ? typeof value === 'string' && value.length >= min_length
    : true;

  return {
    field,
    passed: exists && hasMinLength,
    message: !exists
      ? `${field} is required`
      : !hasMinLength
      ? `${field} must be at least ${min_length} characters`
      : `${field} is valid`,
  };
}

function validateArray(
  field: string,
  value: unknown,
  min_items?: number
): HotelQualityCheck {
  const isArray = Array.isArray(value);
  const hasMinItems = min_items ? isArray && value.length >= min_items : isArray;

  return {
    field,
    passed: hasMinItems,
    message: !isArray
      ? `${field} must be an array`
      : !hasMinItems
      ? `${field} must have at least ${min_items} items`
      : `${field} is valid`,
  };
}

function validateNumber(
  field: string,
  value: unknown,
  min?: number,
  max?: number
): HotelQualityCheck {
  const exists = value !== undefined && value !== null;
  const isNumber = exists && typeof value === 'number' && !isNaN(value);
  const inRange = isNumber && min !== undefined && max !== undefined
    ? value >= min && value <= max
    : isNumber;

  return {
    field,
    passed: inRange,
    message: !exists
      ? `${field} is required`
      : !isNumber
      ? `${field} must be a number`
      : !inRange
      ? `${field} must be between ${min} and ${max}`
      : `${field} is valid`,
  };
}

// ============================================================================
// MAIN VALIDATION FUNCTION
// ============================================================================

export function validateHotelQuality(hotel: HotelData): HotelQualityResult {
  const checks: HotelQualityCheck[] = [];
  let score = 0;
  const failedCritical: string[] = [];

  // Required fields (critical)
  checks.push(validateField('name', hotel.name, 3));
  checks.push(validateField('description', hotel.description, 20));
  checks.push(validateField('location', hotel.location, 5));
  checks.push(validateField('city', hotel.city, 2));

  // Image (critical)
  checks.push(validateField('main_image_url', hotel.main_image_url));

  // Optional but important
  checks.push(validateField('address', hotel.address, 5));
  checks.push(validateField('phone', hotel.phone, 7));
  checks.push(validateField('email', hotel.email));

  // Images
  checks.push(validateField('cover_photo_url', hotel.cover_photo_url));
  checks.push(validateArray('gallery_urls', hotel.gallery_urls, 3));

  // Numeric
  checks.push(validateNumber('stars', hotel.stars, 1, 5));
  checks.push(validateNumber('min_price', hotel.min_price, 1));

  // Amenities
  checks.push(validateArray('amenities', hotel.amenities, 3));

  // Optional text
  checks.push(validateField('tagline', hotel.tagline));

  // Policies object
  const hasPolicies = hotel.policies && typeof hotel.policies === 'object';
  checks.push({
    field: 'policies',
    passed: hasPolicies,
    message: hasPolicies ? 'policies is valid' : 'policies object is required',
  });

  // Calculate score and identify critical failures
  for (const check of checks) {
    const weight = WEIGHTS[check.field] || 0;
    if (check.passed) {
      score += weight;
    }
    if (!check.passed && CRITICAL_FIELDS.includes(check.field)) {
      failedCritical.push(check.field);
    }
  }

  return {
    isValid: failedCritical.length === 0 && score >= 70,
    score,
    checks,
    failedCritical,
  };
}
