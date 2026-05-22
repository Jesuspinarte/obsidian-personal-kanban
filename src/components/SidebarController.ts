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
    this.parentView = parentView; // We pass the parent to trigger re-renders and access the active state
  }

  public render() {
    this.container.createEl("h3", { text: "Kanban Boards", cls: `${BEM.BLOCK.SIDEBAR}__title` });
    this.renderBoardList();
    this.renderAddBoardBtn();
  }

  /**
   * Renders the kanban boards list
   */
  private renderBoardList() {
    this.plugin.data.boards.forEach((board: Board) => {
      const btn = this.container.createEl("button", { text: board.title, cls: `${BEM.BLOCK.SIDEBAR}__btn` });

      // Highlights active board
      if (board.id === this.parentView.activeBoardId) {
        btn.classList.add(`${BEM.BLOCK.SIDEBAR}__btn--active`);
      }

      // Board changed by the OnClick event
      btn.onclick = () => {
        this.parentView.activeBoardId = board.id;
        this.parentView.render();
      };
    });
  }

  /**
   * Renders the Add Kanban Board button
   */
  private renderAddBoardBtn() {
    const addBoardBtn = this.container.createEl("button", { text: "+ Add Kanban Board", cls: `${BEM.BLOCK.SIDEBAR}__add-btn` });

    addBoardBtn.onclick = async () => {
      const newBoard: Board = {
        id: `board-${Date.now()}`,
        title: `Kanban Board #${this.plugin.data.boards.length + 1}`,
        columns: [] // Starts empty by default
      };

      this.plugin.data.boards.push(newBoard);
      this.parentView.activeBoardId = newBoard.id;

      await this.plugin.saveSettings();
      this.parentView.render();
    };
  }
}
