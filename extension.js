// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulatiocommandns, your extension "tool-box" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('tool-box.toolBox', async function () {
		// The code you place here will be executed every time your command is executed

		// Display a message box to the user
		var editor = vscode.window.activeTextEditor;
		if (!editor) {
			return; // No open text editor
		}
		try {
			var selection = editor.selection;
			var text = editor.document.getText(selection);
			var actualText = text;
			// get interface name
			var regex = /interface\s+(\w+)\s+{/g;
			var match = regex.exec(text);
			let interfaceName = "";
			if (match) {
				interfaceName = match[1];
			}
			const formattedText = text.replace(/(\n|\s)/g, '');
			const extractedText = formattedText.match(/\{(.*)\}/)[1];
			const splitText = extractedText.split(';');
			let updatedText = [];
			splitText.forEach(text => {
				if (text != '' && text.includes(':')) {
					let textArr = text.split(':');
					let dataType = textArr[1];
					let key = (textArr[0].endsWith('?')) ? textArr[0].slice(0, -1) : textArr[0];
					if (['boolean', 'string', 'number', 'object', 'string[]', 'any[]', 'number[]', 'object[]'].includes(dataType)) {
						updatedText.push(`${key} : data.${key}`);
					} else if (dataType.endsWith('[]')) {
						updatedText.push(
							`${key}:data.${key}?.forEach((element: any)=> objToI${key.charAt(0).toUpperCase() + key.substring(1)}(element))`);
					} else if (dataType.includes('Array')) {
						updatedText.push(`${key} : undefined`);
					}
					else if (!dataType.endsWith('[]') && !'number string boolean undefined null number []'.includes(dataType)) {
						updatedText.push(`${key} : objToI${key.charAt(0).toUpperCase() + key.substring(1)}(data.${key})`);
					}
				}
			});
			let finalBuild = `${actualText}
		function objTo${interfaceName}(data: any):${interfaceName} {
  			const resp:${interfaceName} = {${updatedText.join(', \n ')}};
  			return resp;
		};
		`;
			editor.edit(editBuilder => {
				editBuilder.replace(selection, finalBuild);
			});
			vscode.commands.executeCommand("editor.action.formatSelection", finalBuild).then(() => {
				console.log('formatting complated');
			});
		} catch (error) {
			vscode.window.showErrorMessage('invalid text selection');
		}

	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
function deactivate() { }

module.exports = {
	activate,
	deactivate
};
