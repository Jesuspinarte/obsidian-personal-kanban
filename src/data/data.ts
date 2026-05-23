// data.ts
import { PluginData } from "types/interfaces";

export const DEFAULT_DATA: PluginData = {
  boards: [
    {
      id: "board-1",
      title: "Personal Kanban board #1",
      columns: [
        { id: "column-1", title: "TO DO", cards: [] },
        { id: "column-2", title: "IN PROGRESS", cards: [] },
        { id: "column-3", title: "DONE", cards: [] }
      ]
    }
  ]
};
