let text = [
    'companyIds:object',
    'projectId:string',
    'ignorecompany:boolean',
    ''
];
let updatedText = []
text.forEach(text => {
    if (text != '' && text.includes(':')) {
        let splitText = text.split(':');
        if (['boolean', 'string', 'object'].includes(splitText[1])) {
            updatedText.push(`${splitText[0]} : data.${splitText[0]}`);
        }
    }
});
console.log(updatedText.join(';'));