import PersonalKanbanPlugin from "main";
import { Board } from "types/interfaces";
import { BEM } from "utils/constants";
import KanbanView from "views/KanbanView";
import { setIcon } from "obsidian";
import ConfirmModal from "modals/ConfirmModal"; // Añadida la importación

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
    this.container.createEl("h3", { text: "Kanban Boards", cls: `${BEM.ORGS.SIDEBAR}__title` });
    this.renderBoardInput();
    this.renderBoardList();
  }

  private renderSettingsToggle() {
    const toggleContainer = this.container.createEl("div", { cls: "m-board-item-list__toggle-container" });
    toggleContainer.createEl("span", { text: "Auto-open card modal" });

    // --- NATIVE OBSIDIAN TOGGLE ---
    const toggleBtn = toggleContainer.createEl("div", { cls: "checkbox-container" });

    if (!this.plugin.data.settings) {
      this.plugin.data.settings = { openModalOnCreate: false };
    }

    if (this.plugin.data.settings.openModalOnCreate) {
      toggleBtn.classList.add("is-enabled");
    }

    toggleBtn.onclick = async () => {
      const isEnabled = toggleBtn.classList.toggle("is-enabled");
      if (this.plugin.data.settings) {
        this.plugin.data.settings.openModalOnCreate = isEnabled;
        await this.plugin.saveSettings();
      }
    };
  }

  private renderBoardInput() {
    const input = this.container.createEl("input", {
      type: "text",
      placeholder: "Type to add board...",
      cls: "m-board-item-list__input",
      attr: { id: "kanban-new-board-input" }
    });

    input.addEventListener("drop", (e) => e.preventDefault());

    input.addEventListener("keydown", async (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const title = input.value.trim();
        if (title !== "") {
          const newBoard: Board = {
            id: `board-${Date.now()}`,
            title: title,
            columns: [{ id: `col-locked-${Date.now()}`, title: "To do...", cards: [] }]
          };
          this.plugin.data.boards.push(newBoard);
          this.parentView.activeBoardId = newBoard.id;
          await this.plugin.saveSettings();
          this.parentView.render();

          setTimeout(() => {
            const el = document.getElementById("kanban-new-board-input");
            if (el) el.focus();
          }, 10);
        }
      }
    });
  }

  private renderBoardList() {
    this.plugin.data.boards.forEach((board, index) => {
      const itemEl = this.container.createEl("div", { cls: "m-board-item-list__item" });
      itemEl.setAttribute("draggable", "true");

      const titleEl = itemEl.createEl("span", { text: board.title, cls: "m-board-item-list__item-title" });

      const deleteBtn = itemEl.createEl("button", { cls: "m-board-item-list__delete-btn" });
      setIcon(deleteBtn, "trash-2");

      // --- CUSTOM CONFIRM MODAL ---
      deleteBtn.onclick = (e) => {
        e.stopPropagation();
        new ConfirmModal(this.plugin.app, `Are you sure you want to delete "${board.title}"?`, async () => {
          this.plugin.data.boards = this.plugin.data.boards.filter(b => b.id !== board.id);

          if (this.parentView.activeBoardId === board.id) {
            this.parentView.activeBoardId = this.plugin.data.boards.length > 0 ? this.plugin.data.boards[0]?.id : undefined;
          }

          await this.plugin.saveSettings();
          this.parentView.render();
        }).open();
      };

      titleEl.onclick = () => {
        this.parentView.activeBoardId = board.id;
        this.parentView.render();
      };

      if (board.id === this.parentView.activeBoardId) {
        itemEl.classList.add("m-board-item-list__item--active");
      }

      itemEl.addEventListener("dragstart", (e) => {
        e.dataTransfer!.setData("text/plain", index.toString());
        itemEl.classList.add("is-dragging");
      });

      itemEl.addEventListener("dragend", () => {
        itemEl.classList.remove("is-dragging");
      });

      itemEl.addEventListener("dragover", (e) => {
        e.preventDefault();
        itemEl.classList.add("is-drop-target-top");
      });

      itemEl.addEventListener("dragleave", () => {
        itemEl.classList.remove("is-drop-target-top");
      });

      itemEl.addEventListener("drop", async (e) => {
        e.preventDefault();
        itemEl.classList.remove("is-drop-target-top");

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
    });
  }
}
