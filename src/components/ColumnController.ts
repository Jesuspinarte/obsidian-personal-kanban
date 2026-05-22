// src/components/ColumnComponent.ts
import { Column } from "types/interfaces";
import PersonalKanbanPlugin from "main";
import KanbanView from "views/KanbanView";
import { BEM } from "utils/constants";
import CardController from "./CardController";

export default class ColumnController {
  private col: Column;
  private container: HTMLElement;
  private plugin: PersonalKanbanPlugin;
  private parentView: KanbanView;

  constructor(col: Column, container: HTMLElement, plugin: PersonalKanbanPlugin, parentView: KanbanView) {
    this.col = col;
    this.container = container;
    this.plugin = plugin;
    this.parentView = parentView;
  }

  public render() {
    const columnEl = this.container.createEl("div", { cls: BEM.BLOCK.COLUMN });

    this.renderHeader(columnEl);
    this.renderCards(columnEl);
    this.renderFooter(columnEl);
  }

  //#region Render Methods
  /**
   * Renders the column title and controls
   * @param columnEl Column container
   */
  private renderHeader(columnEl: HTMLElement) {
    const headerContainer = columnEl.createEl("div", { cls: `${BEM.BLOCK.COLUMN}__header` });

    // Makes the title editable
    const titleEl = headerContainer.createEl("h3", { text: this.col.title, cls: `${BEM.BLOCK.COLUMN}__title` });
    titleEl.setAttribute("contenteditable", "true");

    titleEl.addEventListener("blur", async () => {
      const newTitle = titleEl.innerText.trim();
      if (newTitle !== "") {
        this.col.title = newTitle;
        await this.plugin.saveSettings();
        this.parentView.render();
      } else {
        titleEl.innerText = this.col.title;
      }
    });

    titleEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        titleEl.blur();
      }
    });

    const controls = headerContainer.createEl("div");

    // Delete Column
    const deleteBtn = controls.createEl("button", { text: "✕" });

    deleteBtn.onclick = async () => {
      if (confirm(`Delete column "${this.col.title}" and all its cards?`)) {
        // Find columnb and remove it
        const activeBoard = this.plugin.data.boards.find(b => b.id === this.parentView.activeBoardId);
        if (activeBoard) {
          activeBoard.columns = activeBoard.columns.filter(c => c.id !== this.col.id);
          await this.plugin.saveSettings();
          this.parentView.render();
        }
      }
    };
  }

  /**
     * Renders the cards inside the column
     * @param columnEl Column container
     */
  private renderCards(columnEl: HTMLElement) {
    this.col.cards.forEach(card => {
      // Instantiates the new Card Component
      const cardComponent = new CardController(card, this.col, columnEl, this.plugin, this.parentView);
      cardComponent.render();
    });
  }

  private renderFooter(columnEl: HTMLElement) {
    const addCardBtn = columnEl.createEl("button", { text: "+ Add Card", cls: `${BEM.BLOCK.COLUMN}__add-btn` });

    addCardBtn.onclick = async () => {
      this.col.cards.push({
        id: `card-${Date.now()}`,
        title: "New Task",
        description: "",
        notes: "",
        tags: []
      });

      await this.plugin.saveSettings();
      this.parentView.render();
    }
  }
  //#endregion
}
