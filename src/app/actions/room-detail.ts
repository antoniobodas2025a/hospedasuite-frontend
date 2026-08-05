"use server";

import type { RoomDetail } from "@/domain/room-availability";
import { createRoomDetailGateway } from "@/gateways/supabase-room-gateway";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function getRoomDetailAction(
  hotelSlug: string,
  roomId: string,
  _checkin?: string,
  _checkout?: string,
): Promise<{ success: boolean; data?: RoomDetail; error?: string }> {
  try {
    const gateway = createRoomDetailGateway(supabaseAdmin);
    const room = await gateway.getRoomDetail(hotelSlug, roomId);

    if (!room) {
      return { success: false, error: "Hotel or room not available" };
    }

    return { success: true, data: room };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
}
