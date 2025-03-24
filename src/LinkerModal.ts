import { App, Notice, SuggestModal, TFile} from 'obsidian';
import { ZoteroItem } from './zotero/ZoteroItem';
import * as njk from 'nunjucks';
import { DateTime } from 'luxon';
import { ReferenceLinker } from './ReferenceLinker';
import { PDFManager } from './pdf/PDFManager';
import { formatAnnotations } from './utils';
import { BibTeXItem } from './bibtex/BibTeXItem';
import { ZoteroAdapter } from './zotero/ZoteroAdapter';
import { BibtexAdapter } from './bibtex/BibtexAdapter';

type RefItem = ZoteroItem | BibTeXItem 

export class LinkerModal extends SuggestModal<RefItem> {
    plugin: ReferenceLinker;
    template: TFile;
    _env: njk.Environment;
    pdfManager: PDFManager

    constructor(app: App, plugin: ReferenceLinker) {
        super(app);
        this.plugin = plugin;
        this.updateTemplate();
        this.pdfManager = new PDFManager(plugin);

        this._env = new njk.Environment();
        this._env.addFilter('dateFormat', (input: string, format: string) => {
            const datetime = DateTime.fromJSDate(new Date(input));
            return datetime.toFormat(format);
        });
        this._env.addFilter('remove', (input: string, chars: string[]) => {
            chars.forEach(char => input = input.replace(char, ""));
            return input;
        });
    }

    updateTemplate() {
        // TODO: do something when empty list
        this.template = this.app.vault.getFiles().filter(
            file => file.path === this.plugin.settings.templatePath
        )[0];
    }

    onOpen() {
        const { inputEl } = this;

        inputEl.empty();
    }

    onClose() {
        const { inputEl } = this;
        inputEl.empty();
    }

    renderSuggestion(reference: RefItem, el: HTMLElement) {
        el.createEl("div", { text: reference.getTitle() });
        el.createEl("small", { text: reference.getAuthors() });
    }

    getSuggestions(query: string): RefItem[] | Promise<RefItem[]> {
        let adapter : ZoteroAdapter | BibtexAdapter = this.plugin.zoteroAdapter;
        if (this.plugin.bibtexAdapter.settings.force) {
            adapter = this.plugin.bibtexAdapter;
        }

        return adapter.searchEverything(query)
            .then((items: RefItem[]) =>
                Object.fromEntries(items.map(x => [x.getCiteKey(), x]))
            )
            .then((items) => Object.values(items));
    }

    private newFilePath(citeKey: string) : string {
        return `${this.plugin.settings.referenceNotesFolder}/${citeKey}.md`
    }

    private fileExists(newFilePath: string) : boolean {
        return this.app.vault.getFiles().filter(
            file => file.path == newFilePath
        ).length > 0
    }

    async onChooseSuggestion(item: RefItem, evt: MouseEvent | KeyboardEvent) {
        const content = await this.app.vault.read(this.template);
        let render = this._env.renderString(content, {
            ...item.raw,
            authors: item.getAuthors(),
            citeKey: item.getCiteKey(),
        });

        const newFilePath = this.newFilePath(item.getCiteKey());
        if (this.fileExists(newFilePath)) {
            new Notice("File already exists!");
            const file = this.app.vault.getFiles().filter(file => {
                return file.path === newFilePath
            })[0];

            this.app.workspace.getLeaf("tab").openFile(file);
            
            return;
        }

        const annotations = await this.pdfManager.getHighlights(item.getCiteKey());
        render += formatAnnotations(annotations);

        const newFile = await this.app.vault.create(newFilePath, render);
        this.app.workspace.getLeaf("tab").openFile(newFile);
    }
}
