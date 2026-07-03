# 🛠️ Utilities & Helper Functions

**File**: `src/components/templates/main-app/projects/utils.ts`  
**Lines**: 626 total  
**Status**: Implemented reference; not current launch certification

---

**Launch boundary:** This utilities reference documents helper behavior for the Projects feature. It is not production-launch approval. Current release readiness requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [production-readiness checklist](../production-readiness/README.md), and [External Certification Runbook](../production-readiness/external-certification-runbook.md) evidence.

---

## Overview

Comprehensive collection of utility functions supporting the Projects feature. Includes PDF conversion, data transformation, Excel export, styling helpers, and data manipulation functions.

**Categories**:
- 📄 PDF Processing
- 🔄 Data Transformation
- 📊 Excel/JSON Export
- 🎨 Styling Helpers
- 🔍 Data Queries
- 🔢 ID Generation
- ✅ Validation

---

## PDF Processing

### **convertPdfToImages**

**Purpose**: Convert PDF pages to JPEG images client-side

```typescript
export const convertPdfToImages = async (
  pdfFile: any[],
  tenantId: any,
  storeId: any
): Promise<any[]> => {
  const convertedImages = [];
  let prossesedFiles: string[] = [];

  return new Promise(async (resolve, reject) => {
    if (pdfFile?.length) {
      console.log("started conversion");
      const startTime = Date.now();
      
      try {
        // Process each PDF file sequentially
        for (const file of pdfFile) {
          if (prossesedFiles.includes(file.uid)) continue;
          prossesedFiles.push(file.uid);
          
          const fileArrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: fileArrayBuffer }).promise;

          // Process each page of the current PDF
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 1.5 });

            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({
              canvasContext: context!,
              viewport: viewport
            }).promise;
            
            const pageUrl = canvas.toDataURL('image/jpeg', 0.8);
            const imageData = {
              uid: `${tenantId}${Math.random().toString(36).substring(2, 5).toUpperCase()}${storeId}`,
              name: `${pdfFile[0].name.replace('.pdf', '')}-page-${i + 1}.jpg`,
              size: Math.round(pageUrl.length * 0.75), // Approximate size from base64
              type: 'image/jpeg',
              url: pageUrl,
              fileId: file.uid
            };
            convertedImages.push(imageData);
          }
        }

        const processingTime = Date.now() - startTime;
        console.log("Processing Time", (processingTime / 1000).toFixed(2), "seconds");
        prossesedFiles = [];
        resolve(convertedImages);

      } catch (error) {
        console.error('Error converting PDF:', error);
        message.error('Failed to convert PDF pages to images');
        resolve([]);
      }
    } else {
      resolve([]);
    }
  });
};
```

**Parameters**:
- `pdfFile`: Array of PDF File objects
- `tenantId`: Tenant identifier for unique UID generation
- `storeId`: Store identifier for unique UID generation

**Returns**: Array of image objects with:
- `uid`: Unique identifier
- `name`: Generated filename
- `size`: Approximate size in bytes
- `type`: 'image/jpeg'
- `url`: Base64 data URL
- `fileId`: Reference to source PDF

**Configuration**:
- Scale: `1.5` (balance between quality and size)
- Quality: `0.8` (JPEG compression)
- Format: JPEG (smaller than PNG)

---

## Data Transformation

### **transformDataIds**

**Purpose**: Transform IDs to ensure uniqueness across multiple files

