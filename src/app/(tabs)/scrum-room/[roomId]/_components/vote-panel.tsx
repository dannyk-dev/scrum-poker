import { Button } from "@/components/ui/button";

const cards = [0, 1, 2, 3, 5, 8, 13, 21, 34];

interface Props {
  votes: Record<string, number>;
  disabled: boolean;
  onVote: (value: number) => void;
}

export default function VotePanel({ votes, disabled, onVote }: Props) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {cards.map((value) => (
        <Button
          key={value}
          disabled={disabled}
          onClick={() => onVote(value)}
          className="py-8 text-xl"
        >
          {value}
        </Button>
      ))}
    </div>
  );
}
