"use client";

import { useRouter } from "next/navigation";
import { RoomShowcaseModal } from "./RoomShowcaseModal";

interface WrapperProps {
  hotel: Parameters<typeof RoomShowcaseModal>[0]["hotel"];
}

export function RoomShowcaseModalWrapper({ hotel }: WrapperProps) {
  const router = useRouter();

  return (
    <RoomShowcaseModal
      hotel={hotel}
      onClose={() => {
        const params = new URLSearchParams(window.location.search);
        params.delete("showRoom");
        router.push(`?${params.toString()}`, { scroll: false });
      }}
      onCheckout={(roomId, guests) => {
        const params = new URLSearchParams(window.location.search);
        params.set("room", roomId);
        params.set("guests", String(guests));
        params.set("ref", "ota");
        params.delete("showRoom");
        router.push(`/book/${hotel.slug}/checkout?${params.toString()}`);
      }}
    />
  );
}
