import PersonalKanbanPlugin from "main";
import { Board } from "types/interfaces";
import { BEM } from "utils/constants";
import KanbanView from "views/KanbanView";
import ColumnController from "components/ColumnController";
import { setIcon } from "obsidian";

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
    const header = this.container.createEl("div", { cls: `${BEM.TEMPS.VIEW}__header` });
    const leftGroup = header.createEl("div", { cls: `${BEM.TEMPS.VIEW}__header-left` });

    // Collapsible sidebar button using native chevron icon
    const toggleBtn = leftGroup.createEl("button", { cls: "a-btn--icon m-kanban-toggle-sidebar" });

    // Check current state to apply the correct initial icon
    const sidebar = this.parentView.containerEl.querySelector(`.${BEM.ORGS.SIDEBAR}`);
    const isCurrentlyCollapsed = sidebar?.classList.contains(`${BEM.ORGS.SIDEBAR}--collapsed`);
    setIcon(toggleBtn, isCurrentlyCollapsed ? "chevron-right" : "chevron-left");

    toggleBtn.onclick = () => {
      const currentSidebar = this.parentView.containerEl.querySelector(`.${BEM.ORGS.SIDEBAR}`);
      if (currentSidebar) {
        const isCollapsed = currentSidebar.classList.toggle(`${BEM.ORGS.SIDEBAR}--collapsed`);
        // Smoothly animate the chevron switch native to Obsidian
        setIcon(toggleBtn, isCollapsed ? "chevron-right" : "chevron-left");
      }
    };

    // Board title justified left
    const titleEl = leftGroup.createEl("h2", { text: board.title });
    titleEl.setAttribute("contenteditable", "true");

    titleEl.addEventListener("drop", (e) => e.preventDefault());

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
  }

  private renderColumns(board: Board) {
    const boardContainer = this.container.createEl("div", { cls: `${BEM.TEMPS.VIEW}__container` });

    if (board.columns.length === 0) {
      board.columns.push({
        id: `col-locked-${Date.now()}`,
        title: "To do...",
        cards: []
      });
      this.plugin.saveSettings();
    }

    board.columns.forEach((col, index) => {
      const isLocked = index === 0;

      const columnComponent = new ColumnController(col, boardContainer, this.plugin, this.parentView, isLocked);
      columnComponent.render();

      const colEl = columnComponent.getColumnElement();

      if (!isLocked) {
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

    const ghostCol = boardContainer.createEl("div", { cls: `${BEM.ORGS.COLUMN} is-ghost` });
    const ghostInput = ghostCol.createEl("input", {
      type: "text",
      placeholder: "Type to add a new column...",
      cls: `${BEM.ORGS.COLUMN}__input`
    });

    ghostInput.addEventListener("drop", (e) => e.preventDefault());

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
