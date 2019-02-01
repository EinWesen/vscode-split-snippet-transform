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

function applySplitReplaceTransform(snippetText: string, seperator: string) {

	const editor = vscode.window.activeTextEditor;
	if (editor !== undefined) {
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

function getCurrentSnippetText(): Thenable<string | undefined> {
	if (vscode.env.clipboard !== undefined) {
		return vscode.env.clipboard.readText();
	} else {
		return vscode.window.showInputBox({ prompt: 'Insert snippet text', value: '' });
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

// this method is called when your extension is deactivated
export function deactivate() {}
