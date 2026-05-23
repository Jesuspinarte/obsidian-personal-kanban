import { Column, Card } from "types/interfaces";
import PersonalKanbanPlugin from "main";
import KanbanView from "views/KanbanView";
import { BEM } from "utils/constants";
import CardModal from "modals/CardModal";
import { setIcon } from "obsidian";

export default class CardController {
  private card: Card;
  private column: Column;
  private container: HTMLElement;
  private plugin: PersonalKanbanPlugin;
  private parentView: KanbanView;

  constructor(card: Card, column: Column, container: HTMLElement, plugin: PersonalKanbanPlugin, parentView: KanbanView) {
    this.card = card;
    this.column = column;
    this.container = container;
    this.plugin = plugin;
    this.parentView = parentView;
  }

  public render() {
    const cardEl = this.container.createEl("div", { cls: BEM.MOLS.CARD });

    cardEl.setAttribute("draggable", "true");
    cardEl.setAttribute("data-card-id", this.card.id);

    cardEl.addEventListener("dragstart", (e) => {
      e.stopPropagation();
      cardEl.classList.add("is-dragging");

      e.dataTransfer?.setData("text/plain", JSON.stringify({
        type: "CARD",
        cardId: this.card.id,
        fromColId: this.column.id
      }));
      e.dataTransfer?.setData("application/x-kanban-card", "true");
    });

    cardEl.addEventListener("dragend", () => {
      cardEl.classList.remove("is-dragging");
    });

    const cardHeader = cardEl.createEl("div", { cls: `${BEM.MOLS.CARD}__header` });
    const cardTitle = cardHeader.createEl("h4", { text: this.card.title, cls: `${BEM.MOLS.CARD}__title` });

    cardTitle.onclick = (e) => {
      if ((e.target as HTMLElement).tagName === "BUTTON" || (e.target as HTMLElement).closest('svg')) return;
      // We now pass 'this.column' to the modal so it can delete itself
      new CardModal(this.plugin.app, this.card, this.column, this.plugin, this.parentView).open();
    };

    const deleteCardBtn = cardHeader.createEl("button", { cls: `${BEM.MOLS.CARD}__delete-btn` });
    setIcon(deleteCardBtn, "trash-2");

    deleteCardBtn.onclick = async () => {
      if (confirm(`Delete "${this.card.title}"?`)) {
        this.column.cards = this.column.cards.filter(c => c.id !== this.card.id);
        await this.plugin.saveSettings();
        this.parentView.render();
      }
    };

    if (this.card.tags && this.card.tags.length > 0) {
      const tagsContainer = cardEl.createEl("div", { cls: `${BEM.MOLS.CARD}__tags` });
      this.card.tags.forEach(tag => {
        tagsContainer.createEl("span", { text: tag, cls: `${BEM.MOLS.CARD}__tag` });
      });
    }
  }
}
