import { App } from 'obsidian';
import { ZoteroItem } from './zotero/ZoteroItem';
import { ReferenceLinker } from './ReferenceLinker';
import { BibTeXItem } from './bibtex/BibTeXItem';
import { _DebouncedRefSuggest } from './_DebouncedRefSuggest';

type RefItem = ZoteroItem | BibTeXItem

export class SimpleCiteModal extends _DebouncedRefSuggest {
    constructor(app: App, plugin: ReferenceLinker) {
        super(app, plugin);
    }
    
    async onChooseSuggestion(item: RefItem, evt: MouseEvent | KeyboardEvent) {
        let content = item.getCiteKey();
        const editor = this.app.workspace.activeEditor?.editor
        const currentFile = this.app.workspace.getActiveFile()
        
        if (currentFile === null || editor === undefined) return;

        const newFilePath = this.newFilePath(item.getCiteKey());
        if (this.fileExists(newFilePath)) {
            content = `[[${newFilePath}|[@${content}]]]`;
        }
        else {
            content =  `[[${content}|@${content}]]`;
        }

        editor.replaceRange(
            content,
            {
                line: editor.getCursor().line,
                ch: editor.getCursor().ch,
            },
        );

        editor.setCursor({
            line: editor.getCursor().line,
            ch: editor.getCursor().ch + content.length,
        })
    }
}
