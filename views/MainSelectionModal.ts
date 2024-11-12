import { App, Plugin, Modal, ItemView, TFile, TFolder, TAbstractFile, MarkdownView, WorkspaceLeaf } from 'obsidian';

import { PodcastSelectionModal } from '../podcasts/modal';
import { PaperSelectionModal } from '../papers/modal';
import { BookSelectionModal } from '../books/modal';

export class MainSelectionModal extends Modal {
    plugin: Rhizomancer;

    constructor(app: App, plugin: Rhizomancer) {
        super(app);
        this.plugin = plugin;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl('h1', { text: 'Select Content Type' });

        const podcastsButton = contentEl.createEl('button', { text: 'Podcasts' });
        podcastsButton.onclick = () => {
            new PodcastSelectionModal(this.app, this.plugin).open();
            this.close();
        };

        const papersButton = contentEl.createEl('button', { text: 'Papers' });
        papersButton.onclick = () => {
            new PaperSelectionModal(this.app, this.plugin).open();
            this.close();
        };

        const booksButton = contentEl.createEl('button', { text: 'Books' });
        booksButton.onclick = () => {
            new BookSelectionModal(this.app, this.plugin).open();
            this.close();
        };
    }
}
