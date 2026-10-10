import type { Category } from "../types";

interface Props {
  category: Category | null;
}

export function CategoryBadge({ category }: Props) {
  return (
    <span className="category-badge">
      <span style={{ background: category?.color ?? "#e8d7df" }} />
      {category?.name ?? "No category"}
    </span>
  );
}
