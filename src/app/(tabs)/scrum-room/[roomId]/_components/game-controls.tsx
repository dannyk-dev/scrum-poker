import { Button } from "@/components/ui/button";
import { IconPlayCard, IconFlagCheck, IconRefresh } from "@tabler/icons-react";

interface Props {
  gameId: string | null;
  startGame: () => void;
  endGame: () => void;
  restartGame: () => void;
  busy: boolean;
}

export default function GameControls({
  gameId,
  startGame,
  endGame,
  restartGame,
  busy,
}: Props) {
  return (
    <div className="flex gap-3">
      <Button onClick={startGame} disabled={!!gameId || busy}>
        <IconPlayCard size={16} className="mr-1" />
        Start game
      </Button>

      <Button
        variant="secondary"
        onClick={restartGame}
        disabled={!gameId || busy}
      >
        <IconRefresh size={16} className="mr-1" />
        Restart
      </Button>

      <Button
        variant="destructive"
        onClick={endGame}
        disabled={!gameId || busy}
      >
        <IconFlagCheck size={16} className="mr-1" />
        End / Show results
      </Button>
    </div>
  );
}
