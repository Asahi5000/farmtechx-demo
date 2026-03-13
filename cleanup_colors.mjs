import fs from 'fs';
import path from 'path';

const files = [
  'app/profile/edit.tsx',
  'app/onboarding/main-slider.tsx',
  'app/auth/signin.tsx',
  'app/auth/forgot-password.tsx',
  'app/auth/email-signup.tsx',
];

const basePath = "C:\\Users\\Admin\\Downloads\\LayasPinas";

let totalReplacements = 0;

for (const file of files) {
  const fullPath = path.join(basePath, file);
  if (!fs.existsSync(fullPath)) {
    console.log(`Not found: ${file}`);
    continue;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  let originalContent = content;
  
  // Replace prop usage e.g. color="#1E9FE5" -> color={Colors.primary}
  content = content.replace(/([a-zA-Z]+)="?(#(?:0FA3E2|1E9FE5|0fa3e2|1e9fe5))"?/g, '$1={Colors.primary}');
  
  // Replace string usage e.g. '#1E9FE5' -> Colors.primary
  content = content.replace(/(['"`])#(?:0FA3E2|1E9FE5|0fa3e2|1e9fe5)\1/g, 'Colors.primary');

  if (content !== originalContent) {
    if (!content.includes('import { Colors }')) {
        const match = content.match(/import\s+.*?\s+from\s+['"].*?['"];?\n/);
        if (match) {
            const insertIndex = match.index + match[0].length;
            content = content.slice(0, insertIndex) + "import { Colors } from '@/constants/Colors';\n" + content.slice(insertIndex);
        } else {
            content = "import { Colors } from '@/constants/Colors';\n" + content;
        }
    }
    
    fs.writeFileSync(fullPath, content, 'utf8');
    
    const count = (originalContent.match(/#(?:0FA3E2|1E9FE5|0fa3e2|1e9fe5)/ig) || []).length;
    console.log(`Updated ${file}: ${count} replacements.`);
    totalReplacements += count;
  }
}

console.log(`\nTotal replacements: ${totalReplacements}`);
