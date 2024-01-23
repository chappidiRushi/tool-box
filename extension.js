
const { config } = require('process');
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
        if (['boolean', 'string', 'null', 'number', 'object', 'string[]', 'any[]', 'number[]', 'object[]'].includes(dataType)) {
					updatedText.push(`${key} : data.${key}`);
				} else if (dataType.endsWith('[]')) {
					updatedText.push(
            `${key}:data.${key}?.forEach((element: any)=> objTo${dataType.substr(0, dataType.length - 2)}(element))`);
				} else if (dataType.includes('Array')) {
					updatedText.push(`${key} : undefined`);
				}
				else if (!dataType.endsWith('[]') && !'number string boolean undefined null number []'.includes(dataType)) {
          updatedText.push(`${key} : objTo${dataType}(data.${key})`);
				}
			}
		});
		let finalBuild = `${actualText}
		export function objTo${interfaceName}(data: any):${interfaceName} {
  			const resp:${interfaceName} = {${updatedText.join(', \n ')}};
  			return resp
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
	// converting an interface to function
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
	
	// converting all interfaces to function
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

	// restart application
	let restart = vscode.commands.registerCommand('tool-box.restartApp', async function () {
		vscode.commands.executeCommand("workbench.action.reloadWindow").then(() => {
			console.log('app restarted');
		})
	})

	// run terminal commands
  let runCommands = vscode.commands.registerCommand('tool-box.runCommands', async function () {
    runTerminalCommands();
	})

	// Toglle files visibility
	let toggleFileVisibility = vscode.commands.registerCommand('tool-box.toggleFileVisibility', async function () {
		try {
			const config = vscode.workspace.getConfiguration('tool-box');
			const filesToToggleVisibility = config.get('FilesToToggle', []);

			if (!filesToToggleVisibility || filesToToggleVisibility.length === 0) {
				vscode.window.showErrorMessage('No files to toggle visibility');
				return;
			}

			const visibleFiles = vscode.workspace.getConfiguration('files').get('exclude', {});
			const filesAreAlreadyVisible = filesToToggleVisibility.filter(file => visibleFiles[file]);
			const toggleTo = (filesAreAlreadyVisible.length >= filesToToggleVisibility.length - filesAreAlreadyVisible.length) ? false : true;
			const toggledVisibility = Object.assign({}, visibleFiles);
			filesToToggleVisibility.forEach(file => {
				toggledVisibility[file] = toggleTo;
			});
			vscode.workspace.getConfiguration('files').update('exclude', toggledVisibility, vscode.ConfigurationTarget.Workspace);

		} catch (error) {
			console.error(error)
		}
	})
	


// opens external terminal
	let openTerminal = vscode.commands.registerCommand('tool-box.openTerminal', async function () {
		vscode.commands.executeCommand("workbench.action.terminal.openNativeConsole").then(() => {
		})
	})  
	
	// Run terminal commands on startup
  const terminalOnStartUp = vscode.workspace.getConfiguration('tool-box').get('runTerminalOnStartUp');
  if (terminalOnStartUp) {
    runTerminalCommands();
	}
	// creating the toolbar buttons on startup
	createButtons();
	
	// start debugger on app startup
  const startDebugOnStartUp = vscode.workspace.getConfiguration('tool-box').get('startDebuggerOnStartUp');
  if (startDebugOnStartUp) {
    vscode.commands.executeCommand("workbench.action.debug.start").then(() => { });
	}

	// Add file to ignore list
	const addFileToHideList = vscode.commands.registerCommand('tool-box.addFileToToggleVisibility', (uri, another) => {
		// 'uri' will contain information about the file that was right-clicked
		const filePath = vscode.workspace.asRelativePath(uri);

		// Get the current ignoreFileList from settings.json
		const config = vscode.workspace.getConfiguration('tool-box');
		let ignoreFileList = config.get('FilesToToggle') || [];

		// Check if the file is already in the ignoreFileList
		if (!ignoreFileList.includes(filePath)) {
			// Add the file to the ignoreFileList
			ignoreFileList.push(filePath);

			if (!config.has('ignoreFileList')) {
				// Create ignoreFileList if it doesn't exist
				config.update('ignoreFileList', [], vscode.ConfigurationTarget.Workspace);
			}
			// Update the ignoreFileList in settings.json
			config.update('FilesToToggle', ignoreFileList, vscode.ConfigurationTarget.Workspace);
			vscode.window.showInformationMessage(`Added ${filePath} to prop-tool-box.ignoreFileList`);
		} else {
			vscode.window.showInformationMessage(`${filePath} is already in prop-tool-box.ignoreFileList`);
		}

	});


	context.subscriptions.push(disposable, allInterFaces, restart, openTerminal, runCommands, toggleFileVisibility, addFileToHideList);
}
function deactivate() { }

module.exports = {
  activate,
  deactivate
};
function runTerminalCommands() {
  const config = vscode.workspace.getConfiguration('tool-box').get('terminalCommands');
  if (Array.isArray(config)) {
    config.forEach((conf) => {
      let terminal = vscode.window.createTerminal(conf.name, conf.executionPath,);
      terminal.sendText(conf.commands);
      terminal.show();
    });
  }
}

function createButtons() {
  const buttonConfig = vscode.workspace.getConfiguration('tool-box').get('buttonsVisibility');
  console.log("🚀 ~ file: extension.js:146 ~ createButtons ~ buttonConfig:", buttonConfig);
  buttonConfig;
  if (buttonConfig.restartBtn) {
    const restartButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 0);
    restartButton.command = 'tool-box.restartApp';
    restartButton.text = 'restart app';
    restartButton.tooltip = 'restart the vscode application';
    restartButton.show();
  }

  if (buttonConfig.openTerminalBtn) {
    const openTerminalBtn = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 0);
    openTerminalBtn.command = 'tool-box.openTerminal';
    openTerminalBtn.text = 'open terminal';
    openTerminalBtn.tooltip = 'open external terminal';
    openTerminalBtn.show();
  }
  if (buttonConfig.executeCommands) {
    const executeCommands = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 0);
    executeCommands.command = 'tool-box.runCommands';
    executeCommands.text = 'Exec Cmds';
    executeCommands.tooltip = 'Run Commands';
    executeCommands.show();
	}
	if (buttonConfig.FileVisibility){
		const toggleFileVisibility = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 0);
		toggleFileVisibility.command = 'tool-box.toggleFileVisibility';
		toggleFileVisibility.text = 'Toggle File Visibility';
		toggleFileVisibility.tooltip = 'Toggle File Visibility';
		toggleFileVisibility.show();
	}
}
