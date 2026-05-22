import { DEFAULT_DATA } from 'data/data';
import { Plugin, WorkspaceLeaf } from 'obsidian';
import { PluginData } from 'types/interfaces';
import { PERSONAL_KANBAN_VIEW_TYPE } from 'utils/constants';
import KanbanView from 'views/KanbanView';

// Remember to rename these classes and interfaces!

export default class PersonalKanbanPlugin extends Plugin {
	data: PluginData; // ! WHY??

	async onload(): Promise<void> {
		await this.loadSettings();

		// Rigisters the view
		this.registerView(
			PERSONAL_KANBAN_VIEW_TYPE,
			(leaf) => new KanbanView(leaf, this)
		);

		this.addCommand({
			id: "open-personal-kanban-dashboard",
			name: "Open Personal Kanban Dashboard",
			callback: () => {
				this.activateView();
			}
		});
	}

	async loadSettings() {
		this.data = Object.assign({}, DEFAULT_DATA, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.data);
	}

	// Aux function to open the kanban tab
	async activateView() {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | undefined = undefined;
		const leaves = workspace.getLeavesOfType(PERSONAL_KANBAN_VIEW_TYPE);

		// If there's an opened kanban we focus it
		if (leaves.length > 0) leaf = leaves[0];
		else {
			// Else, we open a new tab
			leaf = workspace.getLeaf('tab');
			await leaf.setViewState({ type: PERSONAL_KANBAN_VIEW_TYPE, active: true });
		}

		if (leaf) workspace.revealLeaf(leaf);
	}
}
