import { validateHotelQuality } from '../hotel-quality-service';

describe('validateHotelQuality', () => {
  const validHotel = {
    name: 'Hotel Test',
    description: 'A beautiful hotel in the city center with great amenities',
    location: 'Calle Principal 123',
    city: 'Bogotá',
    address: 'Calle Principal 123, Bogotá',
    phone: '+57 300 123 4567',
    email: 'info@hotel.com',
    main_image_url: 'https://example.com/hotel.jpg',
    cover_photo_url: 'https://example.com/cover.jpg',
    gallery_urls: ['https://example.com/1.jpg', 'https://example.com/2.jpg', 'https://example.com/3.jpg'],
    stars: 4,
    min_price: 120000,
    amenities: ['wifi', 'pool', 'parking'],
    tagline: 'Best hotel in town',
    policies: {
      check_in: '14:00',
      check_out: '12:00',
      cancellation: '24 hours',
    },
  };

  describe('valid hotels', () => {
    it('should pass validation for a complete hotel', () => {
      const result = validateHotelQuality(validHotel);

      expect(result.isValid).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(70);
      expect(result.failedCritical).toHaveLength(0);
      expect(result.checks.every(c => c.passed)).toBe(true);
    });

    it('should pass with minimal required fields', () => {
      const minimalHotel = {
        name: 'Minimal Hotel',
        description: 'A simple hotel with basic amenities for travelers',
        location: 'Main Street',
        city: 'City',
        main_image_url: 'https://example.com/hotel.jpg',
        amenities: ['wifi', 'parking'],
        stars: 3,
        min_price: 80000,
      };

      const result = validateHotelQuality(minimalHotel);

      expect(result.isValid).toBe(true);
      expect(result.failedCritical).toHaveLength(0);
    });
  });

  describe('invalid hotels', () => {
    it('should fail when name is missing', () => {
      const hotel = { ...validHotel, name: undefined };
      const result = validateHotelQuality(hotel);

      expect(result.isValid).toBe(false);
      expect(result.failedCritical).toContain('name');
    });

    it('should fail when description is too short', () => {
      const hotel = { ...validHotel, description: 'Short' };
      const result = validateHotelQuality(hotel);

      expect(result.isValid).toBe(false);
      expect(result.failedCritical).toContain('description');
    });

    it('should fail when location is missing', () => {
      const hotel = { ...validHotel, location: undefined };
      const result = validateHotelQuality(hotel);

      expect(result.isValid).toBe(false);
      expect(result.failedCritical).toContain('location');
    });

    it('should fail when city is missing', () => {
      const hotel = { ...validHotel, city: undefined };
      const result = validateHotelQuality(hotel);

      expect(result.isValid).toBe(false);
      expect(result.failedCritical).toContain('city');
    });

    it('should fail when main_image_url is missing', () => {
      const hotel = { ...validHotel, main_image_url: undefined };
      const result = validateHotelQuality(hotel);

      expect(result.isValid).toBe(false);
      expect(result.failedCritical).toContain('main_image_url');
    });
  });

  describe('scoring', () => {
    it('should return high score for complete hotel', () => {
      const result = validateHotelQuality(validHotel);
      expect(result.score).toBeGreaterThanOrEqual(90);
    });

    it('should return lower score for partial hotel', () => {
      const partialHotel = {
        name: 'Partial Hotel',
        description: 'A hotel with only some fields filled in',
        location: 'Some location',
        city: 'Some city',
        main_image_url: 'https://example.com/hotel.jpg',
      };

      const result = validateHotelQuality(partialHotel);
      expect(result.score).toBeLessThan(70);
    });

    it('should calculate correct score weight', () => {
      // All fields empty except critical ones
      const criticalOnly = {
        name: 'Critical Only Hotel',
        description: 'This hotel has only critical fields with minimum data',
        location: 'Location',
        city: 'City',
        main_image_url: 'https://example.com/hotel.jpg',
      };

      const result = validateHotelQuality(criticalOnly);
      // Score should be around 60-70% (critical fields + some weight)
      expect(result.score).toBeGreaterThan(40);
      expect(result.score).toBeLessThan(80);
    });
  });

  describe('edge cases', () => {
    it('should handle empty object', () => {
      const result = validateHotelQuality({});

      expect(result.isValid).toBe(false);
      expect(result.failedCritical.length).toBeGreaterThan(0);
      expect(result.checks.length).toBeGreaterThan(0);
    });

    it('should handle null values', () => {
      const hotel = {
        name: null,
        description: null,
        location: null,
        city: null,
        main_image_url: null,
      };

      const result = validateHotelQuality(hotel as any);
      expect(result.isValid).toBe(false);
    });

    it('should validate stars range (1-5)', () => {
      const hotelWithBadStars = { ...validHotel, stars: 6 };
      const result = validateHotelQuality(hotelWithBadStars);

      const starsCheck = result.checks.find(c => c.field === 'stars');
      expect(starsCheck?.passed).toBe(false);
    });

    it('should validate gallery minimum items', () => {
      const hotelWithFewGallery = { ...validHotel, gallery_urls: ['one.jpg'] };
      const result = validateHotelQuality(hotelWithFewGallery);

      const galleryCheck = result.checks.find(c => c.field === 'gallery_urls');
      expect(galleryCheck?.passed).toBe(false);
    });
  });
});
