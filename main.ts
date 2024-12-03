import {
	App,
	Setting,
	Notice,
	PluginSettingTab,
	Plugin,
	Modal,
	ItemView,
	TFile,
	TFolder,
	TAbstractFile,
	MarkdownView,
	WorkspaceLeaf,
} from "obsidian";
import { MainSelectionModal } from "./views/MainSelectionModal";
import { LLMView } from "./views/LLMView";
import { IndexNameModal } from "./views/IndexNameModal";
import { arrayBufferToBase64 } from "./util/misc";
import { extractPDFToMarkdown, extractAllPDFsToMarkdown } from "./util/pdf";
import { transcribeCurrentFileAndSave } from "./util/whisper";
import { addMissingEpisodes } from "./util/overview";

interface RhizomancerSettings {
	serverAddress: string;
}

const DEFAULT_SETTINGS: RhizomancerSettings = {
	serverAddress: "http://localhost:5000",
};

export const LLM_VIEW_TYPE = "llm-chat";

export default class Rhizomancer extends Plugin {
	categories: { id: string; name: string }[];
	indexedHashes: Set<string> = new Set();
	settings: RhizomancerSettings;

	async promptForIndexAndExecute(
		action: (indexName: string) => Promise<void>,
	) {
		new IndexNameModal(this.app, async (indexName) => {
			await action(indexName);
		}).open();
	}

	async indexCurrentFile(indexName: string) {
		const activeFile = this.app.workspace.getActiveFile();
		if (activeFile && activeFile.extension === "pdf") {
			await this.indexPDF(activeFile, indexName);
		} else {
			new Notice("The current file is not a PDF.");
		}
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData(),
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new RhizomancerSettingTab(this.app, this));

		console.log(this.settings.serverAddress);
		this.addCommand({
			id: "open-Rhizomancer-modal",
			name: "Open Rhizomancer Modal",
			hotkeys: [{ modifiers: ["Ctrl"], key: "R" }],
			callback: () => {
				new MainSelectionModal(
					this.app,
					this,
					this.settings.serverAddress,
				).open();
			},
		});
		this.addCommand({
			id: "extract-pdf-to-markdown",
			name: "Extract PDF to Markdown",
			callback: () => extractPDFToMarkdown(this.app, this),
		});
		this.addCommand({
			id: "extract-all-pdfs-to-markdown",
			name: "Extract All PDFs in Folder to Markdown",
			callback: () => extractAllPDFsToMarkdown(this.app, this),
		});
		this.addCommand({
			id: "transcribe-current-file",
			name: "Transcribe Current Audio File",
			callback: () => transcribeCurrentFileAndSave(this.app, this),
		});
		this.addRibbonIcon("dice", "Rhizomancer", () => {
			new MainSelectionModal(
				this.app,
				this,
				this.settings.serverAddress,
			).open();
		});

		this.registerView(
			LLM_VIEW_TYPE,
			(leaf: WorkspaceLeaf) => new LLMView(leaf, this),
		);

		this.addRibbonIcon("message-circle", "LLM Chat", () => {
			this.activateLLMView();
		});

		this.addCommand({
			id: "index-all-pdfs",
			name: "Index All PDFs in Vault",
			callback: () => {
				this.promptForIndexAndExecute((indexName) =>
					this.indexAllPDFs(indexName),
				);
			},
		});

		this.addCommand({
			id: "index-current-pdf",
			name: "Index Current PDF",
			checkCallback: (checking: boolean) => {
				const activeFile = this.app.workspace.getActiveFile();
				if (activeFile && activeFile.extension === "pdf") {
					if (!checking) {
						this.promptForIndexAndExecute((indexName) =>
							this.indexCurrentFile(indexName),
						);
					}
					return true;
				}
				return false;
			},
		});

		this.addCommand({
			id: "index-current-markdown",
			name: "Index Current Markdown File",
			checkCallback: (checking: boolean) => {
				const activeFile = this.app.workspace.getActiveFile();
				if (activeFile && activeFile.extension === "md") {
					if (!checking) {
						this.promptForIndexAndExecute((indexName) =>
							this.indexMarkdown(activeFile, indexName),
						);
					}
					return true;
				}
				return false;
			},
		});

