
const vscode = require('vscode');
function activate(context) {
	function getInterfaceName(text) {
		var regex = /interface\s+(\w+)\s+{/g;
		var match = regex.exec(text);
		let interfaceName = "";
		if (match) {
			interfaceName = match[1];
		}
		return interfaceName || "";
	}
	
	function removeSpacesAndLines(text) {
		return text.replace(/(\n|\s)/g, '');
	}
	
	function parseInterfaceToArray(text) {
		const extractedText = text.match(/\{(.*)\}/)[1];
		return extractedText.split(';');
	}
	
	async function convertEditorSelectionToFunc(selection) {
		var editor = vscode.window.activeTextEditor;
		var text = editor.document.getText(selection);
		var actualText = text;
		let interfaceName = getInterfaceName(text);
		const formattedText = removeSpacesAndLines(text);
		const splitText = parseInterfaceToArray(formattedText);
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
						`${key}:data.${key}?.forEach((element: any)=> objTo${dataType}(element))`);
				} else if (dataType.includes('Array')) {
					updatedText.push(`${key} : undefined`);
				}
				else if (!dataType.endsWith('[]') && !'number string boolean undefined null number []'.includes(dataType)) {
					updatedText.push(`${key} : objTo${key.charAt(0).toUpperCase() + key.substring(1)}(data.${key})`);
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
		await editor.document.save();
	}
	
	function getTheInterfaceSelection(interFaceText) {
		var editor = vscode.window.activeTextEditor;
		const text = editor.document.getText();
		const startIndex = text.indexOf(interFaceText);
		const endIndex = (text.indexOf('}', startIndex)) + 1;
		const startPos = editor.document.positionAt(startIndex);
		const endPos = editor.document.positionAt(endIndex);
		const range = new vscode.Range(startPos, endPos);
		editor.selection = new vscode.Selection(range.start, range.end);
		return editor.selection;
	}
	
	function findInterfacesInText(text) {
		return text.match(/interface\s+(\w+)\s*\{[\s\S]*?\}/g);
	}
	
	let disposable = vscode.commands.registerCommand('tool-box.int2func', async function () {
		var editor = vscode.window.activeTextEditor;
		if (!editor) {
			return; // No open text editor
		}
		try {
			var selection = editor.selection;
			await convertEditorSelectionToFunc(selection);
		} catch (error) {
			vscode.window.showErrorMessage('invalid text selection');
		}
	});
	
	let allInterFaces = vscode.commands.registerCommand('tool-box.allInt2func', async function () {
		var editor = vscode.window.activeTextEditor;
		if (!editor) {
			return; // No open text editor
		}
		try {
			const editor = vscode.window.activeTextEditor;
			const text = editor.document.getText();
			var arrayOfInterfaces = findInterfacesInText(text);
			for (let interFaceText of arrayOfInterfaces) {
				let selection = await getTheInterfaceSelection(interFaceText);
				await convertEditorSelectionToFunc(selection);
			}
			vscode.commands.executeCommand("editor.action.formatDocument").then(() => {
				console.log('formatting completed');
			});
		} catch (error) {
			console.log(`some error in the code`);
		}
	});
	let restart = vscode.commands.registerCommand('tool-box.restartApp', async function () {
		vscode.window.showErrorMessage('button clicked');
		vscode.commands.executeCommand("workbench.action.reloadWindow").then(() => {
			console.log('app restarted');
		})
	})
	
	const myButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 0);
	myButton.command = 'tool-box.restartApp';
	myButton.text = 'restart app';
	myButton.tooltip = 'restart the vscode application';
	// myButton.
	myButton.show();

	context.subscriptions.push(disposable, allInterFaces, restart);
}
function deactivate() { }

module.exports = {
	activate,
	deactivate
};
