#!/usr/bin/env node

/**
 * Documentation Index Generator
 * 
 * Automatically scans /docs folder and generates an updated README.md index
 * 
 * Usage:
 *   node scripts/generate-docs-index.js
 *   npm run docs:generate
 */

const fs = require('fs');
const path = require('path');

const DOCS_DIR = path.join(__dirname, '../docs');
const OUTPUT_FILE = path.join(DOCS_DIR, 'README.md');

// Folders to scan (in display order)
const CATEGORIES = {
    'features': {
        title: '🎯 Features',
        description: 'Complete feature documentation (ONE file per feature)',
        emoji: '⭐'
    },
    'testing': {
        title: '🧪 Testing',
        description: 'Step-by-step testing guides (screen-by-screen flows)',
        emoji: '✅'
    },
    'api': {
        title: '🔌 API Documentation',
        description: 'API endpoints, integrations, and backend services',
        emoji: '📡'
    },
    'architecture': {
        title: '🏗️ Architecture',
        description: 'System design, patterns, and architectural decisions',
        emoji: '🏛️'
    },
    'implementation': {
        title: '⚙️ Implementation',
        description: 'Implementation guides and migration notes',
        emoji: '🔧'
    },
    'guides': {
        title: '📖 Guides',
        description: 'How-to guides and tutorials',
        emoji: '📚'
    },
    'analytics': {
        title: '📊 Analytics',
        description: 'Analytics setup, tracking, and monitoring',
        emoji: '📈'
    },
    'payments': {
        title: '💳 Payments',
        description: 'Payment integration and pricing documentation',
        emoji: '💰'
    },
    'product': {
        title: '📦 Product',
        description: 'Product requirements and project overview',
        emoji: '🎁'
    },
    'reviews': {
        title: '🔍 Reviews',
        description: 'Code reviews and enhancement proposals',
        emoji: '👀'
    }
};

/**
 * Get all markdown files in a directory
 */
