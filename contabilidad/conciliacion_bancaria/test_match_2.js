const { toNumber } = require('./parsers.js');
console.log('Testing toNumber:');
console.log('"$ 8.074,00" ->', toNumber('$ 8.074,00'));
console.log('"$8.074,00" ->', toNumber('$8.074,00'));
