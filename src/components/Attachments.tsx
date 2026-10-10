import { FileText, Image, Paperclip, Trash2 } from "lucide-react";
import type { Attachment, Note } from "../types";
import { isImageAttachment } from "../utils";

interface Props {
  note: Note;
  onRefresh: () => Promise<void>;
}

export function Attachments({ note, onRefresh }: Props) {
  const addAttachment = async () => {
    await window.mochi.addAttachment(note.id);
    await onRefresh();
  };

  const removeAttachment = async (attachment: Attachment) => {
    if (!confirm(`Remove "${attachment.name}"?`)) return;
    await window.mochi.deleteAttachment(attachment.id);
    await onRefresh();
  };

  return (
    <section className="editor-section">
      <div className="attachments-header">
        <div className="editor-section-title">Attachments</div>
        <button className="secondary-button" onClick={addAttachment}>
          <Paperclip size={16} /> Add attachment
        </button>
      </div>

      {note.attachments.length === 0 ? (
        <p className="hint-text">No attachments yet.</p>
      ) : (
        <div className="attachment-grid">
          {note.attachments.map((attachment) => (
            <div className="attachment-card" key={attachment.id}>
              <button className="attachment-open" onClick={() => window.mochi.openAttachment(attachment.id)}>
                {isImageAttachment(attachment.type) ? (
                  <>
                    <Image size={18} />
                    <span>{attachment.name}</span>
                  </>
                ) : (
                  <>
                    <FileText size={18} />
                    <span>{attachment.name}</span>
                  </>
                )}
              </button>
              <button className="icon-button ghost tiny" onClick={() => removeAttachment(attachment)} title="Remove attachment">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
