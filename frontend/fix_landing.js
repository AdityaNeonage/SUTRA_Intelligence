const fs = require('fs');
let code = fs.readFileSync('src/Landing.tsx', 'utf8');

code = code.replace(
  "import { cn } from './lib/utils';",
  "import { cn } from './lib/utils';\nimport { HoloSection } from './HoloSection';"
);

code = code.replace(
  "<DeepDive />\n          <Features />",
  "<DeepDive />\n          <HoloSection />\n          <Features />"
);

fs.writeFileSync('src/Landing.tsx', code);
