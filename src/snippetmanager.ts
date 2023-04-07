import * as vscode from 'vscode';
import * as fs from 'fs';
import * as os from 'os';
import * as JSONC from 'jsonc-parser';

interface IParsedSnippetFile {
    filename:string;
    readError?:Error;
    snippetMap?:any;
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
        this.label = `$(symbol-snippet) ${name}`;
        this.description = "(" + file + ")";
        this.detail = item.description;
    }
    getSnippetText():Thenable<string> {
        return Promise.resolve(this.snippetBody.join("\r\n"));
    }
}

class SnippetClipboardQPItem implements ISnippetQPItem {
    label = `$(clippy)`;
    description = '[Clipboard]';
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
        this.label = `$(default-view-icon) ${doc.fileName}`;
        this.description = `TabContent (${index})`
        this.detail = 'The whole current content will be used';
    }
    getSnippetText():Thenable<string> {
        return Promise.resolve(this.document.getText());
    }
}

class SnippetErrorQPItem implements ISnippetQPItem {
    label:string;
    detail:string;
    description:string;
    constructor(filename:string, errormessage:string) {
        this.label = '---';
        this.description = '(' + filename + ')';
        this.detail = errormessage;
    }
    getSnippetText():Thenable<string> {
        return Promise.reject(new Error(this.detail + "\r\n" + this.description));
    }
}


// Taken from: https://github.com/tariky/easy-snippet-maker/commit/800e0be27516aac5f3ca1fd6719bcd772e35f0bf
function pickingRelease(name:string) {
    const osName = os.type();
    let delimiter = "/";
    let extensionPath;

    switch (osName) {
        case ("Darwin"): {
            extensionPath = process.env.HOME + "/Library/Application Support/" + name + "/User/";
            break;
        }
        case ("Linux"): {
            extensionPath = process.env.HOME + "/.config/" + name + "/User/";
            break;
        }
        case ("Windows_NT"): {
            extensionPath = process.env.APPDATA + "\\" + name + "\\User\\";
            delimiter = "\\";
            break;
        }
        default: {
            extensionPath = process.env.HOME + "/.config/" + name + "/User/";
            break;
        }
    }

    return [extensionPath,delimiter];
}

function getParsedSnippetFiles():IParsedSnippetFile[] {
    
    let extensionPath:string;
    let delimiter = "/";

    let vscodeRelease = vscode.env.appName;

    // Check for insider version
    if (vscodeRelease === "Visual Studio Code - Insiders") {
        [extensionPath, delimiter] = pickingRelease("Code - Insiders");
    } else {
        [extensionPath, delimiter] = pickingRelease("Code");
    }


    const result:IParsedSnippetFile[] = [];        
    const filedir = extensionPath + "snippets"+delimiter;

    if (fs.existsSync(filedir)) {
        fs.readdirSync(filedir).forEach(f => {
            const userSnippetsFile = filedir + f.toString();
            try {
                const jsnonobject = JSONC.parse(fs.readFileSync(userSnippetsFile).toString());
                result.push({filename: userSnippetsFile, snippetMap:jsnonobject});
            } catch (je:any) {                
                result.push({filename: userSnippetsFile, readError: new Error(je.message)});
            }
        }); 
    }

    return result;
}   

export function getSnippetQuickPickItems():Thenable<ISnippetQPItem[]> {
    
    const items:ISnippetQPItem[] = [];
    
    const promiseSnippets = new Promise<ISnippetQPItem[]>((resolve, reject) => {

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
        
        if (vscode.workspace.getConfiguration('einwesen.split-snippet-transform').get('showSnippetFiles')) {
            try {
                const parsedFiles = getParsedSnippetFiles();

                parsedFiles.forEach(file => {
                    if (file.readError === undefined) {
                        const obj = file.snippetMap;                        
                        for (let key in obj) {
                            items.push(new SnippetUserCodeQPItem(file.filename, key, obj[key]));
                        }                        
                    } else { 
                        items.push(new SnippetErrorQPItem(file.filename, file.readError.message));
                    }
                });

                resolve(items);
            } catch (e) {
                reject(e);
            }

        } else {
            resolve(items);
        }
    });

    return promiseSnippets;
}
