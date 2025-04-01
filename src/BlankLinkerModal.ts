import { App, Setting, TFile, Modal, Notice } from 'obsidian';
import * as njk from 'nunjucks';
import { ReferenceLinker } from './ReferenceLinker';
import { PDFManager } from './pdf/PDFManager';
import { titleWords } from './zotero/utils';
import { formatAnnotations } from './utils';
import { DateTime } from 'luxon';

export class BlankLinkerModal extends Modal {
    plugin: ReferenceLinker;
    template: TFile;
    _env: njk.Environment;
    pdfManager: PDFManager

    constructor(app: App, plugin: ReferenceLinker) {
        super(app);
        this.plugin = plugin;
        this.pdfManager = new PDFManager(plugin);
        this.updateTemplate();

        this._env = new njk.Environment();
        this._env.addFilter('dateFormat', (input: string, format: string) => {
            const datetime = DateTime.fromJSDate(new Date(input));
            return datetime.toFormat(format);
        });
        this._env.addFilter('remove', (input: string, chars: string[]) => {
            chars.forEach(char => input = input.replace(char, ""));
            return input;
        });

        this.setTitle('Reference Details');

        let title = '';
        new Setting(this.contentEl)
        .setName('Title')
        .addText((text) =>
            text.onChange((value) => {
            title = value;
            }));

        let year = '';
        new Setting(this.contentEl)
            .setName('Year')
            .addText((text) =>
                text.onChange((value) => {
                year = value;
            }));

        let pdf = ''
        new Setting(this.contentEl)
            .setName('File Name (PDF)')
            .addText((text) =>
                text.onChange((value) => {
                pdf = value;
            }));

        let author_name = ''
        new Setting(this.contentEl)
            .setName('First Author Family Name')
            .addText((text) =>
                text.onChange((value) => {
                    author_name = value;
            }));

        new Setting(this.contentEl)
        .addButton((btn) =>
            btn
            .setButtonText('Submit')
            .setCta()
            .onClick(() => {
                this.close();
                this.onSubmit(title, year, author_name, pdf);
            }));
    }

    private _getCiteKey(title: string, year: string, author_name: string) : string {
        const titleSplit = titleWords(title, { skipWords: false });
        const firstWord = titleSplit[0].charAt(0).toUpperCase()
            + titleSplit[0].slice(1);

        const firstLetters = titleSplit.map(
            item => item.slice(0, 1).toUpperCase()
        ).slice(1, 3).join('');

        return author_name
            + year
            + firstWord
            + firstLetters
    }

    private newFilePath(citeKey: string) : string {
        return `${this.plugin.settings.referenceNotesFolder}/${citeKey}.md`
    }

    private fileExists(newFilePath: string) : boolean {
        return this.app.vault.getFiles().filter(
            file => file.path == newFilePath
        ).length > 0
    }

    async onSubmit(title: string, year: string, author_name: string, pdf: string) {
        const citeKey = this._getCiteKey(title, year, author_name);
        const newFilePath = this.newFilePath(citeKey);

        if (this.fileExists(newFilePath)) {
            new Notice("File already exists!");
            const file = this.app.vault.getFiles().filter(file => {
                return file.path === newFilePath
            })[0];

            this.app.workspace.getLeaf("tab").openFile(file);
            
            return;
        }

        const content = await this.app.vault.read(this.template);
        let render = this._env.renderString(content, {
            title: title,
            date: year,
            citeKey: citeKey,
            pdf: pdf,
        });

        const annotations = await this.pdfManager.getHighlights(citeKey);
        render += formatAnnotations(annotations);

        const newFile = await this.app.vault.create(newFilePath, render);
        this.app.workspace.getLeaf("tab").openFile(newFile);
    }

    updateTemplate() {
        // TODO: do something when empty list
        this.template = this.app.vault.getFiles().filter(
            file => file.path === this.plugin.settings.templatePath
        )[0];
    }
}
