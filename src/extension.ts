// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as snippetmgr from './snippetmanager';


function replaceSplitVars(selectionText:string, snippetText: string, seperator: string):string {
	
	if (selectionText.length > 0) {
		const selectionParts: string[] = selectionText.split(seperator);
			
		selectionText = snippetText;
		for (var i = 0; i < selectionParts.length; i++) {
			const varname = "${TM_SELECTED_TEXT[" + i + "]}";
			selectionText = selectionText.replace(varname, selectionParts[i]);
		}
	
		return selectionText;
	} else {
		return snippetText;
	}

}

function convertSplitVars(snippetText: string, seperator: string):string {
	
	if (snippetText.length > 0) {				
		// clean seperator 
		seperator = seperator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

		const internalTransform = '$${TM_SELECTED_TEXT/((.*?'+seperator+'){$1})([^'+seperator+']*)(.*)/$$3/gu}';

		// Replace extensions variable format with a natively supported transform (which should match what we want)
		return snippetText.replace(/\$\{TM_SELECTED_TEXT\[(\d*)\]\}/g, internalTransform);
	} else {
		return snippetText;
	}

}


function applySplitReplaceTransform(snippetText: string, seperator: string) {

	const editor = vscode.window.activeTextEditor;
	const useNativeTransform = vscode.workspace.getConfiguration('einwesen.split-snippet-transform').get('useNativeTransform');

	if (editor !== undefined) {
		
		if (useNativeTransform) {
			editor.insertSnippet(new vscode.SnippetString(convertSplitVars(snippetText, seperator)), editor.selections);
		} else {
			if (editor.selections.length > 0) {
				if (editor.selections.length === 1) {
					editor.insertSnippet(new vscode.SnippetString(replaceSplitVars(editor.document.getText(editor.selection), snippetText, seperator)));
				} else {
					editor.edit((editBuilder) => {
						editor.selections.forEach((selection) => {
							editBuilder.replace(selection, replaceSplitVars(editor.document.getText(selection), snippetText, seperator));
						});
					});
				}	
			}
		}	
	}
	
}

function getCurrentSnippetText(): Thenable<string | undefined> {
	if (vscode.env.clipboard !== undefined) {
		return vscode.env.clipboard.readText();
	} else {
		return vscode.window.showInputBox({ prompt: 'Insert snippet text', value: '' });
	}
}

function isOldVersion():boolean {

	let parts = vscode.version.split(".");

	if (parts[0] == "1") {
		return parseInt(parts[1])<=24;
	} else {
		return false;
	}

}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	context.subscriptions.push(vscode.commands.registerCommand('einwesen.split-snippet-transform.commands.insert_clipboard_with_split', () => {
		getCurrentSnippetText().then(function (snippetText) {
			if (snippetText === null || snippetText === undefined || snippetText.trim() === '') {
				vscode.window.showErrorMessage('SnippetText is empty');
			} else {
				vscode.window.showInputBox({ prompt: 'Insert seperator', value: '|' }).then(function (seperator) {
					if (seperator !== undefined) {
						applySplitReplaceTransform(snippetText, seperator);
					}
				});
			}
		}/*, function (reason) {}*/);
	}));

	context.subscriptions.push(vscode.commands.registerCommand('einwesen.split-snippet-transform.commands.insert_clipboard', () => {
		getCurrentSnippetText().then(function (snippetText) {
			if (snippetText === null || snippetText === undefined || snippetText.trim() === '') {
				vscode.window.showErrorMessage('SnippetText is empty');
			} else {
				const editor = vscode.window.activeTextEditor;
				if ( editor !== undefined) {
					editor.insertSnippet(new vscode.SnippetString(snippetText));
				}
			}
		}/*, function (reason) {}*/);
	}));


	// Small BugFix this, Version does not handle a rejected promise in QuickPick well
	if (isOldVersion()) {
		context.subscriptions.push(vscode.commands.registerCommand('einwesen.split-snippet-transform.commands.insert_snippet', () => {
			snippetmgr.getSnippetQuickPickItems().then((items) => {
				vscode.window.showQuickPick<snippetmgr.SnippetQPItem>(items, { canPickMany: false, matchOnDescription: true, matchOnDetail: true, placeHolder: "snippet?" }).then(
					(item: snippetmgr.SnippetQPItem | undefined) => {
						if (item !== undefined) {
							vscode.window.showInputBox({ prompt: 'Insert seperator', value: '|' }).then(function (seperator) {
								if (seperator !== undefined) {
									applySplitReplaceTransform(item.snippetBody.join("\r\n"), seperator);
								}
							});
						}
					}, (err) => {
						vscode.window.showErrorMessage(err.message);
					}
				);
			}, (err) => {
				vscode.window.showErrorMessage(err.message);
			});
		}));
	} else {
		context.subscriptions.push(vscode.commands.registerCommand('einwesen.split-snippet-transform.commands.insert_snippet', () => {
			vscode.window.showQuickPick<snippetmgr.SnippetQPItem>(snippetmgr.getSnippetQuickPickItems(), { canPickMany: false, matchOnDescription: true, matchOnDetail: true, placeHolder: "snippet?" }).then(
				(item: snippetmgr.SnippetQPItem | undefined) => {
					if (item !== undefined) {
						vscode.window.showInputBox({ prompt: 'Insert seperator', value: '|' }).then(function (seperator) {
							if (seperator !== undefined) {
								applySplitReplaceTransform(item.snippetBody.join("\r\n"), seperator);
							}
						});
					}
				}, (err) => {
					vscode.window.showErrorMessage(err.message);
				}
			);
		}));
	}

}

// this method is called when your extension is deactivated
export function deactivate() {}
