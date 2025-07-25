import Link from "next/link";

import { auth } from "@/server/auth";
import { HydrateClient } from "@/trpc/server";
import { Button } from "@/components/ui/button";
import { IconLayoutKanban, IconPlayerPlay } from "@tabler/icons-react";

export default async function Home() {
  const session = await auth();

  return (
    <HydrateClient>
      <main className="bg-background w-full overflow-x-hidden">
        <div className="flex h-screen w-full flex-col items-center justify-center gap-y-4">
          <p className="text-xl">
            Scrum Poker!
          </p>
          {session ? (
            <Button asChild variant="secondary" size='lg'>
              <Link href="/scrum-room">
                <IconPlayerPlay />
                Play
              </Link>
            </Button>
          ) : (
            <Button asChild variant="secondary" size='lg'>
              <Link href="/auth/signin">
                <IconLayoutKanban />
                Connect Jira
              </Link>
            </Button>
          )}
        </div>
      </main>
    </HydrateClient>
  );
}
