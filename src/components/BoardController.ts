import PersonalKanbanPlugin from "main";
import { Board } from "types/interfaces";
import { BEM } from "utils/constants";
import KanbanView from "views/KanbanView";
import ColumnController from "components/ColumnController";

export default class BoardController {
  private container: HTMLElement;
  private plugin: PersonalKanbanPlugin;
  private parentView: KanbanView;

  constructor(container: HTMLElement, plugin: PersonalKanbanPlugin, parentView: KanbanView) {
    this.container = container;
    this.plugin = plugin;
    this.parentView = parentView;
  }

  public render() {
    const activeBoard = this.plugin.data.boards.find(b => b.id === this.parentView.activeBoardId);

    if (!activeBoard) {
      this.container.createEl("h2", { text: "Select or create a new board." });
      return;
    }

    this.renderBoardHeader(activeBoard);
    this.renderColumns(activeBoard);
  }

  private renderBoardHeader(board: Board) {
    const header = this.container.createEl("div", { cls: `${BEM.BLOCK.VIEW}__header` });
    const leftGroup = header.createEl("div", { cls: `${BEM.BLOCK.VIEW}__header-left` });

    const toggleBtn = leftGroup.createEl("button", { text: "☰", cls: "a-btn--icon" });
    toggleBtn.onclick = () => {
      const sidebar = this.parentView.containerEl.querySelector(`.${BEM.BLOCK.SIDEBAR}`);
      if (sidebar) sidebar.classList.toggle(`${BEM.BLOCK.SIDEBAR}--collapsed`);
    };

    const titleEl = header.createEl("h2", { text: board.title });
    titleEl.setAttribute("contenteditable", "true");

    titleEl.addEventListener("blur", async () => {
      const newTitle = titleEl.innerText.trim();
      if (newTitle !== "") {
        board.title = newTitle;
        await this.plugin.saveSettings();
        this.parentView.render();
      } else {
        titleEl.innerText = board.title;
      }
    });

    titleEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        titleEl.blur();
      }
    });

    const controls = header.createEl("div");
    const deleteBtn = controls.createEl("button", { text: "Delete Board" });
    deleteBtn.onclick = async () => {
      if (confirm(`Are you sure you want to delete "${board.title}"?`)) {
        this.plugin.data.boards = this.plugin.data.boards.filter(b => b.id !== board.id);
        this.parentView.activeBoardId = this.plugin.data.boards.length > 0 ? this.plugin.data.boards[0]?.id : undefined;
        await this.plugin.saveSettings();
        this.parentView.render();
      }
    };
  }

  private renderColumns(board: Board) {
    const boardContainer = this.container.createEl("div", { cls: `${BEM.BLOCK.VIEW}__container` });

    // Ensure Backlog column always exists at index 0
    if (!board.columns.length || board.columns[0].title !== "Backlog") {
      const existingBacklogIndex = board.columns.findIndex(c => c.title === "Backlog");

      if (existingBacklogIndex > -1) {
        const [backlog] = board.columns.splice(existingBacklogIndex, 1);
        board.columns.unshift(backlog);
      } else {
        board.columns.unshift({
          id: `col-backlog-${Date.now()}`,
          title: "Backlog",
          cards: []
        });
      }
      this.plugin.saveSettings();
    }

    board.columns.forEach((col, index) => {
      const isBacklog = index === 0 && col.title === "Backlog";
      const columnComponent = new ColumnController(col, boardContainer, this.plugin, this.parentView, isBacklog);
      columnComponent.render();

      const colEl = columnComponent.getColumnElement();

      if (!isBacklog) {
        colEl.setAttribute("draggable", "true");

        colEl.addEventListener("dragstart", (e) => {
          e.stopPropagation();
          e.dataTransfer!.setData("text/plain", JSON.stringify({ type: "COLUMN", index }));
          e.dataTransfer!.setData("application/x-kanban-column", "true");
        });

        colEl.addEventListener("dragover", (e) => {
          if (!e.dataTransfer?.types.includes("application/x-kanban-column")) return;
          e.preventDefault();
        });

        colEl.addEventListener("drop", async (e) => {
          if (!e.dataTransfer?.types.includes("application/x-kanban-column")) return;
          e.preventDefault();
          e.stopPropagation();

          const data = JSON.parse(e.dataTransfer!.getData("text/plain"));

          if (data.type === "COLUMN") {
            const fromIndex = data.index;
            const toIndex = index;

            if (fromIndex !== toIndex && fromIndex !== 0 && toIndex !== 0) {
              const [removed] = board.columns.splice(fromIndex, 1);
              board.columns.splice(toIndex, 0, removed);
              await this.plugin.saveSettings();
              this.parentView.render();
            }
          }
        });
      }
    });

    // Ghost Column for Creating New Columns
    const ghostCol = boardContainer.createEl("div", { cls: `${BEM.BLOCK.COLUMN} is-ghost` });
    const ghostInput = ghostCol.createEl("input", {
      type: "text",
      placeholder: "Type to add a new column...",
      cls: `${BEM.BLOCK.COLUMN}__input`
    });

    ghostInput.addEventListener("keydown", async (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const title = ghostInput.value.trim();
        if (title !== "") {
          board.columns.push({
            id: `col-${Date.now()}`,
            title: title,
            cards: []
          });
          await this.plugin.saveSettings();
          this.parentView.render();
        }
      }
    });
  }
}
