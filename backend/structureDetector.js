/**
 * Intelligent Document Structure Detection
 * Automatically detects hierarchical structure: Modules > Units > Sections > Topics
 * Works with any document type: PDF, DOCX, TXT, and eventually audio transcripts
 */

/**
 * Structure hierarchy levels
 */
const STRUCTURE_LEVELS = {
  COURSE: 0,      // Course/Document title
  MODULE: 1,      // Module/Part (highest level)
  UNIT: 2,        // Unit/Chapter (mid level)
  SECTION: 3,     // Section/Topic (low level)
  SUBSECTION: 4   // Subsection (lowest level)
};

/**
 * Patterns for detecting different structure levels
 */
const STRUCTURE_PATTERNS = {
  // MODULE patterns (highest level)
  MODULE: [
    /(?:^|\n)={3,}\s*\n\s*MODULE\s+(\d+|[IVXLCDM]+)[:\s\-–—.]*([^\n]*)\n\s*={3,}/gi,
    /(?:^|\n)MODULE\s+(\d+|[IVXLCDM]+)[:\s\-–—.]*([^\n]*)\n={3,}/gi,
    /(?:^|\n)PART\s+(\d+|[IVXLCDM]+)[:\s\-–—.]*([^\n]*)\n={3,}/gi,
    /(?:^|\n)#{1}\s+MODULE\s+(\d+)[:\s\-–—.]*([^\n]+)/gi,
    /(?:^|\n)#{1}\s+PART\s+(\d+)[:\s\-–—.]*([^\n]+)/gi
  ],
  
  // UNIT patterns (mid level)
  UNIT: [
    /(?:^|\n)Unit\s+(\d+(?:\.\d+)?)[:\s\-–—.]*([^\n]*)/gi,
    /(?:^|\n)UNIT\s+(\d+(?:\.\d+)?)[:\s\-–—.]*([^\n]*)/gi,
    /(?:^|\n)Chapter\s+(\d+|[IVXLCDM]+)[:\s\-–—.]*([^\n]*)/gi,
    /(?:^|\n)CHAPTER\s+(\d+|[IVXLCDM]+)[:\s\-–—.]*([^\n]*)/gi,
    /(?:^|\n)#{2}\s+Unit\s+(\d+(?:\.\d+)?)[:\s\-–—.]*([^\n]+)/gi,
    /(?:^|\n)#{2}\s+Chapter\s+(\d+)[:\s\-–—.]*([^\n]+)/gi,
    /(?:^|\n)(\d+\.\d+)[:\s\-–—.]+([A-Z][^\n]{10,80})/g  // e.g., "1.1: Topic Name"
  ],
  
  // SECTION patterns (low level)
  SECTION: [
    /(?:^|\n)Section\s+(\d+(?:\.\d+)?)[:\s\-–—.]*([^\n]*)/gi,
    /(?:^|\n)SECTION\s+(\d+(?:\.\d+)?)[:\s\-–—.]*([^\n]*)/gi,
    /(?:^|\n)#{3}\s+(.{10,80})/g,
    /(?:^|\n)([A-Z][A-Z\s]{10,60})\n-{3,}/g,  // Underlined headers
    /(?:^|\n)(\d+\.\d+\.\d+)[:\s\-–—.]+([A-Z][^\n]{10,80})/g  // e.g., "1.1.1: Topic"
  ],
  
  // TOPIC patterns (lowest level)
  TOPIC: [
    /(?:^|\n)Topic\s+(\d+)[:\s\-–—.]*([^\n]*)/gi,
    /(?:^|\n)#{4,}\s+(.{10,80})/g
  ]
};

/**
 * Detect document structure with hierarchy
 */
function detectDocumentStructure(text) {
  console.log('🔍 Detecting document structure...');
  
  const structure = {
    type: 'document',
    title: extractDocumentTitle(text),
    hierarchy: [],
    flatList: []  // Flattened list for backward compatibility
  };
  
  // Step 1: Detect all structural elements
  const elements = detectAllStructuralElements(text);
  
  if (elements.length === 0) {
    console.log('⚠️  No structure detected, treating as single document');
    return createFlatStructure(text);
  }
  
  // Step 2: Build hierarchy
  structure.hierarchy = buildHierarchy(elements, text);
  
  // Step 3: Create flat list for compatibility
  structure.flatList = flattenHierarchy(structure.hierarchy);
  
  console.log(`✅ Structure detected: ${structure.flatList.length} sections`);
  console.log(`   Hierarchy levels: ${getHierarchyDepth(structure.hierarchy)}`);
  
  return structure;
}

/**
 * Extract document title from first lines
 */
function extractDocumentTitle(text) {
  const lines = text.split('\n').filter(l => l.trim().length > 0);
  
  // Look for course/document title patterns
  const titlePatterns = [
    /^COURSE:\s*(.+)$/i,
    /^DOCUMENT:\s*(.+)$/i,
    /^TITLE:\s*(.+)$/i,
    /^(.{10,100})$/  // First substantial line
  ];
  
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i].trim();
    for (const pattern of titlePatterns) {
      const match = line.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
  }
  
  return lines[0]?.substring(0, 80) || 'Document';
}

/**
 * Detect all structural elements (modules, units, sections)
 */
