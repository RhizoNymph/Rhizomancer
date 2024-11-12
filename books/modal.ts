import { App, Modal, Notice } from 'obsidian';
import { LibgenSearchModal } from './libgen';

import Rhizomancer from '../main';

export class BookSelectionModal extends Modal {
    plugin: Rhizomancer;

    constructor(app: App, plugin: Rhizomancer) {
        super(app);
        this.plugin = plugin;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl('h1', { text: 'Select Book Source' });

        const arxivButton = contentEl.createEl('button', { text: 'Libgen' });
        arxivButton.onclick = () => {
            new LibgenSearchModal(this.app, this.plugin).open();
            this.close();
        };
    }
}
