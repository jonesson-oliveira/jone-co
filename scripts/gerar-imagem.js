const fs = require('fs');
const path = require('path');

const [, , prompt, outputPath] = process.argv;

if (!prompt || !outputPath) {
  console.error('Uso: node --env-file=.env scripts/gerar-imagem.js "PROMPT" "caminho/saida.png"');
  process.exit(1);
}

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error('OPENAI_API_KEY não encontrada. Rode com: node --env-file=.env scripts/gerar-imagem.js ...');
  process.exit(1);
}

(async () => {
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-image-1',
      prompt,
      n: 1,
      size: '1024x1536',
      quality: 'high',
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error('Erro da API OpenAI:', JSON.stringify(data, null, 2));
    process.exitCode = 1;
    return;
  }

  const b64 = data.data[0].b64_json;
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, Buffer.from(b64, 'base64'));
  console.log(`Imagem salva em ${outputPath}`);
})();
