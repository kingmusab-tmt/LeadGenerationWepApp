// "use client";
// import React from "react";
// import { useSortable } from "@dnd-kit/sortable";
// import { CSS } from "@dnd-kit/utilities";
// import { ListItem } from "@mui/material";

// interface SortableItemProps {
//   id: string;
//   children: React.ReactNode;
// }

// export const SortableItem: React.FC<SortableItemProps> = ({ id, children }) => {
//   const {
//     attributes,
//     listeners,
//     setNodeRef,
//     transform,
//     transition,
//     isDragging,
//   } = useSortable({ id });

//   const style = {
//     transform: CSS.Transform.toString(transform),
//     transition,
//     opacity: isDragging ? 0.5 : 1,
//     zIndex: isDragging ? 1000 : "auto",
//   };

//   return (
//     <div ref={setNodeRef} style={style} {...attributes}>
//       <div {...listeners} style={{ cursor: isDragging ? "grabbing" : "grab" }}>
//         {children}
//       </div>
//     </div>
//   );
// };
"use client";
import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ListItem } from "@mui/material";

interface SortableItemProps {
  id: string;
  children: React.ReactNode;
}

export const SortableItem: React.FC<SortableItemProps> = ({ id, children }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : "auto",
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div {...listeners} style={{ cursor: isDragging ? "grabbing" : "grab" }}>
        {children}
      </div>
    </div>
  );
};