```typescript
export const transformDataIds = (extractedData: any, fileId: string) => {
  const data = extractedData.data;

  if (!data || Object.keys(data).length === 0) return extractedData;

  // Create a mapping of old category IDs to new ones
  const categoryIdMap = {};
  data?.categories?.forEach((category: ExtractedDataCategory) => {
    const oldId = category.id;
    const newId = `${fileId}c${oldId}`;
    categoryIdMap[oldId] = newId;
    category.id = newId;
    category.active = true;
  });

  // Update item IDs and their category references
  data?.items?.forEach((item: ExtractedDataItem) => {
    item.id = `${fileId}i${item.id}`;
    // Update the category reference using the mapping
    if (item.category !== undefined) {
      item.category = categoryIdMap[item.category];
    }
    item.active = true;
    
    // Update attribute IDs
    if (item.attributes && Array.isArray(item.attributes)) {
      item.attributes.forEach((attr: ExtractedDataAttribute) => {
        attr.id = `${item.id}a${attr.id}`;
        attr.active = true;
      });
    }
  });

  return { ...extractedData, data };
};
```

**ID Format**:
- Category: `{fileId}c{originalId}` → `file123c1`
- Item: `{fileId}i{originalId}` → `file123i5`
- Attribute: `{itemId}a{originalId}` → `file123i5a1`

**Why Transform**:
- Multiple files may have same IDs (1, 2, 3...)
- Prevents ID collisions when merging files
- Maintains relationships (item → category)

---

## Excel Export

### **handleDownload**

**Purpose**: Export project data as JSON or Excel

```typescript
export const handleDownload = (projectData: Project, type: 'json' | 'xlsx') => {
  const data = getOutputJson(projectData);

  if (type === 'json') {
    // Create and download JSON file
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'menu_data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return;
  }

  // Excel download
  const wb = XLSX.utils.book_new();

  // Extract language codes
  const languageCodes = data.languages.map(lang => {
    const match = lang.match(/\((.*?)\)/);
    return match ? match[1] : lang;
  });

  // Create sheets
  const languagesSheet = createLanguagesSheet(data.languages);
  const categoriesSheet = createCategoriesSheet(data.categories, languageCodes);
  const itemsSheet = createItemsSheet(data.items, languageCodes);
  const combinedSheet = createCombinedSheet(data.items, data.categories, languageCodes);

  // Add sheets to workbook
  if (languagesSheet) {
    XLSX.utils.book_append_sheet(wb, languagesSheet, 'Languages');
  }
  XLSX.utils.book_append_sheet(wb, categoriesSheet, 'Categories');
  XLSX.utils.book_append_sheet(wb, itemsSheet, 'Items');
  XLSX.utils.book_append_sheet(wb, combinedSheet, 'Combined');

  // Download the file
  XLSX.writeFile(wb, 'menu_data.xlsx');
};
```

### **Excel Sheet Creators**

#### **Languages Sheet**

```typescript
const createLanguagesSheet = (languages: string[]) => {
  if (!languages || languages.length === 0) return null;

  const data = [
    ['Language'],
    ...languages.map(lang => [lang])
  ];

  return XLSX.utils.aoa_to_sheet(data);
};
```

#### **Categories Sheet**

```typescript
const createCategoriesSheet = (
  categories: ExtractedDataCategory[],
  languageCodes: string[]
) => {
  const headers = ['ID', ...languageCodes.map(code => `Name (${code})`)];
  
  const rows = categories.map(category => {
    const row = [category.id];
    languageCodes.forEach(code => {
      row.push(category.name[code] || '');
    });
    return row;
  });

  return XLSX.utils.aoa_to_sheet([headers, ...rows]);
};
```

#### **Items Sheet**

```typescript
const createItemsSheet = (
  items: ExtractedDataItem[],
  languageCodes: string[]
) => {
  const headers = [
    'ID',
    'Category',
    'Price',
    'Currency',
    ...languageCodes.flatMap(code => [
      `Name (${code})`,
      `Description (${code})`
    ])
  ];

  const rows = items.map(item => {
    const row = [
      item.id,
      item.category,
      item.price,
      item.currency || 'USD'
    ];
    
    languageCodes.forEach(code => {
      row.push(item.name[code] || '');
      row.push(item.description?.[code] || '');
    });
    
    return row;
  });

  return XLSX.utils.aoa_to_sheet([headers, ...rows]);
};
```

