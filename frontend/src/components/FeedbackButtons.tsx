import { SectionType, Vote } from "../api";

interface FeedbackButtonsProps {
  sectionType: SectionType;
  itemId: string;
  vote: Vote | null;
  submitting: boolean;
  onVote: (sectionType: SectionType, itemId: string, vote: Vote) => void;
  prompt?: string;
}

export default function FeedbackButtons({
  sectionType,
  itemId,
  vote,
  submitting,
  onVote,
  prompt,
}: FeedbackButtonsProps) {
  return (
    <div className="feedback-buttons">
      {prompt && <span className="feedback-prompt">{prompt}</span>}
      <button
        type="button"
        className={`feedback-button${vote === "UP" ? " selected" : ""}`}
        disabled={submitting}
        aria-label="Thumbs up"
        aria-pressed={vote === "UP"}
        onClick={() => onVote(sectionType, itemId, "UP")}
      >
        👍
      </button>
      <button
        type="button"
        className={`feedback-button${vote === "DOWN" ? " selected" : ""}`}
        disabled={submitting}
        aria-label="Thumbs down"
        aria-pressed={vote === "DOWN"}
        onClick={() => onVote(sectionType, itemId, "DOWN")}
      >
        👎
      </button>
    </div>
  );
}
