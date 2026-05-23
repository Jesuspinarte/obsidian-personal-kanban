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

    // --- CENTRALIZED DRAG & DROP FOR CARDS ---
    this.columnEl.addEventListener("dragover", (e) => {
      // Only react if what is flying over is a CARD
      if (!e.dataTransfer?.types.includes("application/x-kanban-card")) return;

      e.preventDefault();
      e.stopPropagation(); // Stop bubbling to the board
      this.updateDropIndicator(e.clientY);
    });

    this.columnEl.addEventListener("dragleave", () => {
      this.clearAllIndicators();
    });

    this.columnEl.addEventListener("drop", async (e) => {
      // Ignore if it's not a CARD
      if (!e.dataTransfer?.types.includes("application/x-kanban-card")) return;

      e.preventDefault();
      e.stopPropagation(); // Stop bubbling to the board
      this.clearAllIndicators();

      const dataStr = e.dataTransfer!.getData("text/plain");
      if (!dataStr) return;

      const data = JSON.parse(dataStr);

      if (data.type === "CARD") {
        const board = this.plugin.data.boards.find(b => b.id === this.parentView.activeBoardId);
        if (!board) return;

        const fromCol = board.columns.find(c => c.id === data.fromColId);
        const toCol = this.col;

        if (fromCol && toCol) {
          const insertIndex = this.getInsertIndex(e.clientY);

          const draggedIndex = fromCol.cards.findIndex(c => c.id === data.cardId);
          if (draggedIndex === -1) return;

          // 1. Remove from source array
          const [draggedCard] = fromCol.cards.splice(draggedIndex, 1);

          // 2. Insert into target array at specific position
          toCol.cards.splice(insertIndex, 0, draggedCard);

          await this.plugin.saveSettings();
          this.parentView.render();
        }
      }
    });

    this.renderHeader(this.columnEl);
    this.renderCards(this.columnEl);
    this.renderFooter(this.columnEl);
  }

  //#region D&D Math & Logic
  private clearAllIndicators() {
    const cards = this.columnEl.querySelectorAll(`.${BEM.BLOCK.CARD}`);
    cards.forEach(card => {
      (card as HTMLElement).style.borderTop = "";
      (card as HTMLElement).style.borderBottom = "";
    });
  }

  private updateDropIndicator(mouseY: number) {
    this.clearAllIndicators();

    const cardElements = Array.from(this.columnEl.querySelectorAll(`.${BEM.BLOCK.CARD}:not(.is-dragging)`));
    let closestOffset = Number.NEGATIVE_INFINITY;
    let closestChild: HTMLElement | null = null;

    cardElements.forEach((child) => {
      const box = (child as HTMLElement).getBoundingClientRect();
      const offset = mouseY - box.top - box.height / 2;

      if (offset < 0 && offset > closestOffset) {
        closestOffset = offset;
        closestChild = child as HTMLElement;
      }
    });

    if (closestChild) {
      closestChild.style.borderTop = "2px solid var(--interactive-accent)";
    } else {
      const lastCard = cardElements[cardElements.length - 1] as HTMLElement;
      if (lastCard) {
        lastCard.style.borderBottom = "2px solid var(--interactive-accent)";
      }
    }
  }

  private getInsertIndex(mouseY: number): number {
    const cardElements = Array.from(this.columnEl.querySelectorAll(`.${BEM.BLOCK.CARD}:not(.is-dragging)`));
    let closestOffset = Number.NEGATIVE_INFINITY;
    let closestIndex = cardElements.length;

    cardElements.forEach((child, index) => {
      const box = (child as HTMLElement).getBoundingClientRect();
      const offset = mouseY - box.top - box.height / 2;

      if (offset < 0 && offset > closestOffset) {
        closestOffset = offset;
        closestIndex = index;
      }
    });

    return closestIndex;
  }
  //#endregion

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
