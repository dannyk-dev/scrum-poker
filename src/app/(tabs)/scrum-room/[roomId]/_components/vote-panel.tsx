import { Button } from "@/components/ui/button";
import { cn } from "../../../../../lib/utils";

const cards = [0, 1, 2, 3, 5, 8, 13, 21, 34];

interface Props {
  votes: Record<string, number>;
  disabled: boolean;
  onVote: (value: number) => void;
  userId: string;
}

export default function VotePanel({ votes, disabled, onVote, userId }: Props) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {cards.map((value) => (
        <Button
          key={value}
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          disabled={votes[userId] === value}
          onClick={() => onVote(value)}
          variant='outline'
          className={cn("text-lg lg:py-8 lg:text-xl")}
        >
          {value === 0 ? '?' : value}
        </Button>
      ))}
    </div>
  );
}
