const output = document.querySelector('#output');
const bff = globalThis.BFF_URL || '/api';
fetch(`${bff}/aggregated-data`).then(response => {
  if (!response.ok) throw new Error(`BFF HTTP ${response.status}`);
  return response.json();
}).then(data => { output.textContent = JSON.stringify(data, null, 2); })
  .catch(error => { output.textContent = `Não foi possível carregar: ${error.message}`; });
