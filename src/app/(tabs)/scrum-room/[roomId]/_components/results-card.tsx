import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { IOnVoteEvent } from "@/lib/types/game.types";
// import type { Vote } from "@/server/api/routers/game-router";
import type { RoomUser } from "prisma/interfaces";


interface Props {
  results: IOnVoteEvent[];
  estimate?: number;
  users: RoomUser[];
}

export default function ResultsCard({ results, users, estimate }: Props) {
  const byUser = Object.fromEntries(results.map((r) => [r.userId, r.value]));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Results • Avg: {estimate?.toFixed(1) ?? 0}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-3 gap-4">
        {users.map((u) => (
          <div
            key={u.userId}
            className="flex flex-col items-center rounded bg-accent p-4"
          >
            <span className="text-sm">{u.user?.name}</span>
            <span className="mt-2 text-3xl font-semibold">
              {byUser[u.userId] ?? "—"}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
