import * as vscode from 'vscode';
import * as fs from 'fs';
import * as os from 'os';

interface IParsedSnippetFile {
    filename:string;
    snippetMap:any;
}

export interface ISnippetQPItem extends vscode.QuickPickItem {
    getSnippetText():Thenable<string>;
}

class SnippetUserCodeQPItem implements ISnippetQPItem {
    snippetBody:string[];
    label:string;
    description:string;
    detail:string;
    constructor(file:string, name:string, item: any) {
        this.snippetBody = item.body;
        this.label = item.prefix;
        this.description = "(" + file + ")";
        this.detail = item.description;
    }
    getSnippetText():Thenable<string> {
        return Promise.resolve(this.snippetBody.join("\r\n"));
    }
}

class SnippetClipboardQPItem implements ISnippetQPItem {
    label = '[Clipboard]';
    description = '';
    detail = 'The whole current content will be used';
    getSnippetText():Thenable<string> {
        return vscode.env.clipboard.readText();
    }
}

class SnippetDocumentQPItem implements ISnippetQPItem {
    document:vscode.TextDocument;
    label:string;
    description:string;
    detail:string;
    constructor(doc:vscode.TextDocument, index:number) {
        this.document = doc;
        this.label = 'TabContent ('+index+')';
        this.description = "(" + doc.fileName + ")";
        this.detail = 'The whole current content will be used';
    }
    getSnippetText():Thenable<string> {
        return Promise.resolve(this.document.getText());
    }
}

// Taken from: https://github.com/tariky/easy-snippet-maker/commit/800e0be27516aac5f3ca1fd6719bcd772e35f0bf
function pickingRelease(name:string) {
    const osName = os.type();
    let delimiter = "/";
    let extansionPath;

    switch (osName) {
        case ("Darwin"): {
            extansionPath = process.env.HOME + "/Library/Application Support/" + name + "/User/";
            break;
        }
        case ("Linux"): {
            extansionPath = process.env.HOME + "/.config/" + name + "/User/";
            break;
        }
        case ("Windows_NT"): {
            extansionPath = process.env.APPDATA + "\\" + name + "\\User\\";
            delimiter = "\\";
            break;
        }
        default: {
            extansionPath = process.env.HOME + "/.config/" + name + "/User/";
            break;
        }
    }

    return [extansionPath,delimiter];
}

function getParsedSnippetFiles():IParsedSnippetFile[] {
    
    let extansionPath:string;
    let delimiter = "/";

    let vscodeRelease = vscode.env.appName;

    // Check for insider version
    if (vscodeRelease === "Visual Studio Code - Insiders") {
        [extansionPath, delimiter] = pickingRelease("Code - Insiders");
    } else {
        [extansionPath, delimiter] = pickingRelease("Code");
    }


    const result:IParsedSnippetFile[] = [];        
    const filedir = extansionPath + "snippets"+delimiter;

    fs.readdirSync(filedir).forEach(f => {
        const userSnippetsFile = filedir + f.toString();
        try {
            const jsnonobject = JSON.parse(fs.readFileSync(userSnippetsFile).toString());
            result.push({filename: userSnippetsFile, snippetMap:jsnonobject});
        } catch (je) {
            throw new Error(f.toString() + " : " + je.message);
        }
    }); 

    return result;
}   

export function getSnippetQuickPickItems():Thenable<ISnippetQPItem[]> {
    
    const items:ISnippetQPItem[] = [];

    if (vscode.env.clipboard) {
        if (vscode.workspace.getConfiguration('einwesen.split-snippet-transform').get('showClipboardAsSnippet')) {
            items.push(new SnippetClipboardQPItem());
        }
    }
    
    if (vscode.workspace.getConfiguration('einwesen.split-snippet-transform').get('showDocumentsAsSnippet')) {
        vscode.workspace.textDocuments.forEach((document, index) => {
            if (!document.isClosed && document.fileName !== '/global-snippets') {                
                
                if (document.uri.scheme === 'untitled' || document.uri.scheme === 'file') {
                    if (vscode.window.activeTextEditor !== undefined) {                
                        if (vscode.window.activeTextEditor.document !== document) {
                            items.push(new SnippetDocumentQPItem(document, index));
                        }
                    } else {
                        items.push(new SnippetDocumentQPItem(document, index));
                    }
                }                 
            } 
        });
    }

    const promiseFiles = new Promise<ISnippetQPItem[]>((resolve, reject) => {
        
        try {
            const parsedFiles = getParsedSnippetFiles();

            parsedFiles.forEach(file => {
                const obj = file.snippetMap;                        
                for (let key in obj) {
                    items.push(new SnippetUserCodeQPItem(file.filename, key, obj[key]));
                }                        
            });

            resolve(items);
        } catch (e) {
            reject(e);
        }
    });

    return promiseFiles;
}