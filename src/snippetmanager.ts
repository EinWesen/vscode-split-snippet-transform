import * as vscode from 'vscode';
import * as fs from 'fs';
import * as os from 'os';

interface IParsedSnippetFile {
    filename:string;
    snippetMap:any;
}

export class SnippetQPItem implements vscode.QuickPickItem {
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

function getParsedSnippetFiles():Thenable<IParsedSnippetFile[]> {
    
    let extansionPath:string;
    let delimiter = "/";

    let vscodeRelease = vscode.env.appName;

    // Check for insider version
    if (vscodeRelease === "Visual Studio Code - Insiders") {
        [extansionPath, delimiter] = pickingRelease("Code - Insiders");
    } else {
        [extansionPath, delimiter] = pickingRelease("Code");
    }

    const promise = new Promise<IParsedSnippetFile[]>((resolve, reject) => {        
        const result:IParsedSnippetFile[] = [];        
        const filedir = extansionPath + "snippets"+delimiter;
        try {
            fs.readdirSync(filedir).forEach(f => {
                const userSnippetsFile = filedir + f.toString();
                try {
                    const jsnonobject = JSON.parse(fs.readFileSync(userSnippetsFile).toString());
                    result.push({filename: userSnippetsFile, snippetMap:jsnonobject});
                } catch (je) {
                    throw new Error(f.toString() + " : " + je.message);
                }
            }); 
            resolve(result);
        } catch (e) {
            reject(e);
        }
    });

    return promise;
}   

export function getSnippetQuickPickItems():Thenable<SnippetQPItem[]> {
    
    const promise = new Promise<SnippetQPItem[]>((resolve, reject) => {
        getParsedSnippetFiles().then((parsedFiles) => {
            try {
                const items:SnippetQPItem[] = [];
                if (parsedFiles) {
                    parsedFiles.forEach(file => {
                        const obj = file.snippetMap;                        
                        for (let key in obj) {
                            items.push(new SnippetQPItem(file.filename, key, obj[key]));
                        }                        
                    });
                }
                resolve(items);
            } catch (e) {
                reject(e);
            }
		}, (err) => {
			reject(err);
		});
    });

    return promise;
}