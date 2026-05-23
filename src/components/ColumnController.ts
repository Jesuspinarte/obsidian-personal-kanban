import { Card, Column } from "types/interfaces";
import PersonalKanbanPlugin from "main";
import KanbanView from "views/KanbanView";
import { BEM } from "utils/constants";
import CardController from "./CardController";

export default class ColumnController {
  private col: Column;
  private container: HTMLElement;
  private plugin: PersonalKanbanPlugin;
  private parentView: KanbanView;
  private columnEl: HTMLElement;

  constructor(col: Column, container: HTMLElement, plugin: PersonalKanbanPlugin, parentView: KanbanView) {
    this.col = col;
    this.container = container;
    this.plugin = plugin;
    this.parentView = parentView;
  }

  public getColumnElement(): HTMLElement {
    return this.columnEl;
  }

  public render() {
    this.columnEl = this.container.createEl("div", { cls: BEM.BLOCK.COLUMN });

    // --- DRAG & DROP EVENT LISTENERS ---
    this.columnEl.addEventListener("dragover", (e) => {
      e.preventDefault();
    });

    this.columnEl.addEventListener("drop", async (e) => {
      e.preventDefault();
      const data = JSON.parse(e.dataTransfer!.getData("text/plain"));

      if (data.type === "CARD") {
        const board = this.plugin.data.boards.find(b => b.id === this.parentView.activeBoardId);
        const fromCol = board?.columns.find(c => c.id === data.fromColId);
        const toCol = this.col;

        if (fromCol && toCol && fromCol.id !== toCol.id) {
          const cardIndex = fromCol.cards.findIndex(c => c.id === data.cardId);
          const [card] = fromCol.cards.splice(cardIndex, 1);
          toCol.cards.push(card);

          await this.plugin.saveSettings();
          this.parentView.render();
        }
      }
    });

    this.renderHeader(this.columnEl);
    this.renderCards(this.columnEl);
    this.renderFooter(this.columnEl);
  }

  private renderHeader(columnEl: HTMLElement) {
    const headerContainer = columnEl.createEl("div", { cls: `${BEM.BLOCK.COLUMN}__header` });

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
    const deleteBtn = controls.createEl("button", { text: "✕" });

    deleteBtn.onclick = async () => {
      if (confirm(`Delete column "${this.col.title}" and all its cards?`)) {
        const activeBoard = this.plugin.data.boards.find(b => b.id === this.parentView.activeBoardId);
        if (activeBoard) {
          activeBoard.columns = activeBoard.columns.filter(c => c.id !== this.col.id);
          await this.plugin.saveSettings();
          this.parentView.render();
        }
      }
    };
  }

  private renderCards(columnEl: HTMLElement) {
    this.col.cards.forEach(card => {
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
        tags: []
      });

      await this.plugin.saveSettings();
      this.parentView.render();
    };
  }
}
