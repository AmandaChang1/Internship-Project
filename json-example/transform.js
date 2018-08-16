const fs = require('fs');

const contents = fs.readFileSync('sample.json', 'utf-8');
const parsed = JSON.parse(contents);

const transformed = parsed.results.map(item => item.foo.bar);
transformed.push({ name: 'Rose' });
transformed[transformed.length - 1].name = 'No it\'s not rose!';

fs.writeFileSync(Date.now() + '-transformed.json', JSON.stringify(transformed), 'utf-8');
