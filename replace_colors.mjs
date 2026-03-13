import fs from 'fs';
import path from 'path';

const files = [
  'app/attraction/[id].tsx',
  'app/create-post.tsx',
  'app/destination/[id].tsx',
  'app/discover-spots.tsx',
  'app/festival/[id].tsx',
  'app/island/[id].tsx',
  'app/itinerary/[id].tsx',
  'app/municipality/[id].tsx',
  'app/onboarding/index.tsx',
  'app/onboarding/main-slider.tsx',
  'app/profile/edit.tsx',
  'app/profile/settings.tsx',
  'app/province/[id].tsx',
  'app/region/[id].tsx',
  'app/room/[roomId].tsx',
  'app/(tabs)/profile.tsx',
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
  
  content = content.replace(/([a-zA-Z]+)="?(#(?:2563EB|3B82F6|2563eb|3b82f6))"?/g, '$1={Colors.primary}');
  content = content.replace(/(['"`])#(?:2563EB|3B82F6|2563eb|3b82f6)\1/g, 'Colors.primary');

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
    
    const count = (originalContent.match(/#(?:2563EB|3B82F6|2563eb|3b82f6)/ig) || []).length;
    console.log(`Updated ${file}: ${count} replacements.`);
    totalReplacements += count;
  }
}

console.log(`\nTotal replacements: ${totalReplacements}`);