#### **Combined Sheet**

```typescript
const createCombinedSheet = (
  items: ExtractedDataItem[],
  categories: ExtractedDataCategory[],
  languageCodes: string[]
) => {
  const headers = [
    'Category',
    'Item',
    'Price',
    'Currency',
    'Description'
  ];

  const rows = items.map(item => {
    const category = categories.find(c => c.id === item.category);
    const primaryLang = languageCodes[0];
    
    return [
      category?.name[primaryLang] || '',
      item.name[primaryLang] || '',
      item.price,
      item.currency || 'USD',
      item.description?.[primaryLang] || ''
    ];
  });

  return XLSX.utils.aoa_to_sheet([headers, ...rows]);
};
```

---

## Data Aggregation

### **getOutputJson**

**Purpose**: Consolidate data from multiple files

```typescript
export const getOutputJson = (projectData: Project) => {
  if (!projectData.files) return { categories: [], items: [], languages: [] };

  const allCategories: ExtractedDataCategory[] = [];
  const allItems: ExtractedDataItem[] = [];
  const allLanguages: string[] = [];

  // Collect data from all files
  projectData.files.forEach((file: ProjectFileType) => {
    if (!file.extractedData?.data) return;

    const { categories, items, languages } = file.extractedData.data;

    // Add categories
    categories?.forEach(category => {
      if (!allCategories.find(c => c.id === category.id)) {
        allCategories.push(category);
      }
    });

    // Add items
    items?.forEach(item => {
      if (!allItems.find(i => i.id === item.id)) {
        allItems.push(item);
      }
    });

    // Add languages
    languages?.forEach(lang => {
      const langStr = `${lang.name} (${lang.code})`;
      if (!allLanguages.includes(langStr)) {
        allLanguages.push(langStr);
      }
    });
  });

  return {
    categories: allCategories,
    items: allItems,
    languages: allLanguages
  };
};
```

**Deduplication**:
- Checks by ID to avoid duplicates
- Maintains original order
- Combines languages from all files

---

## Styling Helpers

### **getBackgroundStyles**

```typescript
export const getBackgroundStyles = (container?: any): React.CSSProperties => {
  if (!container) return {};

  const styles: React.CSSProperties = {};

  if (container.backgroundImage) {
    styles.backgroundImage = `url(${container.backgroundImage})`;
    styles.backgroundSize = 'cover';
    styles.backgroundPosition = 'center';
    styles.backgroundRepeat = 'no-repeat';
  } else if (container.background) {
    // Support both solid colors and gradients
    styles.background = container.background;
  }

  return styles;
};
```

### **getBorderStyles**

```typescript
export const getBorderStyles = (border?: StyleObject): React.CSSProperties => {
  if (!border) return {};

  return {
    borderWidth: border.borderWidth ? `${border.borderWidth}px` : undefined,
    borderStyle: border.borderStyle || undefined,
    borderColor: border.borderColor || undefined,
    borderRadius: border.borderRadius ? `${border.borderRadius}px` : undefined
  };
};
```

### **getTextStyles**

```typescript
export const getTextStyles = (text?: StyleObject): React.CSSProperties => {
  if (!text) return {};

  return {
    fontSize: text.fontSize ? `${text.fontSize}px` : undefined,
    fontFamily: text.fontFamily || undefined,
    color: text.color || undefined,
    fontWeight: text.fontWeight || undefined,
    fontStyle: text.fontStyle || undefined,
    textDecoration: text.textDecoration || undefined,
    lineHeight: text.lineHeight || undefined,
    letterSpacing: text.letterSpacing ? `${text.letterSpacing}px` : undefined
  };
};
```

### **getResponsiveFontSize**

```typescript
export const getResponsiveFontSize = (
  baseSize?: number,
  scale: 'small' | 'medium' | 'large' = 'medium'
): number => {
  if (!baseSize) return 16;

  const scaleFactors = {
    small: 0.8,
    medium: 1,
    large: 1.2
  };

  return baseSize * scaleFactors[scale];
};
```

