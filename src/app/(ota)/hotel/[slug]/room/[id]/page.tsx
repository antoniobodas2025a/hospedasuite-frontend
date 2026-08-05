import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getHotelDetailsBySlugAction } from "@/app/actions/ota";
import { getRoomDetailAction } from "@/app/actions/room-detail";
import { createRoomDetailGateway } from "@/gateways/supabase-room-gateway";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { validateAndParseDates } from "@/domain/room-availability";
import type { HotelContext, RoomDetail } from "@/domain/room-availability";
import { roomDetailViewModel } from "@/view-models/room-detail-view-model";
import { RoomDetailClient } from "@/components/ota/room-detail/room-detail-client";
import type { Hotel } from "@/types";

interface HotelPageData extends Hotel {
  rooms?: Array<Record<string, unknown>>;
}

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

  const { success, hotel } = await getHotelDetailsBySlugAction(slug, checkin, checkout);
  if (!success || !hotel) {
    return { title: await t("roomNotFound") };
  }

  const roomResult = await getRoomDetailAction(slug, id, checkin, checkout);
  if (!roomResult.success || !roomResult.data) {
    return { title: await t("roomNotFound") };
  }

  const hotelData = hotel as unknown as HotelPageData;
  const room = roomResult.data as RoomDetail;
  const city = String(hotelData.city || hotelData.location || "").trim();
  const title = `${room.name} — ${hotelData.name}${city ? `, ${city}` : ""} | HospedaSuite`;
  const description =
    room.description ||
    (await t("metaDescription", { roomName: room.name, hotelName: hotelData.name }));
  const coverImage = room.gallery?.[0] || hotelData.main_image_url || "";

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

  const { success, hotel } = await getHotelDetailsBySlugAction(slug);
  if (!success || !hotel) {
    notFound();
  }

  const hotelData = hotel as unknown as HotelPageData;

  const roomResult = await getRoomDetailAction(slug, id, checkin, checkout);
  if (!roomResult.success || !roomResult.data) {
    notFound();
  }

  const room = roomResult.data as RoomDetail;

  const hotelContext: HotelContext = {
    id: hotelData.id,
    name: hotelData.name,
    slug: hotelData.slug || slug,
    city: String(hotelData.city || hotelData.location || "").trim(),
    totalRooms: Array.isArray(hotelData.rooms) ? hotelData.rooms.length : 1,
    subscriptionStatus: hotelData.subscription_status as HotelContext["subscriptionStatus"],
    status: hotelData.status as HotelContext["status"],
    taxRate: hotelData.tax_rate ?? 0,
    cancellationPolicy: hotelData.cancellation_policy ?? null,
    primaryColor: hotelData.primary_color ?? "#000000",
  };

  const dates = validateAndParseDates(checkin, checkout);

  let availability;
  if (dates) {
    const gateway = createRoomDetailGateway(supabaseAdmin);
    availability = await gateway.getAvailability(room.id, {
      from: dates.checkIn,
      to: dates.checkOut,
    });
  }

  const output = roomDetailViewModel({ room, hotel: hotelContext, dates, availability });

  const jsonLd = buildRoomJsonLd(slug, id, room, hotelData);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <RoomDetailClient output={output} />
    </main>
  );
}

function buildRoomJsonLd(
  slug: string,
  id: string,
  room: { name: string; description: string | null; gallery: string[]; pricePerNight: number },
  hotel: Hotel,
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