function detectAllStructuralElements(text) {
  const elements = [];
  
  // Detect each level
  Object.entries(STRUCTURE_PATTERNS).forEach(([level, patterns]) => {
    patterns.forEach(pattern => {
      let match;
      const regex = new RegExp(pattern);
      
      while ((match = regex.exec(text)) !== null) {
        const number = match[1] || '';
        const title = match[2] || match[1] || '';
        
        elements.push({
          level: STRUCTURE_LEVELS[level],
          levelName: level,
          number: number.trim(),
          title: title.trim(),
          position: match.index,
          fullMatch: match[0]
        });
      }
    });
  });
  
  // Sort by position
  elements.sort((a, b) => a.position - b.position);
  
  // Remove duplicates (same position, within 100 chars)
  const unique = [];
  elements.forEach(elem => {
    const isDuplicate = unique.some(existing => 
      Math.abs(elem.position - existing.position) < 100
    );
    if (!isDuplicate) {
      unique.push(elem);
    }
  });
  
  console.log(`   Found ${unique.length} structural elements`);
  return unique;
}

/**
 * Build hierarchical structure from flat elements
 */
function buildHierarchy(elements, text) {
  const hierarchy = [];
  const stack = []; // Track current path in hierarchy
  
  elements.forEach((elem, index) => {
    // Extract content for this element
    const startPos = elem.position;
    const endPos = index < elements.length - 1 ? elements[index + 1].position : text.length;
    const content = text.substring(startPos, endPos).trim();
    
    // Create node
    const node = {
      id: `${elem.levelName.toLowerCase()}_${elem.number || index}`,
      level: elem.level,
      levelName: elem.levelName,
      number: elem.number,
      title: elem.title || `${elem.levelName} ${elem.number}`,
      displayTitle: formatDisplayTitle(elem),
      content: content,
      children: [],
      startPos: startPos,
      endPos: endPos
    };
    
    // Find parent in stack
    while (stack.length > 0 && stack[stack.length - 1].level >= elem.level) {
      stack.pop();
    }
    
    // Add to hierarchy
    if (stack.length === 0) {
      // Top level
      hierarchy.push(node);
    } else {
      // Add as child to parent
      stack[stack.length - 1].children.push(node);
    }
    
    // Add to stack
    stack.push(node);
  });
  
  return hierarchy;
}

/**
 * Format display title for a structural element
 */
function formatDisplayTitle(elem) {
  let title = '';
  
  // Add level prefix
  if (elem.levelName === 'MODULE') {
    title = `Module ${elem.number}`;
  } else if (elem.levelName === 'UNIT') {
    title = `Unit ${elem.number}`;
  } else if (elem.levelName === 'SECTION') {
    title = elem.title || `Section ${elem.number}`;
  } else {
    title = elem.title || `${elem.levelName} ${elem.number}`;
  }
  
  // Add subtitle if exists
  if (elem.title && elem.title !== elem.number) {
    if (!title.includes(elem.title)) {
      title += `: ${elem.title}`;
    }
  }
  
  return title;
}

/**
 * Flatten hierarchy for backward compatibility
 */
function flattenHierarchy(hierarchy, parentPath = '') {
  const flat = [];
  
  hierarchy.forEach((node, index) => {
    const path = parentPath ? `${parentPath}.${index + 1}` : `${index + 1}`;
    
    flat.push({
      id: node.id,
      number: path,
      level: node.level,
      levelName: node.levelName,
      title: node.displayTitle,
      content: node.content,
      startPos: node.startPos,
      endPos: node.endPos,
      hasChildren: node.children.length > 0
    });
    
    // Recursively flatten children
    if (node.children.length > 0) {
      const childrenFlat = flattenHierarchy(node.children, path);
      flat.push(...childrenFlat);
    }
  });
  
  return flat;
}

/**
 * Get maximum depth of hierarchy
 */
function getHierarchyDepth(hierarchy, currentDepth = 1) {
  if (hierarchy.length === 0) return currentDepth - 1;
  
  let maxDepth = currentDepth;
  hierarchy.forEach(node => {
    if (node.children.length > 0) {
      const childDepth = getHierarchyDepth(node.children, currentDepth + 1);
      maxDepth = Math.max(maxDepth, childDepth);
    }
  });
  
  return maxDepth;
}

/**
 * Create flat structure when no hierarchy detected
 */
function createFlatStructure(text) {
  return {
    type: 'document',
    title: extractDocumentTitle(text),
    hierarchy: [{
      id: 'main',
      level: 0,
      levelName: 'DOCUMENT',
      number: '1',
      title: 'Main Content',
      displayTitle: 'Main Content',
      content: text,
      children: [],
      startPos: 0,
      endPos: text.length
    }],
    flatList: [{
      id: 'main',
      number: '1',
      level: 0,
      levelName: 'DOCUMENT',
      title: 'Main Content',
      content: text,
      startPos: 0,
      endPos: text.length,
      hasChildren: false
    }]
  };
}

/**
 * Convert structure to flashcard-compatible format
 */
function structureToChapters(structure) {
  return structure.flatList.map((item, index) => ({
    id: index + 1,
    structureId: item.id,
    level: item.level,
    levelName: item.levelName,
    number: item.number,
    title: item.title,
    content: item.content,
    hasChildren: item.hasChildren,
    // These will be filled by flashcard generation
    cards: 0,
    startIndex: 0,
    endIndex: -1
  }));
}

/**
 * Generate structure summary for display
 */
function generateStructureSummary(structure) {
  const summary = {
    documentTitle: structure.title,
    totalSections: structure.flatList.length,
    hierarchyDepth: getHierarchyDepth(structure.hierarchy),
    breakdown: {}
  };
  
  // Count by level
  structure.flatList.forEach(item => {
    const levelName = item.levelName;
    summary.breakdown[levelName] = (summary.breakdown[levelName] || 0) + 1;
  });
  
  return summary;
}

module.exports = {
  detectDocumentStructure,
  structureToChapters,
  generateStructureSummary,
  STRUCTURE_LEVELS
};
