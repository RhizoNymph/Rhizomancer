import { App, Modal } from 'obsidian';
import { EpisodeListModal as ZKEpisodeListModal } from './zk';
import { EpisodeListModal as RevolutionsEpisodeListModal } from './revolutions';
import Rhizomancer from '../main';

export class PodcastSelectionModal extends Modal {
    plugin: Rhizomancer;

    constructor(app: App, plugin: Rhizomancer) {
        super(app);
        this.plugin = plugin;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl('h1', { text: 'Select Podcast Source' });

        const zkButton = contentEl.createEl('button', { text: 'ZK Podcast' });
        zkButton.onclick = () => {
            new ZKEpisodeListModal(this.app, this.plugin).open();
            this.close();
        };
        const revButton = contentEl.createEl('button', { text: 'Revolutions' });
        revButton.onclick = () => {
            new RevolutionsEpisodeListModal(this.app, this.plugin).open();
            this.close();
        };

    }
}
