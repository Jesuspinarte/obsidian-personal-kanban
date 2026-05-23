import PersonalKanbanPlugin from "main";
import { Board, Column } from "types/interfaces";
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

    board.columns.forEach((col, index) => {
      const columnComponent = new ColumnController(col, boardContainer, this.plugin, this.parentView);
      columnComponent.render();

      const colEl = columnComponent.getColumnElement();
      colEl.setAttribute("draggable", "true");

      colEl.addEventListener("dragstart", (e) => {
        e.dataTransfer!.setData("text/plain", JSON.stringify({ type: "COLUMN", index }));
      });

      colEl.addEventListener("dragover", (e) => e.preventDefault());

      colEl.addEventListener("drop", async (e) => {
        e.preventDefault();
        const data = JSON.parse(e.dataTransfer!.getData("text/plain"));

        if (data.type === "COLUMN") {
          const fromIndex = data.index;
          const toIndex = index;

          if (fromIndex !== toIndex) {
            const [removed] = board.columns.splice(fromIndex, 1);
            board.columns.splice(toIndex, 0, removed);
            await this.plugin.saveSettings();
            this.parentView.render();
          }
        }
      });
    });

    const addColBtn = boardContainer.createEl("button", { text: "+ Add Column" });
    addColBtn.onclick = async () => {
      board.columns.push({
        id: `col-${Date.now()}`,
        title: "New Column",
        cards: []
      });
      await this.plugin.saveSettings();
      this.parentView.render();
    };
  }
}
