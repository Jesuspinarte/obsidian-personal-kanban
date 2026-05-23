import { Card } from "types/interfaces";
import PersonalKanbanPlugin from "main";
import KanbanView from "views/KanbanView";

export default class CardTransferController {
  private card: Card;
  private container: HTMLElement;
  private plugin: PersonalKanbanPlugin;
  private parentView: KanbanView;
  private onTransferComplete: () => void;

  constructor(card: Card, container: HTMLElement, plugin: PersonalKanbanPlugin, parentView: KanbanView, onTransferComplete: () => void) {
    this.card = card;
    this.container = container;
    this.plugin = plugin;
    this.parentView = parentView;
    this.onTransferComplete = onTransferComplete; // Callback to close the modal
  }

  public render() {
    const moveSection = this.container.createEl("div", { cls: "o-card-modal__move-section" });
    moveSection.createEl("h4", { text: "Send to another Board", cls: "margin-bottom-sm" });

    const controlsDiv = moveSection.createEl("div", { cls: "o-card-modal__controls" });

    const boardSelect = controlsDiv.createEl("select", { cls: "o-card-modal__dropdown" });
    boardSelect.createEl("option", { text: "-- Select Target Board --", value: "" });

    this.plugin.data.boards.forEach(b => {
      if (b.id !== this.parentView.activeBoardId) {
        boardSelect.createEl("option", { text: b.title, value: b.id });
      }
    });

    const colSelect = controlsDiv.createEl("select", { cls: "o-card-modal__dropdown is-hidden" });
    const moveBtn = controlsDiv.createEl("button", { text: "Send Card", cls: "mod-cta o-card-modal__btn is-hidden" });

    boardSelect.onchange = () => {
      const targetId = boardSelect.value;
      if (!targetId) {
        colSelect.classList.add("is-hidden");
        moveBtn.classList.add("is-hidden");
        return;
      }

      const targetBoard = this.plugin.data.boards.find(b => b.id === targetId);

      colSelect.empty();
      targetBoard?.columns.forEach(c => {
        colSelect.createEl("option", { text: c.title, value: c.id });
      });

      colSelect.classList.remove("is-hidden");
      moveBtn.classList.remove("is-hidden");
    };

    moveBtn.onclick = async () => {
      const targetBoardId = boardSelect.value;
      const targetColId = colSelect.value;

      if (!targetBoardId || !targetColId) return;

      const currentBoard = this.plugin.data.boards.find(b => b.id === this.parentView.activeBoardId);
      if (currentBoard) {
        for (const col of currentBoard.columns) {
          const idx = col.cards.findIndex(c => c.id === this.card.id);
          if (idx > -1) {
            col.cards.splice(idx, 1);
            break;
          }
        }
      }

      const targetBoard = this.plugin.data.boards.find(b => b.id === targetBoardId);
      const targetCol = targetBoard?.columns.find(c => c.id === targetColId);
      if (targetCol) {
        targetCol.cards.push(this.card);
      }

      await this.plugin.saveSettings();
      this.onTransferComplete();
    };
  }
}
