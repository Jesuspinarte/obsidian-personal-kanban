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

    // Renders a fallback message if there is no active board
    if (!activeBoard) {
      this.container.createEl("h2", { text: "Select or create a new board." });
      return;
    }

    this.renderBoardHeader(activeBoard);
    this.renderColumns(activeBoard);
  }

  /**
   * Renders the board Header
   * @param board Current active board
   */
  private renderBoardHeader(board: Board) {
    const header = this.container.createEl("div", { cls: `${BEM.BLOCK.VIEW}__header` });

    // Toggle button
    const leftGroup = header.createEl("div", { cls: `${BEM.BLOCK.VIEW}__header-left` });

    // Collapse/Expand button
    const toggleBtn = leftGroup.createEl("button", { text: "☰", cls: "a-btn--icon" });
    toggleBtn.onclick = () => {
      // We get the sidebar from the dom and toggle the class
      const sidebar = this.parentView.containerEl.querySelector(`.${BEM.BLOCK.SIDEBAR}`);
      if (sidebar) {
        sidebar.classList.toggle(`${BEM.BLOCK.SIDEBAR}--collapsed`);
      }
    };

    // Makes the title editable
    const titleEl = header.createEl("h2", { text: board.title });
    titleEl.setAttribute("contenteditable", "true");

    // Saves if we click out of the element
    titleEl.addEventListener("blur", async () => {
      const newTitle = titleEl.innerText.trim();
      if (newTitle !== "") {
        board.title = newTitle;
        await this.plugin.saveSettings();
        this.parentView.render(); // FIX: Changed from this.render() to trigger a full clean re-render
      } else {
        titleEl.innerText = board.title; // If the new title is empty, goes back to the last title
      }
    });

    // We save the title on enter
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

  /**
   * Renders the columns container and maps the column controllers
   * @param board Current active board
   */
  private renderColumns(board: Board) {
    const activeBoard = this.plugin.data.boards.find(b => b.id === this.parentView.activeBoardId)

    // It renders a message if there's no board
    if (!activeBoard) {
      this.container.createEl("h2", { text: "Select or create a new board." });
      return;
    }

    // Columns container
    const boardContainer = this.container.createEl("div", { cls: `${BEM.BLOCK.VIEW}__container` });

    // Column Controller
    activeBoard.columns.forEach(col => {
      const columnComponent = new ColumnController(col, boardContainer, this.plugin, this.parentView);
      columnComponent.render();
    });

    // Button to create a new column
    const addColBtn = boardContainer.createEl("button", { text: "+ Add Column" });
    addColBtn.onclick = async () => {
      const newCol: Column = {
        id: `col-${Date.now()}`,
        title: "New Column",
        cards: []
      };
      activeBoard.columns.push(newCol);
      await this.plugin.saveSettings();
      this.parentView.render(); // FIX: Changed from this.render() to trigger a full clean re-render
    };
  }
}