import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getRoomDetailAction } from "@/app/actions/room-detail";
import { createRoomDetailGateway } from "@/gateways/supabase-room-gateway";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { validateAndParseDates } from "@/domain/room-availability";
import type { RoomDetail } from "@/domain/room-availability";
import { roomDetailViewModel } from "@/view-models/room-detail-view-model";
import { RoomDetailClient } from "@/components/ota/room-detail/room-detail-client";

export const dynamic = "force-dynamic";

const BASE_URL = "https://hospedasuite.com";

interface PageProps {
  params: Promise<{ slug: string; id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const t = await getTranslations("roomDetail");
  const { slug, id } = await params;
  const resolvedSearchParams = await searchParams;
  const checkin = resolvedSearchParams?.checkin as string | undefined;
  const checkout = resolvedSearchParams?.checkout as string | undefined;

  if (!slug || !id) {
    return { title: await t("roomNotFound") };
  }

  const roomResult = await getRoomDetailAction(slug, id, checkin, checkout);
  if (!roomResult.success || !roomResult.data) {
    return { title: await t("roomNotFound") };
  }

  const { room, hotel } = roomResult.data;
  const title = `${room.name} — ${hotel.name}${hotel.city ? `, ${hotel.city}` : ""} | HospedaSuite`;
  const description =
    room.description ||
    (await t("metaDescription", { roomName: room.name, hotelName: hotel.name }));
  const coverImage = room.gallery?.[0] || "";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: coverImage ? [coverImage] : [],
    },
    alternates: {
      canonical: `${BASE_URL}/hotel/${slug}/room/${id}`,
    },
  };
}

export default async function RoomDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { slug, id } = await params;
  const resolvedSearchParams = await searchParams;
  const checkin = resolvedSearchParams?.checkin as string | undefined;
  const checkout = resolvedSearchParams?.checkout as string | undefined;

  if (!slug || !id) {
    notFound();
  }

  const roomResult = await getRoomDetailAction(slug, id, checkin, checkout);
  if (!roomResult.success || !roomResult.data) {
    notFound();
  }

  const { room, hotel } = roomResult.data;

  const dates = validateAndParseDates(checkin, checkout);

  let availability;
  if (dates) {
    const gateway = createRoomDetailGateway(supabaseAdmin);
    availability = await gateway.getAvailability(room.id, {
      from: dates.checkIn,
      to: dates.checkOut,
    });
  }

  const output = roomDetailViewModel({ room, hotel, dates, availability });

  const jsonLd = buildRoomJsonLd(slug, id, room, hotel);

  const safeJsonLd = JSON.stringify(jsonLd).replace(/<\//g, '<\\/');

  return (
    <main className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd }}
      />
      <RoomDetailClient output={output} />
    </main>
  );
}

function buildRoomJsonLd(
  slug: string,
  id: string,
  room: { name: string; description: string | null; gallery: string[]; pricePerNight: number },
  hotel: { name: string; main_image_url?: string | null },
) {
  const url = `${BASE_URL}/hotel/${slug}/room/${id}`;
  const image = room.gallery?.[0] || hotel.main_image_url || "";

  return {
    "@context": "https://schema.org",
    "@type": ["HotelRoom", "Product"],
    name: room.name,
    description: room.description || "",
    image: image ? [image] : [],
    url,
    brand: {
      "@type": "Brand",
      name: hotel.name,
    },
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "COP",
      price: String(room.pricePerNight ?? 0),
      availability: "https://schema.org/InStock",
      itemOffered: {
        "@type": "HotelRoom",
        name: room.name,
      },
    },
  };
}
