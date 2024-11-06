"use client";

import { useFighter } from "@/hooks/useFighter";

export default function FighterPage({ params }: { params: { id: string } }) {
  const { fighter, loading, error } = useFighter(params.id);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!fighter) return <div>Fighter not found</div>;

  return (
    <div>
      <h1>
        {fighter.first_name} {fighter.last_name}
      </h1>
      {/* Render fighter details and analytics */}
    </div>
  );
}
