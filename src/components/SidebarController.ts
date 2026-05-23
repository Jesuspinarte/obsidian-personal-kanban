import PersonalKanbanPlugin from "main";
import { Board } from "types/interfaces";
import { BEM } from "utils/constants";
import KanbanView from "views/KanbanView";

export default class SidebarController {
  private container: HTMLElement;
  private plugin: PersonalKanbanPlugin;
  private parentView: KanbanView;

  constructor(container: HTMLElement, plugin: PersonalKanbanPlugin, parentView: KanbanView) {
    this.container = container;
    this.plugin = plugin;
    this.parentView = parentView;
  }

  public render() {
    this.renderSettingsToggle();
    this.container.createEl("h3", { text: "Kanban Boards", cls: `${BEM.BLOCK.SIDEBAR}__title` });
    this.renderBoardInput();
    this.renderBoardList();
  }

  private renderSettingsToggle() {
    const toggleContainer = this.container.createEl("div", { cls: "b-sidebar__toggle-container" });
    toggleContainer.createEl("label", { text: "Auto-open card modal" });
    const toggle = toggleContainer.createEl("input", { type: "checkbox" });

    // Initialize settings if they don't exist
    if (!this.plugin.data.settings) {
      this.plugin.data.settings = { openModalOnCreate: false };
    }

    toggle.checked = this.plugin.data.settings.openModalOnCreate;

    toggle.onchange = async () => {
      if (this.plugin.data.settings) {
        this.plugin.data.settings.openModalOnCreate = toggle.checked;
        await this.plugin.saveSettings();
      }
    };
  }

  private renderBoardInput() {
    const input = this.container.createEl("input", {
      type: "text",
      placeholder: "Type to add board...",
      cls: "b-sidebar__input"
    });

    input.addEventListener("keydown", async (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const title = input.value.trim();
        if (title !== "") {
          const newBoard: Board = {
            id: `board-${Date.now()}`,
            title: title,
            columns: [{ id: `col-backlog-${Date.now()}`, title: "Backlog", cards: [] }]
          };
          this.plugin.data.boards.push(newBoard);
          this.parentView.activeBoardId = newBoard.id;
          await this.plugin.saveSettings();
          this.parentView.render();
        }
      }
    });
  }

  private renderBoardList() {
    this.plugin.data.boards.forEach((board, index) => {
      const btn = this.container.createEl("button", { text: board.title, cls: `${BEM.BLOCK.SIDEBAR}__btn` });
      btn.setAttribute("draggable", "true");

      btn.addEventListener("dragstart", (e) => {
        e.dataTransfer!.setData("text/plain", index.toString());
        btn.classList.add("is-dragging");
      });

      btn.addEventListener("dragend", () => {
        btn.classList.remove("is-dragging");
      });

      btn.addEventListener("dragover", (e) => {
        e.preventDefault();
        btn.classList.add("is-drop-target-top");
      });

      btn.addEventListener("dragleave", () => {
        btn.classList.remove("is-drop-target-top");
      });

      btn.addEventListener("drop", async (e) => {
        e.preventDefault();
        btn.classList.remove("is-drop-target-top");

        const draggedIndex = parseInt(e.dataTransfer!.getData("text/plain"));
        const targetIndex = index;

        if (draggedIndex !== targetIndex) {
          const boards = this.plugin.data.boards;
          const [removed] = boards.splice(draggedIndex, 1);
          boards.splice(targetIndex, 0, removed);

          await this.plugin.saveSettings();
          this.parentView.render();
        }
      });

      if (board.id === this.parentView.activeBoardId) {
        btn.classList.add(`${BEM.BLOCK.SIDEBAR}__btn--active`);
      }

      btn.onclick = () => {
        this.parentView.activeBoardId = board.id;
        this.parentView.render();
      };
    });
  }
}
