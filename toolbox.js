const vscode = require('vscode');
export function getInterfaceName(text) {
    var regex = /interface\s+(\w+)\s+{/g;
    var match = regex.exec(text);
    let interfaceName = "";
    if (match) {
        interfaceName = match[1];
    }
    return interfaceName || "";
}
export function removeSpacesAndLines(text) {
    return text.replace(/(\n|\s)/g, '');
}
export function parseInterfaceToArray(text) {
    const extractedText = text.match(/\{(.*)\}/)[1];
    return extractedText.split(';');
}
export async  function convertEditorSelectionToFunc(selection) {
    var editor = vscode.window.activeTextEditor;
    var text = editor.document.getText(selection);
    var actualText = text;
    // get interface name
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
                    `${key}:data.${key}?.forEach((element: any)=> objTo${key.charAt(0).toUpperCase() + key.substring(1)}(element))`);
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
export function getTheInterfaceSelection(interFaceText) {
    var editor = vscode.window.activeTextEditor;
    const text = editor.document.getText();
    const startIndex = text.indexOf(interFaceText);
    const endIndex = (text.indexOf('}', startIndex)) + 1;

    // Create a new Range object for the desired text
    const startPos = editor.document.positionAt(startIndex);
    const endPos = editor.document.positionAt(endIndex);
    const range = new vscode.Range(startPos, endPos);

    // Select the desired text in the editor
    editor.selection = new vscode.Selection(range.start, range.end);
    return editor.selection;
}
export function findInterfacesInText(text) {
    return text.match(/interface\s+(\w+)\s*\{[\s\S]*?\}/g);
}