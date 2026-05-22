export interface Card {
  id: string;
  title: string;
  description: string;
  notes: string;
  tags: string[];
};

export interface Column {
  id: string;
  title: string;
  cards: Card[]
};

export interface Board {
  id: string;
  title: string;
  columns: Column[]
};

export interface PluginData {
  boards: Board[]
};
