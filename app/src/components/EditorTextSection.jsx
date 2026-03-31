import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

const proseMirrorStyles = `
.ProseMirror {
  outline: none;
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--mp-text);
  line-height: 1.7;
}
.ProseMirror p {
  margin: 0 0 8px;
}
.ProseMirror ul,
.ProseMirror ol {
  padding-left: 20px;
  margin-bottom: 8px;
}
.ProseMirror strong {
  font-weight: 600;
}
.ProseMirror em {
  font-style: italic;
}
.ProseMirror:focus {
  outline: none;
}
`;

export default function EditorTextSection({ value, onChange }) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value || "",
    immediatelyRender: false,
    onBlur: ({ editor }) => onChange(editor.getHTML()),
  });

  const btnStyle = (isActive) => ({
    padding: "2px 8px",
    background: isActive ? "var(--mp-accent-dim)" : "transparent",
    border: "1px solid",
    borderColor: isActive ? "var(--mp-accent)" : "transparent",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    color: isActive ? "var(--mp-accent)" : "var(--mp-text-secondary)",
    fontWeight: isActive ? 700 : 400,
    fontSize: 13,
    fontFamily: "var(--font-body)",
    lineHeight: 1,
    transition: "color 150ms, background 150ms",
  });

  return (
    <div style={{
      border: "1px solid var(--mp-border)",
      borderRadius: "var(--radius-sm)",
      background: "var(--mp-bg-input, var(--mp-bg-elevated))",
    }}>
      <style>{proseMirrorStyles}</style>
      <div style={{
        borderBottom: "1px solid var(--mp-border)",
        padding: "6px 10px",
        display: "flex",
        gap: 4,
      }}>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleBold().run()}
          style={btnStyle(editor?.isActive("bold"))}
          title="Gras"
          aria-label="Gras"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          style={{ ...btnStyle(editor?.isActive("italic")), fontStyle: "italic" }}
          title="Italique"
          aria-label="Italique"
        >
          I
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          style={btnStyle(editor?.isActive("bulletList"))}
          title="Liste à puces"
          aria-label="Liste à puces"
        >
          •
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          style={btnStyle(editor?.isActive("orderedList"))}
          title="Liste numérotée"
          aria-label="Liste numérotée"
        >
          1.
        </button>
      </div>
      <EditorContent
        editor={editor}
        style={{ padding: "10px 14px", minHeight: 80 }}
      />
    </div>
  );
}
