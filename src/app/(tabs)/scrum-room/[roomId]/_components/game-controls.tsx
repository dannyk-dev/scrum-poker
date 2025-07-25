import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
    <div className="flex w-full items-center justify-center lg:justify-start gap-3">
      <Button onClick={startGame} disabled={!!gameId || busy}>
        <IconPlayCard size={16} className="mr-1" />
        Start game
      </Button>


      <Button
        variant="destructive"
        onClick={endGame}
        disabled={!gameId || busy}
      >
        <IconFlagCheck size={16} className="mr-1" />
        Show results
      </Button>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
        variant="secondary"
        onClick={restartGame}
        disabled={!gameId || busy}
      >
        <IconRefresh size={16} className="mr-1" />
      </Button>
        </TooltipTrigger>
        <TooltipContent>
          Restart Game
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
