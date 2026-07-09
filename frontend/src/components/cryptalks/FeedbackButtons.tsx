import { ThumbsUp, ThumbsDown, Check } from "lucide-react";
import type { SectionType, Vote } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Props {
  sectionType: SectionType;
  itemId: string;
  vote: Vote | null;
  submitting: boolean;
  onVote: (sectionType: SectionType, itemId: string, vote: Vote) => void;
  prompt?: string;
}

export function FeedbackButtons({ sectionType, itemId, vote, submitting, onVote, prompt }: Props) {
  const btn =
    "group relative flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-secondary/40 text-muted-foreground transition-all duration-200 hover:scale-110 hover:border-primary/40 disabled:opacity-50 disabled:hover:scale-100";
  return (
    <div className="mt-4 flex items-center gap-2 pt-3 border-t border-border/50">
      {prompt && <span className="text-xs text-muted-foreground mr-auto">{prompt}</span>}
      <button
        type="button"
        disabled={submitting}
        aria-label="Thumbs up"
        aria-pressed={vote === "UP"}
        onClick={() => onVote(sectionType, itemId, "UP")}
        className={cn(btn, vote === "UP" && "!border-emerald/60 !bg-emerald/15 !text-emerald scale-105")}
      >
        {vote === "UP" ? <Check className="h-4 w-4" /> : <ThumbsUp className="h-4 w-4" />}
      </button>
      <button
        type="button"
        disabled={submitting}
        aria-label="Thumbs down"
        aria-pressed={vote === "DOWN"}
        onClick={() => onVote(sectionType, itemId, "DOWN")}
        className={cn(btn, vote === "DOWN" && "!border-rose/60 !bg-rose/15 !text-rose scale-105")}
      >
        {vote === "DOWN" ? <Check className="h-4 w-4" /> : <ThumbsDown className="h-4 w-4" />}
      </button>
    </div>
  );
}
