// KanbanView.ts
import PersonalKanbanPlugin from "main";
import { ItemView, WorkspaceLeaf } from "obsidian";
import { BEM, PERSONAL_KANBAN_VIEW_TYPE } from "utils/constants";
import SidebarController from "components/SidebarController";
import BoardController from "components/BoardController";

export default class KanbanView extends ItemView {
  // Acts as our global state provider (similar to React Context).
  // It allows child components to read data and call plugin.saveSettings()
  plugin: PersonalKanbanPlugin;

  // App-level state
  activeBoardId: string | undefined = undefined;

  constructor(leaf: WorkspaceLeaf, plugin: PersonalKanbanPlugin) {
    super(leaf);
    this.plugin = plugin;

    // Selects the first board by default if it exists
    if (this.plugin.data.boards.length > 0) {
      this.activeBoardId = this.plugin.data.boards[0]?.id;
    }
  }

  // Internal view ID
  getViewType() { return PERSONAL_KANBAN_VIEW_TYPE };

  // Name to be displayed on the tab
  getDisplayText() { return "Personal Kanban" };

  protected onOpen(): Promise<void> | void { this.render(); }

  render() {
    const container = this.containerEl.children[1];
    if (!container) return; // Guard clause

    container.empty();

    // Main layout wrapper
    const wrapper = container.createEl("div", { cls: BEM.PAGS.KANBAN });

    // 1. Sidebar Component
    const sidebarContainer = wrapper.createEl("div", { cls: BEM.ORGS.SIDEBAR });
    const sidebarController = new SidebarController(sidebarContainer, this.plugin, this);
    sidebarController.render();

    // 2. Main Board Component
    const mainContainer = wrapper.createEl("div", { cls: BEM.TEMPS.VIEW });
    const boardController = new BoardController(mainContainer, this.plugin, this);
    boardController.render();
  }
}
