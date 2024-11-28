import { App, Modal } from 'obsidian';
import { EpisodeListModal as ZKEpisodeListModal } from './zk';
import { EpisodeListModal as RevolutionsEpisodeListModal } from './revolutions';
import { EpisodeListModal as LatentSpaceEpisodeListModal } from './latentspace';
import { EpisodeListModal as FlirtingWithModelsEpisodeListModal } from './flirtingwithmodels';
import { EpisodeListModal as FiveFourEpisodeListModal } from './fivefour';

import Rhizomancer from '../main';

export class PodcastSelectionModal extends Modal {
    plugin: Rhizomancer;
    serverAddress: String;

    constructor(app: App, plugin: Rhizomancer, serverAddress: String) {
        super(app);
        this.plugin = plugin;
        this.serverAddress = serverAddress;
    }

    onOpen() {
        console.log(this.serverAddress)
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
            new RevolutionsEpisodeListModal(this.app, this.plugin, this.serverAddress).open();
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

        const fivefourButton = contentEl.createEl('button', { text: '5-4' });

        fivefourButton.onclick = () => {
            new FiveFourEpisodeListModal(this.app, this.plugin).open();
            this.close();
        };
    }
}
