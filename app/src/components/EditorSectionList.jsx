import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import EditorSectionCard from "./EditorSectionCard";

function SortableItem({ section, onChange, onDelete }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <EditorSectionCard
        section={section}
        onChange={onChange}
        onDelete={() => onDelete(section.id)}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

export default function EditorSectionList({ sections, onReorder, onChange, onDelete }) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sections.findIndex(s => s.id === active.id);
    const newIndex = sections.findIndex(s => s.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      onReorder(arrayMove(sections, oldIndex, newIndex));
    }
  };

  if (sections.length === 0) {
    return (
      <div style={{
        padding: "32px 20px",
        textAlign: "center",
        color: "var(--mp-text-muted)",
        fontSize: 13,
        fontFamily: "var(--font-body)",
        fontStyle: "italic",
      }}>
        Ajoutez des sections depuis la palette ci-dessus
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
        <div style={{ padding: "8px 12px" }}>
          {sections.map(section => (
            <SortableItem
              key={section.id}
              section={section}
              onChange={(updated) => onChange(updated)}
              onDelete={onDelete}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
