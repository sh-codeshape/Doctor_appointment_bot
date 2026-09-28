const http = require('http');
http.get('http://localhost:3000/api/medicine-remarks', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Remarks:', data));
});
http.get('http://localhost:3000/api/medicine-dosages', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Dosages:', data));
});
