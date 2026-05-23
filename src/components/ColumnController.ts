import { Card, Column } from "types/interfaces";
import PersonalKanbanPlugin from "main";
import KanbanView from "views/KanbanView";
import { BEM } from "utils/constants";
import CardController from "./CardController";
import CardModal from "modals/CardModal";

export default class ColumnController {
  private col: Column;
  private container: HTMLElement;
  private plugin: PersonalKanbanPlugin;
  private parentView: KanbanView;
  private columnEl: HTMLElement;
  private isLocked: boolean;

  constructor(col: Column, container: HTMLElement, plugin: PersonalKanbanPlugin, parentView: KanbanView, isLocked: boolean = false) {
    this.col = col;
    this.container = container;
    this.plugin = plugin;
    this.parentView = parentView;
    this.isLocked = isLocked;
  }

  public getColumnElement(): HTMLElement {
    return this.columnEl;
  }

  public render() {
    this.columnEl = this.container.createEl("div", { cls: BEM.BLOCK.COLUMN });

    this.columnEl.addEventListener("dragover", (e) => {
      if (!e.dataTransfer?.types.includes("application/x-kanban-card")) return;
      e.preventDefault();
      e.stopPropagation();
      this.updateDropIndicator(e.clientY);
    });

    this.columnEl.addEventListener("dragleave", () => {
      this.clearAllIndicators();
    });

    this.columnEl.addEventListener("drop", async (e) => {
      if (!e.dataTransfer?.types.includes("application/x-kanban-card")) return;
      e.preventDefault();
      e.stopPropagation();
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

          const [draggedCard] = fromCol.cards.splice(draggedIndex, 1);
          toCol.cards.splice(insertIndex, 0, draggedCard);

          await this.plugin.saveSettings();
          this.parentView.render();
        }
      }
    });

    this.renderHeader(this.columnEl);
    this.renderCardCreationInput(this.columnEl);
    this.renderCards(this.columnEl);
  }

  //#region D&D Math & Logic
  private clearAllIndicators() {
    const cards = this.columnEl.querySelectorAll(`.${BEM.BLOCK.CARD}`);
    cards.forEach(card => {
      card.classList.remove("is-drop-target-top", "is-drop-target-bottom");
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
      closestChild.classList.add("is-drop-target-top");
    } else {
      const lastCard = cardElements[cardElements.length - 1] as HTMLElement;
      if (lastCard) {
        lastCard.classList.add("is-drop-target-bottom");
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

    // Prevents drag and drop payload from pasting into the title
    titleEl.addEventListener("drop", (e) => e.preventDefault());

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

    const controls = headerContainer.createEl("div", { style: "display: flex; gap: 5px; align-items: center;" });

    if (!this.isLocked) {
      const moveSelect = controls.createEl("select", { cls: "dropdown" });
      moveSelect.createEl("option", { text: "Move", value: "" });

      this.plugin.data.boards.forEach(b => {
        if (b.id !== this.parentView.activeBoardId) {
          moveSelect.createEl("option", { text: b.title, value: b.id });
        }
      });

      moveSelect.onchange = async () => {
        const targetId = moveSelect.value;
        if (!targetId) return;

        const targetBoard = this.plugin.data.boards.find(b => b.id === targetId);
        const activeBoard = this.plugin.data.boards.find(b => b.id === this.parentView.activeBoardId);

        if (activeBoard && targetBoard) {
          activeBoard.columns = activeBoard.columns.filter(c => c.id !== this.col.id);
          targetBoard.columns.push(this.col);
          await this.plugin.saveSettings();
          this.parentView.render();
        }
      };

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
  }

  private renderCardCreationInput(columnEl: HTMLElement) {
    const inputContainer = columnEl.createEl("div", { cls: `${BEM.BLOCK.COLUMN}__input-container` });
    const input = inputContainer.createEl("input", {
      type: "text",
      placeholder: "Type to add a new task...",
      cls: `${BEM.BLOCK.COLUMN}__input`
    });

    // Prevents drag and drop payload from pasting into the input
    input.addEventListener("drop", (e) => e.preventDefault());

    input.addEventListener("keydown", async (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const title = input.value.trim();
        if (title !== "") {
          const newCard: Card = {
            id: `card-${Date.now()}`,
            title: title,
            description: "",
            tags: []
          };
          this.col.cards.push(newCard);
          await this.plugin.saveSettings();

          if (this.plugin.data.settings?.openModalOnCreate) {
            this.parentView.render();
            new CardModal(this.plugin.app, newCard, this.plugin, this.parentView).open();
          } else {
            this.parentView.render();
          }
        }
      }
    });
  }

  private renderCards(columnEl: HTMLElement) {
    this.col.cards.forEach(card => {
      const cardComponent = new CardController(card, this.col, columnEl, this.plugin, this.parentView);
      cardComponent.render();
    });
  }
}
