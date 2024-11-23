import { App, Modal } from 'obsidian';
import { EpisodeListModal as ZKEpisodeListModal } from './zk';
import { EpisodeListModal as RevolutionsEpisodeListModal } from './revolutions';
import { EpisodeListModal as LatentSpaceEpisodeListModal } from './latentspace';
import { EpisodeListModal as FlirtingWithModelsEpisodeListModal } from './flirtingwithmodels';

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
        const latentButton = contentEl.createEl('button', { text: 'Latent Space' });
        latentButton.onclick = () => {
            new LatentSpaceEpisodeListModal(this.app, this.plugin).open();
            this.close();
        };
        const fwmButton = contentEl.createEl('button', { text: 'Flirting with Models' });

        fwmButton.onclick = () => {
            new FlirtingWithModelsEpisodeListModal(this.app, this.plugin).open();
            this.close();
        };
    }
}
