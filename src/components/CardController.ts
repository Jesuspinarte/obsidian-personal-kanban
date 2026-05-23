import { Column, Card } from "types/interfaces";
import PersonalKanbanPlugin from "main";
import KanbanView from "views/KanbanView";
import { BEM } from "utils/constants";
import CardModal from "modals/CardModal";

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
    const cardEl = this.container.createEl("div", { cls: BEM.BLOCK.CARD });

    cardEl.setAttribute("draggable", "true");
    cardEl.setAttribute("data-card-id", this.card.id);

    // --- DRAG START ---
    cardEl.addEventListener("dragstart", (e) => {
      e.stopPropagation(); // CRITICAL: Prevents the column from catching this drag event

      cardEl.classList.add("is-dragging");

      e.dataTransfer?.setData("text/plain", JSON.stringify({
        type: "CARD",
        cardId: this.card.id,
        fromColId: this.column.id
      }));

      // Custom signature so the column knows we are dragging a CARD, not a COLUMN
      e.dataTransfer?.setData("application/x-kanban-card", "true");
    });

    // --- DRAG END ---
    cardEl.addEventListener("dragend", () => {
      cardEl.classList.remove("is-dragging");
    });

    // --- UI RENDERING ---
    const cardHeader = cardEl.createEl("div", { cls: `${BEM.BLOCK.CARD}__header` });
    const cardTitle = cardHeader.createEl("h4", { text: this.card.title, cls: `${BEM.BLOCK.CARD}__title` });

    cardTitle.style.cursor = "pointer";
    cardTitle.onclick = (e) => {
      if ((e.target as HTMLElement).tagName === "BUTTON") return;
      new CardModal(this.plugin.app, this.card, this.plugin, this.parentView).open();
    };

    const deleteCardBtn = cardHeader.createEl("button", { text: "✕", cls: "a-btn--icon delete" });
    deleteCardBtn.onclick = async () => {
      this.column.cards = this.column.cards.filter(c => c.id !== this.card.id);
      await this.plugin.saveSettings();
      this.parentView.render();
    };

    if (this.card.tags && this.card.tags.length > 0) {
      const tagsContainer = cardEl.createEl("div", { cls: `${BEM.BLOCK.CARD}__tags` });
      this.card.tags.forEach(tag => {
        tagsContainer.createEl("span", { text: tag, cls: `${BEM.BLOCK.CARD}__tag` });
      });
    }
  }
}
