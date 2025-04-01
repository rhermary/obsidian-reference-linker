import { App, Notice, TFile} from 'obsidian';
import * as njk from 'nunjucks';
import { DateTime } from 'luxon';
import { ReferenceLinker } from './ReferenceLinker';
import { PDFManager } from './pdf/PDFManager';
import { formatAnnotations } from './utils';
import { ZoteroAdapter } from './zotero/ZoteroAdapter';
import { BibtexAdapter } from './bibtex/BibtexAdapter';

import { ZoteroItem } from './zotero/ZoteroItem';
import { BibTeXItem } from './bibtex/BibTeXItem';

type RefItem = ZoteroItem | BibTeXItem

export class ScreenedModal {
    plugin: ReferenceLinker;
    app: App;
    template: TFile;
    _env: njk.Environment;
    pdfManager: PDFManager

    constructor(app: App, plugin: ReferenceLinker) {
        this.app = app
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

    private newFilePath(citeKey: string) : string {
        return `${this.plugin.settings.referenceNotesFolder}/${citeKey}.md`
    }

    private fileExists(newFilePath: string) : boolean {
        return this.app.vault.getFiles().filter(
            file => file.path == newFilePath
        ).length > 0
    }

    private selectBinding(binding: number[], pdfs: string[], func: (a: number) => boolean) : string[] {
        const result : string[] = [];
        return binding.reduce(function(a, e, i) {
            if (func(e))
                a.push(pdfs[i].split(".")[0]);
            return a;
        }, result);
    }

    async open(): Promise<void> {
        const content = await this.app.vault.read(this.template);
        
        let adapter : ZoteroAdapter | BibtexAdapter = this.plugin.zoteroAdapter;
        if (this.plugin.bibtexAdapter.settings.force) {
            adapter = this.plugin.bibtexAdapter;
        }
        const items: RefItem[] = await adapter.searchEverything("");

        const pdfs = await this.pdfManager.listPDFs();

        const binding = await Promise.all(pdfs.map(async pdf => {
            const citeKey = pdf.split(".")[0];
            const nAnnotations = await this.pdfManager.getNumberHighlights(citeKey);

            const items_ = items.filter(item => item.getCiteKey() == citeKey);
            if (items_.length == 0) {
                if (nAnnotations != 0) {
                    return -2;
                }

                return -1;
            }

            const newFilePath = this.newFilePath(citeKey);
            if (nAnnotations == 0 && !this.fileExists(newFilePath)) {
                return 0;
            }

            const item = items_[0];
            const annotations = await this.pdfManager.getHighlights(item.getCiteKey());
            const formattedAnnotations = formatAnnotations(annotations);

            if (!this.fileExists(newFilePath)) {
                let render = this._env.renderString(content, {
                    ...item.raw,
                    authors: item.getAuthors(),
                    citeKey: item.getCiteKey(),
                });
                
                render += formattedAnnotations;
                await this.app.vault.create(newFilePath, render);

                return 2;
            }

            const file = this.app.vault.getFiles().filter(file => {
                return file.path === newFilePath
            })[0];
            
            await this.app.vault.process(file, (data: string) => {
                const annIdx = data.search("## Annotations");
                data = data.slice(0, annIdx).concat(formattedAnnotations.slice(2));
                return data;
            });

            return 1;
        }))

        this.notifyActions(pdfs, binding);
    }

    private notifyActions(pdfs: string[], binding: number[]) : void {
        const unassociated = this.selectBinding(binding, pdfs, (a: number) => a < 0);
        const unassociated_highlighted  = this.selectBinding(binding, pdfs, (a: number) => a < -1);
        
        const updated  = this.selectBinding(binding, pdfs, (a: number) => a == 1);
        const created  = this.selectBinding(binding, pdfs, (a: number) => a == 2);
        
        new Notice(`${pdfs.length} checked successfully.`, 0)
        new Notice(`Annotations updated for ${updated.length} reference${updated.length > 1 ? 's': ''}.`, 0)
        new Notice(`${created.length} reference note${created.length > 1 ? 's': ''} created.`, 0)

        console.log("created:", created);
        console.log("updated:", updated);

        if (unassociated.length != 0) {
            let word = unassociated.length > 1 ? "PDFs have" : "PDF has";

            new Notice(`${unassociated.length} ${word} no associated reference.`)
            console.log("unassociated:", unassociated);

            if (unassociated_highlighted.length != 0) {
                word = unassociated_highlighted.length > 1 ? "PDFs are highlighted but have" : "PDF is highlighted but has";

                new Notice(`${unassociated_highlighted.length} ${word} no associated reference.`)
                console.log("unassociated with highlights:", unassociated_highlighted);
            }
        }
    }
}
