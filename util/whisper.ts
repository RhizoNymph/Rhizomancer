import { App, TFile, Notice } from 'obsidian';
import { Rhizomancer } from '../main';
const JSZip = require('jszip');

export async function compressAudioFile(arrayBuffer: ArrayBuffer, fileName: string): Promise<Blob> {
    // Create a new ZIP archive
    const zip = new JSZip();

    // Add the audio file to the ZIP
    zip.file(fileName, arrayBuffer);

    // Generate the ZIP file
    const zipBlob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: {
            level: 6 // Balanced compression level
        }
    });

    return zipBlob;
}

export async function transcribeAudio(
    app: App,
    fileOrPath: TFile | string,
    plugin: Rhizomancer
): Promise<string> {
    try {
        let file: TFile;
        if (typeof fileOrPath === 'string') {
            file = app.vault.getAbstractFileByPath(fileOrPath) as TFile;
            if (!file || !(file instanceof TFile)) {
                throw new Error(`No file found at path: ${fileOrPath}`);
            }
        } else {
            file = fileOrPath;
        }

        const arrayBuffer = await app.vault.readBinary(file);

        // Compress the audio file if it's larger than 10MB
        let blob: Blob;
        if (arrayBuffer.byteLength > 10 * 1024 * 1024) { // 10MB threshold
            new Notice('Compressing audio file...');
            blob = await compressAudioFile(arrayBuffer, file.name);
        } else {
            blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
        }

        const formData = new FormData();
        formData.append('file', blob, file.name + (blob.size !== arrayBuffer.byteLength ? '.zip' : ''));

        new Notice('Sending to server...');

        const response = await fetch(`${plugin.settings.serverAddress}/transcribe`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server responded with status ${response.status}: ${errorText}`);
        }

        const result = await response.json();

        if (!result.success || !result.transcription) {
            throw new Error('Server did not return expected data');
        }

        return result.transcription;
    } catch (error) {
        console.error('Error during audio transcription:', error);
        throw error;
    }
}

export async function transcribeCurrentFileAndSave(app: App, plugin: Rhizomancer): Promise<void> {
    const activeFile = app.workspace.getActiveFile();
    if (!activeFile) {
        new Notice('No active file');
        return;
    }

    try {
        // Check if the file is an audio file
        const audioExtensions = ['mp3', 'm4a', 'wav', 'ogg', 'aac'];
        if (!audioExtensions.includes(activeFile.extension.toLowerCase())) {
            new Notice('Current file is not a supported audio file');
            return;
        }

        new Notice('Starting transcription...');

        const transcription = await transcribeAudio(app, activeFile, plugin);

        // Create a new markdown file with the transcription
        const newFileName = `${activeFile.basename}_transcription.md`;
        const newFilePath = `${activeFile.parent.path}/${newFileName}`;

        await app.vault.create(newFilePath, transcription);

        new Notice(`Transcription saved as ${newFileName}`);
    } catch (error) {
        console.error('Error in transcribeCurrentFileAndSave:', error);
        new Notice(`Transcription failed: ${error.message}`);
    }
}
