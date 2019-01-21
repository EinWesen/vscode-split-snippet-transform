// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';


function applySplitReplaceTransform(snippetText : string, seperator : string) {
	const editor = vscode.window.activeTextEditor;
	if (editor!==undefined) {		
		editor.edit((editBuilder) => {
			editor.selections.forEach((selection) => {
				let selectionText = editor.document.getText(selection);
				
				if (selectionText.length > 0) {
					const selectionParts : string[] = selectionText.split('|');

					selectionText = snippetText;
					for (var i=0; i < selectionParts.length; i++) {
						const varname = "${TM_SELECTED_TEXT["+i+"]}";
						selectionText = selectionText.replace(varname, selectionParts[i]);
					}
					editBuilder.replace(selection, selectionText);
					//editBuilder.insert(selection.active, newText);
				} else {
					editBuilder.replace(selection, snippetText);
				}
			});
		});	

	}
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	//console.log('Congratulations, your extension "split-snippet-transform" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('extension.helloWorld', () => {
		
		// The code you place here will be executed every time your command is executed
		vscode.env.clipboard.readText().then(function (snippetText) {
			if (snippetText === null || snippetText.trim() === '') {
				vscode.window.showErrorMessage('Clipboard is empty');
			} else {
				vscode.window.showInputBox({prompt: 'Insert seperator', value: '|'}).then(function (seperator) {
					if (seperator!== undefined) {
						applySplitReplaceTransform(snippetText, seperator);
					}
				});
			}
		}/*, function (reason) {}*/);

	});

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
