const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

const replacements = [
    { regex: /bg-\[#(EDF8FF|edf8ff)\]/g, replacement: 'bg-main' },
    { regex: /\bbg-white\b/g, replacement: 'bg-card' },
    { regex: /\bbg-gray-50\/50\b/g, replacement: 'bg-card' },
    { regex: /(?<!hover:)\bbg-gray-50\b(?!\/)/g, replacement: 'bg-card' },
    { regex: /(?<!hover:)\bbg-blue-50\b(?!\/)/g, replacement: 'bg-card' },
    { regex: /(?<!hover:)\bbg-orange-50\b(?!\/)/g, replacement: 'bg-card' },
    { regex: /(?<!hover:)\bbg-yellow-50\b(?!\/)/g, replacement: 'bg-card' },
    { regex: /(?<!hover:)\bbg-red-50\b(?!\/)/g, replacement: 'bg-card' },
    { regex: /(?<!hover:)\bbg-purple-50\b(?!\/)/g, replacement: 'bg-card' },

    { regex: /\btext-gray-900\b/g, replacement: 'text-primary' },
    { regex: /\btext-gray-800\b/g, replacement: 'text-primary' },
    { regex: /\btext-gray-700\b/g, replacement: 'text-primary' },

    { regex: /\btext-gray-600\b/g, replacement: 'text-secondary' },
    { regex: /\btext-gray-500\b/g, replacement: 'text-secondary' },
    { regex: /\btext-gray-400\b/g, replacement: 'text-secondary' },

    { regex: /\bborder-gray-100\b/g, replacement: 'border-theme' },
    { regex: /\bborder-gray-200\b/g, replacement: 'border-theme' },

    { regex: /\btext-blue-600\b/g, replacement: 'text-[#00D1FF]' },
    { regex: /\btext-yellow-600\b/g, replacement: 'text-[#00FFA3]' },
    { regex: /\btext-red-600\b/g, replacement: 'text-[#A855F7]' },
    { regex: /\btext-orange-600\b/g, replacement: 'text-[#F59E0B]' },
    { regex: /bg-\[#1976D2\]/g, replacement: 'bg-accent' },
    { regex: /text-\[#1976D2\]/g, replacement: 'text-accent' },
    { regex: /#42aeec/g, replacement: 'var(--accent-blue)' },
    { regex: /#1db5f5/g, replacement: 'var(--accent-blue)' },
    { regex: /#0ea3d8/g, replacement: 'rgba(0,209,255,0.15)' },
    { regex: /\bborder-gray-300\b/g, replacement: 'border-theme' },
    { regex: /\bhover:bg-card\b/g, replacement: 'hover:bg-[rgba(255,255,255,0.03)]' },
    { regex: /\bdivide-gray-200\b/g, replacement: 'divide-theme' },

    // Match: style={{ backgroundColor: '#EDF8FF' }} and its variations correctly
    { regex: /style=\{\{\s*backgroundColor:\s*['"]#(EDF8FF|edf8ff)['"]\s*\}\}/g, replacement: '' }
];

function walkSync(currentDirPath, callback) {
    fs.readdirSync(currentDirPath).forEach(function (name) {
        var filePath = path.join(currentDirPath, name);
        if (filePath.includes('node_modules')) return; // ignore node_modules
        var stat = fs.statSync(filePath);
        if (stat.isFile()) {
            callback(filePath, stat);
        } else if (stat.isDirectory()) {
            walkSync(filePath, callback);
        }
    });
}

let filesChanged = 0;
let totalReplacedFiles = [];

walkSync(srcDir, function (filePath) {
    if (!filePath.match(/\.(tsx|jsx|ts|js)$/)) return;

    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // First safely handle the hover variant
    content = content.replace(/\bhover:bg-gray-50\b(?!\/)/g, 'hover:bg-[rgba(255,255,255,0.03)]');

    // Then handle the rest
    replacements.forEach(r => {
        content = content.replace(r.regex, r.replacement);
    });

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        filesChanged++;
        totalReplacedFiles.push(filePath);
    }
});

console.log(`Successfully updated styling classes globally across ${filesChanged} files!`);
if (filesChanged > 0) {
    console.log("Updated files:");
    totalReplacedFiles.slice(0, 10).forEach(f => console.log(" - " + f));
    if (totalReplacedFiles.length > 10) {
        console.log(`   ...and ${totalReplacedFiles.length - 10} more.`);
    }
}
