import type { Category, Note } from "./types";

export const accentMap = {
  pink: "#e982b1",
  lilac: "#a98be8",
  peach: "#f0a178",
  mint: "#72c9ad",
  aurora: "#55cfa9"
};

export function formatDate(value: string) {
  const date = new Date(value);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return "Today";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
}

export function plainPreview(note: Note) {
  const text = note.content.trim().replace(/\s+/g, " ");
  return text || "A soft blank page, ready for thoughts...";
}

export function getCategory(categories: Category[], id: string | null) {
  return categories.find((category) => category.id === id) ?? null;
}

export function checklistProgress(note: Note) {
  if (note.checklist.length === 0) return null;
  const done = note.checklist.filter((item) => item.completed).length;
  return { done, total: note.checklist.length, percent: Math.round((done / note.checklist.length) * 100) };
}

export function isImageAttachment(type: string) {
  return ["png", "jpg", "jpeg", "gif", "webp"].includes(type.toLowerCase());
}
