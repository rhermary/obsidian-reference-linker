import { loadPdfJs, Notice } from 'obsidian';
import * as fs from 'fs';
import path from 'path';
import { PDFDocumentProxy } from 'pdfjs-dist';
import { TextItem } from 'pdfjs-dist/types/src/display/api';
import { ReferenceLinker } from '../ReferenceLinker';
import { extractHighlight } from './utils';

interface Highlight {
    text: string;
    color: string;
}

// function rgbToHex(color: number[]) {
//     const [red, green, blue] = color
//     const rgb = (red << 16) | (green << 8) | (blue << 0);
//     return '#' + (0x1000000 + rgb).toString(16).slice(1);
// }

function rgbToRgba(color: number[]) {
    const [red, green, blue] = color
    return `rgba(${red}, ${green}, ${blue}, 0.5)`
}

export interface Annotation {
    highlight: Highlight,
    author: string,
    modificationDate: string, // https://www.verypdf.com/pdfinfoeditor/pdf-date-format.htm
    page: number,
}

export class PDFManager {
    plugin: ReferenceLinker
    _allPDFs: Promise<string[]>

    constructor(plugin: ReferenceLinker) {
        this.plugin = plugin;
        this._allPDFs = new Promise((resolve) => setTimeout(() => {
            resolve(this.listPDFs_())
        }, 0));
    }

    async _getReader(basename: string) : Promise<Buffer | null> {
        return this.listPDFs().then(pdfs => {
            const pdfFile = pdfs.filter(filePath => {
                return filePath.endsWith(`${basename}.pdf`);
            }).first();
            
            if (pdfFile == undefined) {
                return null;
            } else {
                return fs.readFileSync(pdfFile);
            }
        });
    }

    async getHighlights(basename: string) : Promise<Annotation[]> {
        const reader = await this._getReader(basename);
        if (reader == null) {
            new Notice(`Could not find PDF '${basename}'.`);
            return []
        }

        const loader = await loadPdfJs();
        const pdf : PDFDocumentProxy = await loader.getDocument(reader).promise

        const parsedAnnotations : Annotation[] = []

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            let annotations = await page.getAnnotations();
            const content = await page.getTextContent();  // default: no MarkedContent
            const items = <TextItem[]>content.items;
            items.sort(function (a1, a2) {							
                if (a1.transform[5] > a2.transform[5]) return -1    // y coord. descending
                if (a1.transform[5] < a2.transform[5]) return 1
                if (a1.transform[4] > a2.transform[4]) return 1    // x coord. ascending
                if (a1.transform[4] < a2.transform[4]) return -1				
                return 0
            })

            annotations = annotations.filter(
                ann => ann.subtype == "Highlight"
            );

            for (const annotation of annotations) {
                const highlightedText = extractHighlight(annotation, items)
                parsedAnnotations.push({
                    highlight: {
                        color: rgbToRgba(annotation.color),
                        text: highlightedText,
                    },
                    modificationDate: annotation.modificationDate,
                    author: annotation.titleObj.str,
                    page: i,
                })
            }
        }

        return parsedAnnotations;
    }
    
    async getNumberHighlights(basename: string) : Promise<number> {
        const reader = await this._getReader(basename);
        const loader = await loadPdfJs();
        const document = await loader.getDocument(reader);

        const pdf : PDFDocumentProxy = await document.promise;

        let totalAnnotations = 0;

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            let annotations = await page.getAnnotations();

            annotations = annotations.filter(
                ann => ann.subtype == "Highlight"
            )
            
            totalAnnotations += annotations.length;
        }

        await pdf.destroy()
        await document.destroy();
        
        return totalAnnotations;
    }

    private listPDFs_(dir: string | null = null) : string[] {
        if (dir == null) {
            dir = this.plugin.settings.PDFFolder;
        }

        let pdfFiles: string[] = [];
        try {
            const reader = fs.readdirSync(dir);
    
            for (const file of reader) {
                const fullPath = path.join(dir, file);
                if (fs.statSync(fullPath).isDirectory()) {
                    pdfFiles = pdfFiles.concat(this.listPDFs_(fullPath)); // Recursively search subfolders
                } else if (file.endsWith('.pdf')) {
                    pdfFiles.push(fullPath);
                }
            }

            return pdfFiles;
        } catch {
            new Notice(`Could not find folder ${dir}`)
            return [];
        }
    }

    async listPDFs() : Promise<string[]> {
        return this._allPDFs;
    }
}