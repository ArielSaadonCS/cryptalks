// Small className-merging helper: clsx for conditional classes, tailwind-merge
// to resolve conflicting Tailwind utilities.
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
