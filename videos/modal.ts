import { App, Modal } from 'obsidian';
import { YtPlaylistModal } from './yt';

import Rhizomancer from '../main';

export class VideoSelectionModal extends Modal {
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
        contentEl.createEl('h1', { text: 'Select Video Source' });

        const ytButton = contentEl.createEl('button', { text: 'YouTube Playlist' });
        ytButton.onclick = () => {
            new YtPlaylistModal(this.app, this.plugin).open();
            this.close();
        };

    }
}
