import fs from 'fs';
import path from 'path';

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

const basePath = "C:\\Users\\Admin\\Downloads\\layaspinas_new_dashboard\\src";
let totalReplacements = 0;

walkDir(basePath, (filePath) => {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // 1. Replace Descriptions entirely if matching constraints
    content = content.replace(/description:\s*["']([^"']+)["']/g, (match, descStr) => {
        if (descStr.includes('TailAdmin') || descStr.toLowerCase().includes('template')) {
            return `description: "LayasPinas Content Management System"`;
        }
        return match;
    });

    // 2. Replace Title substrings based on user request mapping
    content = content.replace(/title:\s*["']([^"']+)["']/g, (match, titleStr) => {
        let newTitle = titleStr;
        if (newTitle.includes('TailAdmin') || newTitle.toLowerCase().includes('next.js') || newTitle.includes('Dashboard Template')) {
            newTitle = newTitle.replace(/TailAdmin/g, 'LayasPinas Admin');
            newTitle = newTitle.replace(/Next\.js/gi, 'LayasPinas Admin');
            newTitle = newTitle.replace(/Dashboard Template/gi, 'LayasPinas CMS');
        }
        return `title: "${newTitle}"`;
    });

    // 3. Any straggling direct TailAdmin strings in generic text content
    content = content.replace(/TailAdmin/g, 'LayasPinas Admin');

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated metadata in ${filePath.replace(basePath, '')}`);
      totalReplacements++;
    }
  }
});

console.log(`\nGlobal metadata replacement complete! Updated ${totalReplacements} files.`);