### **makeLighterColor**

```typescript
export const makeLighterColor = (color: string, percent: number): string => {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;

  return '#' + (
    0x1000000 +
    (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
    (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
    (B < 255 ? (B < 1 ? 0 : B) : 255)
  ).toString(16).slice(1);
};
```

---

## Data Update Helpers

### **handleUpdateValue**

**Purpose**: Update specific field in extracted data by ID

```typescript
export const handleUpdateValue = (
  extractedData: ExtractedData,
  id: string,
  field: string,
  value: any,
  activeLanguage: string
): ExtractedData => {
  const data = { ...extractedData };

  // Update in categories
  const categoryIndex = data.data.categories.findIndex(c => c.id === id);
  if (categoryIndex !== -1) {
    const category = { ...data.data.categories[categoryIndex] };
    
    if (field === 'name' || field === 'description') {
      category[field] = {
        ...category[field],
        [activeLanguage]: value
      };
    } else {
      category[field] = value;
    }
    
    data.data.categories[categoryIndex] = category;
    return data;
  }

  // Update in items
  const itemIndex = data.data.items.findIndex(i => i.id === id);
  if (itemIndex !== -1) {
    const item = { ...data.data.items[itemIndex] };
    
    if (field === 'name' || field === 'description') {
      item[field] = {
        ...item[field],
        [activeLanguage]: value
      };
    } else {
      item[field] = value;
    }
    
    data.data.items[itemIndex] = item;
    return data;
  }

  // Update in attributes
  for (let i = 0; i < data.data.items.length; i++) {
    const item = data.data.items[i];
    if (!item.attributes) continue;

    const attrIndex = item.attributes.findIndex(a => a.id === id);
    if (attrIndex !== -1) {
      const attr = { ...item.attributes[attrIndex] };
      
      if (field === 'name') {
        attr.name = {
          ...attr.name,
          [activeLanguage]: value
        };
      } else {
        attr[field] = value;
      }
      
      item.attributes[attrIndex] = attr;
      data.data.items[i] = item;
      return data;
    }
  }

  return data;
};
```

---

## Validation Helpers

### **validateProjectData**

```typescript
export const validateProjectData = (project: Project): {
  valid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  if (!project.projectId) {
    errors.push('Missing project ID');
  }

  if (!project.languages || project.languages.length === 0) {
    errors.push('At least one language is required');
  }

  if (!project.files || project.files.length === 0) {
    errors.push('At least one file is required');
  }

  // Validate files
  project.files?.forEach((file, index) => {
    if (!file.uid) {
      errors.push(`File ${index}: Missing UID`);
    }
    if (!file.url) {
      errors.push(`File ${index}: Missing URL`);
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
};
```

### **validateExtractedData**

```typescript
export const validateExtractedData = (data: ExtractedData): {
  valid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  if (!data.data) {
    errors.push('Missing data object');
    return { valid: false, errors };
  }

  // Validate categories
  data.data.categories?.forEach((cat, index) => {
    if (!cat.id) {
      errors.push(`Category ${index}: Missing ID`);
    }
    if (!cat.name || Object.keys(cat.name).length === 0) {
      errors.push(`Category ${index}: Missing name translations`);
    }
  });

  // Validate items
  data.data.items?.forEach((item, index) => {
    if (!item.id) {
      errors.push(`Item ${index}: Missing ID`);
    }
    if (!item.name || Object.keys(item.name).length === 0) {
      errors.push(`Item ${index}: Missing name translations`);
    }
    if (typeof item.price !== 'number' || item.price < 0) {
      errors.push(`Item ${index}: Invalid price`);
    }
    if (!item.category) {
      errors.push(`Item ${index}: Missing category`);
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
};
```

---

## Query Helpers

### **getUniqueCategories**

