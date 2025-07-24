import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import type { Vote } from "@/server/api/routers/game-router";
import type { RouterOutputs } from "@/trpc/react";
import type { RoomUser, Vote } from "prisma/interfaces";


interface Props {
  results: Vote[];
  users: RoomUser[];
}

export default function ResultsCard({ results, users }: Props) {
  const byUser = Object.fromEntries(results.map((r) => [r.userId, r.value]));
  const avg =
    results.reduce((sum, v) => sum + v.value, 0) / (results.length || 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Results • Avg: {avg.toFixed(1)}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-3 gap-4">
        {users.map((u) => (
          <div
            key={u.userId}
            className="flex flex-col items-center rounded bg-accent p-4"
          >
            <span className="text-sm">{u.user.name}</span>
            <span className="mt-2 text-3xl font-semibold">
              {byUser[u.userId] ?? "—"}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
