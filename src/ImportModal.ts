import { App } from 'obsidian';
import { ReferenceLinker } from './ReferenceLinker';
import { PDFManager } from './pdf/PDFManager';
import { formatAnnotations } from './utils';


export class ImportModal {
    app: App;
    plugin: ReferenceLinker;
    pdfManager: PDFManager

    constructor(app: App, plugin: ReferenceLinker) {
        this.app = app;
        this.plugin = plugin;
        this.pdfManager = new PDFManager(plugin);
    }

    async open(): Promise<void> {
        const editor = this.app.workspace.activeEditor?.editor
        const currentFile = this.app.workspace.getActiveFile()
        if (currentFile === null || editor === undefined) return;

        let basename = currentFile.basename
        const metadata = this.app.metadataCache.getFileCache(currentFile);
        if (metadata != null && metadata.frontmatter != undefined && "pdf" in metadata.frontmatter && metadata.frontmatter["pdf"] != null) {
            basename = metadata.frontmatter["pdf"];
        }

        const annotations = await this.pdfManager.getHighlights(basename);
        const render = formatAnnotations(annotations);

        await this.app.vault.process(currentFile, (data: string) => {
            const annIdx = data.search("## Annotations");
            data = data.slice(0, annIdx).concat(render.slice(2));
            return data;
        });
    }
}