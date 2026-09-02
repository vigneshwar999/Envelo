import { serve } from 'bun';\nimport { createReadStream } from 'fs';\nserve({ port: 3000, fetch() { return new Response(createReadStream('artifacts/envelo-human-value/src/styles/index.css')) } });
