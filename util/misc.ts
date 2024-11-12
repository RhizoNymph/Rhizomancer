import { Rhizomancer } from '../main'

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

export async function fetchDocumentMetadata(plugin: Rhizomancer) {
    try {
        const response = await fetch(`${plugin.settings.serverAddress}/get_document_metadata`);
        const metadata = await response.json();
        // Use the metadata as needed
        console.log(metadata);
    } catch (error) {
        console.error('Failed to fetch document metadata:', error);
    }
}
