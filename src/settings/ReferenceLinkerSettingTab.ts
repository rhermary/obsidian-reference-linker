import { PluginSettingTab, App, Setting } from 'obsidian';
import { ReferenceLinker } from '../ReferenceLinker';

export class ReferenceLinkerSettingTab extends PluginSettingTab {
    plugin: ReferenceLinker;

    constructor(app: App, plugin: ReferenceLinker) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display() {
        const { containerEl } = this;

        containerEl.empty();

        containerEl.createEl('h2', { text: 'Reference Linker Settings' });

        new Setting(containerEl)
            .setName("References Note Folder")
            .setDesc("Folder where the articles notes will be created")
            .addText(text => text
                .setPlaceholder('')
                .setValue(this.plugin.settings.referenceNotesFolder)
                .onChange(async (value) => {
                    this.plugin.settings.referenceNotesFolder = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName("Template File")
            .setDesc("Path to a Markdwon file template")
            .addText(text => text
                .setPlaceholder('')
                .setValue(this.plugin.settings.templatePath)
                .onChange(async (value) => {
                    this.plugin.settings.templatePath = value;
                    await this.plugin.saveSettings();
                }));

        
        new Setting(containerEl)
            .setName("PDFs Folder")
            .setDesc("Folder where your articles in PDF format are stored")
            .addText(text => text
                .setPlaceholder('')
                .setValue(this.plugin.settings.PDFFolder)
                .onChange(async (value) => {
                    this.plugin.settings.PDFFolder = value;
                    await this.plugin.saveSettings();
                }));

        containerEl.createEl('h2', { text: 'Zotero Settings' });

        new Setting(containerEl)
            .setName("Host Address")
            .setDesc("Address of the Zotero database host")
            .addText(text => text
                .setPlaceholder('e.g. localhost')
                .setValue(this.plugin.settings.zoteroBridgeSettings.host)
                .onChange(async (value) => {
                    this.plugin.settings.zoteroBridgeSettings.host = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName("Host Port")
            .setDesc("Port on which to contact the host")
            .addText(text => text
                .setPlaceholder('e.g. 23119')
                .setValue(this.plugin.settings.zoteroBridgeSettings.port)
                .onChange(async (value) => {
                    this.plugin.settings.zoteroBridgeSettings.port = value;
                    await this.plugin.saveSettings();
                }));
    

        containerEl.createEl('h2', { text: 'BibTeX Settings' });

        new Setting(containerEl)
            .setName("BibTeX File Path")
            .setDesc("Path to the exported references")
            .addText(text => text
                .setPlaceholder('')
                .setValue(this.plugin.settings.bibtexSettings.exportedBibPath)
                .onChange(async (value) => {
                    this.plugin.settings.bibtexSettings.exportedBibPath = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
        .setName("Force BibTeX")
        .setDesc("Only check for a BibTeX file, bypassing Zotero use")
        .addToggle(toggle => toggle
            .setValue(this.plugin.settings.bibtexSettings.force)
            .onChange(async (value) => {
                this.plugin.settings.bibtexSettings.force = value;
                await this.plugin.saveSettings();
            }));
    }
}