		this.addCommand({
			id: "add-missing-episodes",
			name: "Add Missing Episodes to Overview",
			checkCallback: (checking: boolean) => {
				const activeFile = this.app.workspace.getActiveFile();
				if (activeFile && activeFile.extension === "md") {
					if (!checking) {
						addMissingEpisodes(this.app);
					}
					return true;
				}
				return false;
			},
		});
	}

	async activateLLMView() {
		const { workspace } = this.app;

		let leaf = workspace.getLeavesOfType(LLM_VIEW_TYPE)[0];

		if (!leaf) {
			leaf = workspace.getRightLeaf(false);
			await leaf.setViewState({ type: LLM_VIEW_TYPE, active: true });
		}

		workspace.revealLeaf(leaf);
	}

	async fetchIndexedHashes(): Promise<Set<string>> {
		try {
			const response = await fetch(
				`${this.settings.serverAddress}/get_indexed_hashes`,
			);
			const hashes = await response.json();
			console.log("Fetched indexed hashes:", hashes);
			return new Set(hashes);
		} catch (error) {
			console.error("Failed to fetch indexed hashes:", error);
			return new Set();
		}
	}

	async indexAllPDFs() {
		const files = this.app.vault.getFiles();
		for (const file of files) {
			if (file.extension === "pdf") {
				await this.indexPDF(file);
			}
		}
	}

	async indexPDF(file: TFile, indexName: string = "universal") {
		console.log(`Attempting to index file: ${file.name}`);

		const fileContent = await this.app.vault.readBinary(file);
		const base64Content = arrayBufferToBase64(fileContent);

		const fileHash = await this.calculateSHA256(fileContent);
		console.log(`Calculated hash for ${file.name}: ${fileHash}`);

		const indexedHashes = await this.fetchIndexedHashes();
		console.log(`Fetched ${indexedHashes.size} indexed hashes`);

		if (indexedHashes.has(fileHash)) {
			console.log(
				`File ${file.name} found in indexed hashes. Not indexing.`,
			);
			return;
		}

		console.log(
			`File ${file.name} not found in indexed hashes. Proceeding with indexing.`,
		);

		try {
			const response = await fetch(
				`${this.settings.serverAddress}/indexPDF`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						filename: file.name,
						pdf_content: base64Content,
						index_name: indexName,
					}),
				},
			);

			const result = await response.json();
			console.log(`Server response for ${file.name}:`, result);

			if (response.ok) {
				console.log(`Successfully indexed ${file.name}`);
				new Notice(`Successfully indexed ${file.name}`);
			} else {
				console.error(
					`Failed to index ${file.name}. Server responded with status ${response.status}`,
				);
				new Notice(
					`Failed to index ${file.name}. Server responded with status ${response.status}`,
				);
			}
		} catch (error) {
			console.error(`Error while indexing PDF ${file.name}:`, error);
			new Notice(`Error while indexing PDF ${file.name}:`);
		}
	}

	async indexMarkdown(file: TFile, indexName: string = "universal") {
		const content = await this.app.vault.read(file);
		try {
			const response = await fetch(
				`${this.settings.serverAddress}/indexText`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						filename: file.name,
						text: content,
						index_name: indexName,
					}),
				},
			);

			const result = await response.json();
			console.log(result.message);

			if (response.ok) {
				new Notice(`Markdown indexed successfully to ${indexName}`);
			}
		} catch (error) {
			console.error(
				`Failed to index markdown ${file.name} to ${indexName}:`,
				error,
			);
			new Notice("Failed to index markdown");
		}
	}

	async calculateSHA256(arrayBuffer: ArrayBuffer): Promise<string> {
		const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
	}
}

class RhizomancerSettingTab extends PluginSettingTab {
	plugin: Rhizomancer;

	constructor(app: App, plugin: Rhizomancer) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl("h2", { text: "Rhizomancer Settings" });

		new Setting(containerEl)
			.setName("Server Address")
			.setDesc(
				"The address of your Flask server (including protocol and port)",
			)
			.addText((text) =>
				text
					.setPlaceholder("http://localhost:5000")
					.setValue(this.plugin.settings.serverAddress)
					.onChange(async (value) => {
						this.plugin.settings.serverAddress = value;
						await this.plugin.saveSettings();
					}),
			);
	}
}
