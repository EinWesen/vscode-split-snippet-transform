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

function isOldVersion():boolean {

	let parts = vscode.version.split(".");

	if (parts[0] === "1") {
		return parseInt(parts[1])<=24;
	} else {
		return false;
	}

}

async function getCurrentSeperator() {
	return vscode.window.showInputBox({ prompt: 'Insert seperator', value: '|' });
}

function moveSelectionsToNextBoundary(direction:number, seperator:string) {
			
	const editor = vscode.window.activeTextEditor;
	if (editor !== undefined) {
		
		var changes = 0, searchFunction = undefined;						
		if (editor.selections.length > 0) {
			
			// May be microoptimisation, but this means we don't have to check direction for every selection
			switch(direction) {
				case 1:
					searchFunction = (data:string, searchString:string, position:number) => data.indexOf(searchString, position);
					break;
				case -1:
					searchFunction = (data:string, searchString:string, position:number) => data.lastIndexOf(searchString, position);
					break;
				default:
					throw "moveSelectionsToNextBoundary("+direction+"): direction unknown";
			}
			
			for (var iSelection=0; iSelection < editor.selections.length; iSelection++) {
				const selection = editor.selections[iSelection];
				const nextOccurence = searchFunction(editor.document.lineAt(selection.active.line).text, "|",selection.active.character);
				if (nextOccurence > -1) {
					if (selection.isEmpty) {
						const target = selection.active.with(undefined, nextOccurence);
						editor.selections[iSelection] = new vscode.Selection(target, target);
					} else {
						editor.selections[iSelection] = new vscode.Selection(selection.anchor, selection.active.with(undefined, nextOccurence));
					}
					changes++;
				}
			}

			if (changes>0) {
				// This triggers actually changing the selections
				editor.selections = editor.selections;
			}
		} 
	}			

}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json

	const bIsOldVersion:boolean = isOldVersion();
	
	context.subscriptions.push(vscode.commands.registerCommand('einwesen.split-snippet-transform.commands.insert_snippet', async () => {
		
		try {
			
			// Small BugFix, the old version does not handle a rejected promise in QuickPick well
			const items = bIsOldVersion ? await snippetmgr.getSnippetQuickPickItems() : snippetmgr.getSnippetQuickPickItems();
			const choosenItem = await vscode.window.showQuickPick<snippetmgr.ISnippetQPItem>(items, { canPickMany: false, matchOnDescription: true, matchOnDetail: true, placeHolder: "snippet?" });
				
			if (choosenItem !== undefined) {
				const snippetText = await choosenItem.getSnippetText(); // Trigger error before asking for the seperator
				const seperator = await getCurrentSeperator();
	
				if (seperator !== undefined) {
					applySplitReplaceTransform(snippetText, seperator);
				}

			}

		} catch (err) {
			vscode.window.showErrorMessage(err.message);
		}
			
	}));

	context.subscriptions.push(vscode.commands.registerCommand('einwesen.split-snippet-transform.commands.cursorBoundarySelectLeft', async () => {
		try {
			const seperator = await getCurrentSeperator();
			if (seperator != undefined) {
				moveSelectionsToNextBoundary(-1, seperator);
			}
		} catch (err) {
			vscode.window.showErrorMessage(err.message);
		}					
	}));

	context.subscriptions.push(vscode.commands.registerCommand('einwesen.split-snippet-transform.commands.cursorBoundarySelectRight', async () => {
		try {
			const seperator = await getCurrentSeperator();
			if (seperator != undefined) {
				moveSelectionsToNextBoundary(1, seperator);
			}
		} catch (err) {
			vscode.window.showErrorMessage(err.message);
		}					
	}));


}

// this method is called when your extension is deactivated
export function deactivate() {}