function getMarkdownFiles(dir) {
    try {
        const files = fs.readdirSync(dir);
        return files
            .filter(file => file.endsWith('.md') && file !== 'README.md')
            .map(file => {
                const fullPath = path.join(dir, file);
                const stats = fs.statSync(fullPath);
                const content = fs.readFileSync(fullPath, 'utf8');
                
                // Extract title from first # heading
                const titleMatch = content.match(/^#\s+(.+)$/m);
                const title = titleMatch ? titleMatch[1].replace(/[🎯📊🔌⚙️📖💳🏗️🔍⭐📚📈💰🎁👀]/g, '').trim() : file.replace('.md', '');
                
                // Extract description from content (first paragraph after title)
                const descMatch = content.match(/^#.+\n\n(.+)/m);
                const description = descMatch ? descMatch[1].substring(0, 100) + (descMatch[1].length > 100 ? '...' : '') : '';
                
                return {
                    file,
                    title,
                    description,
                    size: Math.round(stats.size / 1024 * 10) / 10 // KB with 1 decimal
                };
            })
            .sort((a, b) => a.title.localeCompare(b.title));
    } catch (error) {
        return [];
    }
}

/**
 * Count total docs in category including subdirectories
 */
function countDocsInCategory(dir) {
    let count = 0;
    
    function scanDir(currentDir) {
        try {
            const items = fs.readdirSync(currentDir);
            items.forEach(item => {
                const fullPath = path.join(currentDir, item);
                const stats = fs.statSync(fullPath);
                
                if (stats.isDirectory()) {
                    scanDir(fullPath);
                } else if (item.endsWith('.md') && item !== 'README.md') {
                    count++;
                }
            });
        } catch (error) {
            // Ignore errors
        }
    }
    
    scanDir(dir);
    return count;
}

/**
 * Generate markdown documentation
 */
function generateDocumentation() {
    let markdown = `# 📚 Documentation Index

Comprehensive documentation for the MenuListAI Dashboard project.

**Last Updated:** ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}

---

## 📁 Folder Structure

\`\`\`
docs/
├── README.md                  # This file - Auto-generated index
`;

    // Add folder structure
    Object.keys(CATEGORIES).forEach(category => {
        const categoryPath = path.join(DOCS_DIR, category);
        if (fs.existsSync(categoryPath)) {
            const count = countDocsInCategory(categoryPath);
            markdown += `├── ${category}/                    # ${CATEGORIES[category].description} (${count} docs)\n`;
        }
    });

    markdown += `└── [other]/                   # Specialized documentation
\`\`\`

---

## 📖 Documentation by Category

`;

    let totalDocs = 0;
    const stats = {};

    // Generate sections for each category
    Object.keys(CATEGORIES).forEach(category => {
        const categoryPath = path.join(DOCS_DIR, category);
        const categoryInfo = CATEGORIES[category];
        
        if (!fs.existsSync(categoryPath)) return;
        
        const files = getMarkdownFiles(categoryPath);
        if (files.length === 0) return;
        
        totalDocs += files.length;
        stats[category] = files.length;
        
        markdown += `### ${categoryInfo.title}\n\n`;
        markdown += `${categoryInfo.description}\n\n`;
        
        files.forEach(({ file, title, description }) => {
            const relativePath = `./${category}/${file}`;
            markdown += `- ${categoryInfo.emoji} **[${title}](${relativePath})**\n`;
            if (description) {
                markdown += `  - ${description}\n`;
            }
        });
        
        markdown += `\n`;
    });

    // Add quick reference
    markdown += `---

## 🔗 Quick Reference

### Most Important Docs

- 🔒 **[Rate Limiting](../RATE_LIMITING.md)** - Rate limit implementation and configs
- 🧪 **[Rate Limit Testing](../RATE_LIMIT_TESTING.md)** - How to test rate limiting
- 🎯 **[Features Overview](./features/)** - All feature documentation

### By Topic

`;

    Object.keys(CATEGORIES).forEach(category => {
        if (stats[category]) {
            markdown += `- **${CATEGORIES[category].title}**: [${category}/](./${category}/) (${stats[category]} docs)\n`;
        }
    });

    markdown += `
---

## 📊 Documentation Stats

| Category | Documents | Status |
|----------|-----------|--------|
`;

    Object.keys(CATEGORIES).forEach(category => {
        if (stats[category]) {
            markdown += `| ${CATEGORIES[category].title} | ${stats[category]} | ✅ Up to date |\n`;
        }
    });

    markdown += `| **Total** | **${totalDocs}** | ✅ |\n`;

    // Add standards
    markdown += `
---

## 🎯 Documentation Standards

### **When to Create Documentation**

1. **New Features** → Create/Update in \`features/\` (ONE file per feature)
2. **API Endpoints** → Add to \`api/\`
3. **Architectural Patterns** → Add to \`architecture/\`
4. **Implementation Guides** → Add to \`implementation/\`
5. **How-to Guides** → Add to \`guides/\`

### **Naming Convention**

\`\`\`
FEATURE_NAME.md

Examples:
- RATE_LIMITING.md
- AUTHENTICATION.md
- PAYMENT_INTEGRATION.md
\`\`\`

### **Required Sections**

Every documentation file should include:
- 📋 Overview/Summary
- 🎯 Purpose/Goals
- 🔧 Implementation details
- 💡 Code examples
- ✅ Benefits/Impact
- 🚀 Future enhancements (if applicable)

---

## 🔄 Maintenance

### Updating Documentation

Documentation should be updated when:
- ✅ New features are added
- ✅ Existing patterns change
- ✅ Components are refactored
- ✅ Issues are discovered
- ✅ New best practices emerge

### Re-generating This Index

This file is auto-generated. To update it, run:

\`\`\`bash
npm run docs:generate
# or
node scripts/generate-docs-index.js
\`\`\`

---

**Need to add documentation?** Follow the standards above and place it in the appropriate folder, then regenerate this index!
`;

    return markdown;
}

// Main execution
console.log('🔍 Scanning documentation...');
const documentation = generateDocumentation();

fs.writeFileSync(OUTPUT_FILE, documentation);
console.log('✅ Documentation index generated successfully!');
console.log(`📄 Output: ${OUTPUT_FILE}`);
console.log('\n📊 Summary:');
console.log(documentation.match(/\| \*\*Total\*\* .+/)?.[0] || 'Stats unavailable');
