import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { ChecklistItem, Note } from "../types";

interface Props {
  note: Note;
  onRefresh: () => Promise<void>;
}

export function Checklist({ note, onRefresh }: Props) {
  const [newItem, setNewItem] = useState("");

  const addItem = async () => {
    if (!newItem.trim()) return;
    await window.mochi.createChecklistItem({ noteId: note.id, text: newItem.trim() });
    setNewItem("");
    await onRefresh();
  };

  const updateItem = async (item: ChecklistItem, patch: Partial<Pick<ChecklistItem, "text" | "completed">>) => {
    await window.mochi.updateChecklistItem({ id: item.id, ...patch });
    await onRefresh();
  };

  const deleteItem = async (item: ChecklistItem) => {
    await window.mochi.deleteChecklistItem(item.id);
    await onRefresh();
  };

  return (
    <section className="editor-section">
      <div className="editor-section-title">Checklist</div>
      <div className="checklist">
        {note.checklist.map((item) => (
          <div className={`check-item ${item.completed ? "completed" : ""}`} key={item.id}>
            <label>
              <input type="checkbox" checked={item.completed} onChange={(event) => updateItem(item, { completed: event.target.checked })} />
              <span />
            </label>
            <input value={item.text} onChange={(event) => updateItem(item, { text: event.target.value })} />
            <button className="icon-button ghost tiny" onClick={() => deleteItem(item)} title="Delete checklist item">
              <Trash2 size={15} />
            </button>
          </div>
        ))}

        <div className="add-check">
          <input
            value={newItem}
            onChange={(event) => setNewItem(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void addItem();
            }}
            placeholder="Add a gentle task..."
          />
          <button className="icon-button" onClick={addItem} title="Add checklist item">
            <Plus size={17} />
          </button>
        </div>
      </div>
    </section>
  );
}
