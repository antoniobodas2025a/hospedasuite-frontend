"use server";

import type { RoomDetail, HotelContext } from "@/domain/room-availability";
import type { RoomDetailResult } from "@/use-cases/room-detail/gateway.interface";
import { createRoomDetailGateway } from "@/gateways/supabase-room-gateway";
import { supabaseAdmin } from "@/lib/supabase-admin";

export interface RoomSitemapEntry {
  id: string;
  slug: string;
  updatedAt: string | null;
}

export type RoomDetailActionData = {
  room: RoomDetail;
  hotel: HotelContext;
};

export async function getRoomDetailAction(
  hotelSlug: string,
  roomId: string,
  _checkin?: string,
  _checkout?: string,
): Promise<{ success: boolean; data?: RoomDetailActionData; error?: string }> {
  try {
    const gateway = createRoomDetailGateway(supabaseAdmin);
    const result = await gateway.getRoomDetail(hotelSlug, roomId);

    if (!result) {
      return { success: false, error: "Hotel or room not available" };
    }

    return { success: true, data: result };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[ROOM DETAIL] Error fetching room detail:", message);
    return { success: false, error: "No se pudo cargar la información de la habitación" };
  }
}

export async function getRoomSitemapCountAction(): Promise<number> {
  try {
    const { data: hotels, error: hotelError } = await supabaseAdmin
      .from("hotels")
      .select("id, status, subscription_status, go_live")
      .eq("status", "active");

    if (hotelError || !hotels) {
      console.error("[SITEMAP] Error fetching hotels for count:", hotelError?.message);
      return 0;
    }

    const activeHotelIds = hotels
      .filter(
        (hotel) =>
          hotel.status === "active" &&
          hotel.go_live === true &&
          hotel.subscription_status !== "cancelled",
      )
      .map((hotel) => hotel.id);

    if (activeHotelIds.length === 0) return 0;

    const { count, error: roomError } = await supabaseAdmin
      .from("rooms")
      .select("id", { count: "exact", head: true })
      .in("hotel_id", activeHotelIds)
      .neq("status", "maintenance")
      .neq("status", "inactive");

    if (roomError) {
      console.error("[SITEMAP] Error counting rooms:", roomError.message);
      return 0;
    }

    return count ?? 0;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[SITEMAP] Error counting room sitemap entries:", message);
    return 0;
  }
}

export async function getRoomSitemapEntriesAction(): Promise<RoomSitemapEntry[]> {
  try {
    const { data: hotels, error: hotelError } = await supabaseAdmin
      .from("hotels")
      .select("id, slug, status, subscription_status, go_live")
      .eq("status", "active");

    if (hotelError || !hotels) {
      console.error("[SITEMAP] Error fetching hotels:", hotelError?.message);
      return [];
    }

    const activeHotels = hotels.filter(
      (hotel) =>
        hotel.status === "active" &&
        hotel.go_live === true &&
        hotel.subscription_status !== "cancelled",
    );

    if (activeHotels.length === 0) return [];

    const hotelIds = activeHotels.map((hotel) => hotel.id);
    const { data: rooms, error: roomError } = await supabaseAdmin
      .from("rooms")
      .select("id, hotel_id, status")
      .in("hotel_id", hotelIds)
      .neq("status", "maintenance");

    if (roomError || !rooms) {
      console.error("[SITEMAP] Error fetching rooms:", roomError?.message);
      return [];
    }

    const hotelById = new Map(activeHotels.map((hotel) => [hotel.id, hotel]));

    return rooms
      .filter((room) => room.status !== "maintenance" && room.status !== "inactive")
      .map((room) => {
        const hotel = hotelById.get(room.hotel_id);
        return {
          id: room.id,
          slug: hotel?.slug || "",
          updatedAt: null,
        };
      })
      .filter((entry) => entry.slug !== "");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[SITEMAP] Error building room sitemap entries:", message);
    return [];
  }
}