```typescript
export const getUniqueCategories = (project: Project): ExtractedDataCategory[] => {
  const categoriesMap = new Map<string, ExtractedDataCategory>();

  project.files?.forEach(file => {
    if (!file.extractedData?.data?.categories) return;

    file.extractedData.data.categories.forEach(category => {
      if (!categoriesMap.has(category.id)) {
        categoriesMap.set(category.id, category);
      }
    });
  });

  return Array.from(categoriesMap.values());
};
```

### **getItemsForCategory**

```typescript
export const getItemsForCategory = (
  project: Project,
  categoryId: string | null
): ExtractedDataItem[] => {
  const items: ExtractedDataItem[] = [];

  project.files?.forEach(file => {
    if (!file.extractedData?.data?.items) return;

    file.extractedData.data.items.forEach(item => {
      if (categoryId === null || item.category === categoryId) {
        if (!items.find(i => i.id === item.id)) {
          items.push(item);
        }
      }
    });
  });

  return items;
};
```

### **searchItems**

```typescript
export const searchItems = (
  items: ExtractedDataItem[],
  query: string,
  language: string
): ExtractedDataItem[] => {
  if (!query) return items;

  const lowerQuery = query.toLowerCase();

  return items.filter(item => {
    const name = item.name[language]?.toLowerCase() || '';
    const description = item.description?.[language]?.toLowerCase() || '';

    return name.includes(lowerQuery) || description.includes(lowerQuery);
  });
};
```

---

## Format Helpers

### **formatPrice**

```typescript
export const formatPrice = (price: number, currency: string = 'USD'): string => {
  const currencySymbols = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    INR: '₹',
    AED: 'د.إ'
  };

  const symbol = currencySymbols[currency] || currency;
  
  return `${symbol}${price.toFixed(2)}`;
};
```

### **formatFileSize**

```typescript
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};
```

---

## Best Practices

1. **Always validate input** before processing
2. **Handle errors gracefully** (try-catch, fallbacks)
3. **Use TypeScript types** for all parameters
4. **Document parameters and return values**
5. **Provide default values** where appropriate
6. **Optimize for performance** (memoization, caching)
7. **Keep functions pure** when possible
8. **Use descriptive names**
9. **Add JSDoc comments** for complex logic
10. **Test edge cases**

---

## Performance Tips

### **Memoization**

```typescript
import { useMemo } from 'react';

const uniqueCategories = useMemo(() => {
  return getUniqueCategories(project);
}, [project.files]);
```

### **Debouncing**

```typescript
import { debounce } from 'lodash';

const debouncedSearch = useMemo(
  () => debounce((query: string) => {
    setSearchResults(searchItems(items, query, language));
  }, 300),
  [items, language]
);
```

---

## Testing

### **Unit Test Example**

```typescript
describe('transformDataIds', () => {
  it('should transform category IDs', () => {
    const input = {
      data: {
        categories: [{ id: '1', name: { en: 'Test' } }],
        items: []
      }
    };
    
    const result = transformDataIds(input, 'file123');
    
    expect(result.data.categories[0].id).toBe('file123c1');
  });
  
  it('should update item category references', () => {
    const input = {
      data: {
        categories: [{ id: '1', name: { en: 'Cat' } }],
        items: [{ id: '1', name: { en: 'Item' }, category: '1' }]
      }
    };
    
    const result = transformDataIds(input, 'file123');
    
    expect(result.data.items[0].category).toBe('file123c1');
  });
});
```

---

## Future Enhancements

- [ ] PDF optimization (compression, resize)
- [ ] Image format conversion (PNG → WebP)
- [ ] Batch data operations
- [ ] Custom export templates
- [ ] Data validation schemas
- [ ] Performance profiling
- [ ] Automated testing suite
- [ ] Utility documentation generator

---

**[← Back: Project Management](./project-management/README.md)** | **[Back to Overview →](./00-overview.md)**
