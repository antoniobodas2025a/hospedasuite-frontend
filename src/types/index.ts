// src/types/index.ts
export interface Hotel {
  id: string;
  name: string;
  primary_color?: string;
  cancellation_policy?: string;
  address?: string;
  location?: string;
  cover_photo_url?: string;
  main_image_url?: string;
  hotel_amenities?: string[];
  whatsapp_number?: string;
  description?: string;
}

export interface Room {
  id: string;
  hotel_id: string;
  name: string;
  price: number | string;
  price_per_night?: number | string;
  capacity?: number;
  status: string;
  gallery?: { url?: string; [key: string]: any }[] | any[]; 
  description?: string;
}