"use client";

import { EventView } from "@/components/EventView";

export default function EventPage({ params }: { params: { id: string } }) {
  return <EventView eventId={params.id} />;
}
