export interface ImportedTreeData {
  treeNumber?: string;
  species?: string;
  commonName?: string;
  dbh?: number;
  height?: number;
  canopySpreadNS?: number;
  canopySpreadEW?: number;
  treeHealth?: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Critical';
  extensionGrowth?: number;
  structure?: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Critical';
  woundWoodDevelopment?: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Critical';
  canopyCover?: number;
  location?: string;
  notes?: string;
  recommendations?: string[];
  title?: string;
}

export const parseDocumentData = async (file: File): Promise<ImportedTreeData[]> => {
  const fileType = file.type;
  const fileName = file.name.toLowerCase();
  
  let text: string;
  
  try {
    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      text = await parsePDF(file);
    } else if (fileType.includes('word') || fileName.endsWith('.doc') || fileName.endsWith('.docx')) {
      text = await parseWord(file);
    } else if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
      text = await parseText(file);
    } else {
      // Try to parse as text anyway
      text = await parseText(file);
    }
    
    return extractTreeData(text);
  } catch (error) {
    throw new Error(`Failed to parse document: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

const parsePDF = async (file: File): Promise<string> => {
  // For now, we'll use a simple text extraction approach
  // In a real implementation, you'd use pdf-parse or similar
  const arrayBuffer = await file.arrayBuffer();
  const text = new TextDecoder().decode(arrayBuffer);
  
  // Try to extract readable text from PDF
  // This is a simplified approach - real PDF parsing would be more complex
  const cleanText = text.replace(/[^\x20-\x7E\n\r]/g, ' ').replace(/\s+/g, ' ');
  
  if (cleanText.length < 50) {
    throw new Error('Could not extract readable text from PDF. Please try converting to a text file first.');
  }
  
  return cleanText;
};

const parseWord = async (file: File): Promise<string> => {
  // For now, we'll try to extract text as plain text
  // In a real implementation, you'd use mammoth.js or similar
  const arrayBuffer = await file.arrayBuffer();
  const text = new TextDecoder().decode(arrayBuffer);
  
  // Try to extract readable text
  const cleanText = text.replace(/[^\x20-\x7E\n\r]/g, ' ').replace(/\s+/g, ' ');
  
  if (cleanText.length < 50) {
    throw new Error('Could not extract readable text from Word document. Please try saving as a text file first.');
  }
  
  return cleanText;
};

const parseText = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      resolve(text);
    };
    reader.onerror = () => reject(new Error('Failed to read text file'));
    reader.readAsText(file);
  });
};

const extractTreeData = (text: string): ImportedTreeData[] => {
  const trees: ImportedTreeData[] = [];
  
  // Split text into potential tree sections
  const sections = splitIntoTreeSections(text);
  
  for (const section of sections) {
    const treeData = parseTreeSection(section);
    if (treeData && (treeData.species || treeData.treeNumber)) {
      trees.push(treeData);
    }
  }
  
  if (trees.length === 0) {
    throw new Error('No tree data found in document. Please check the format and try again.');
  }
  
  return trees;
};

const splitIntoTreeSections = (text: string): string[] => {
  // Try different splitting strategies
  
  // Strategy 1: Split by "TREE" headers
  let sections = text.split(/(?:^|\n)\s*(?:===?\s*)?TREE\s*\d*\s*(?:===?)?\s*$/im);
  if (sections.length > 1) {
    return sections.slice(1); // Remove first empty section
  }
  
  // Strategy 2: Split by tree numbers
  sections = text.split(/(?:^|\n)\s*(?:Tree\s*(?:Number|#|ID)\s*:?\s*[^\n]+)/im);
  if (sections.length > 1) {
    return sections;
  }
  
  // Strategy 3: Split by species patterns
  sections = text.split(/(?:^|\n)\s*(?:Species\s*:?\s*[^\n]+)/im);
  if (sections.length > 1) {
    return sections;
  }
  
  // Strategy 4: Split by multiple blank lines
  sections = text.split(/\n\s*\n\s*\n/);
  if (sections.length > 1) {
    return sections;
  }
  
  // Strategy 5: Treat entire text as one section
  return [text];
};

const parseTreeSection = (section: string): ImportedTreeData | null => {
  const data: ImportedTreeData = {};
  
  // Field patterns to match
  const patterns = {
    treeNumber: /(?:Tree\s*(?:Number|#|ID)|Number)\s*:?\s*([^\n,]+)/i,
    species: /(?:Species|Scientific\s*Name)\s*:?\s*([^\n,]+)/i,
    commonName: /(?:Common\s*Name|Name)\s*:?\s*([^\n,]+)/i,
    dbh: /(?:DBH|Diameter)\s*:?\s*([0-9.]+)/i,
    height: /Height\s*:?\s*([0-9.]+)/i,
    canopySpreadNS: /(?:Canopy\s*Spread\s*(?:N-?S|North\s*South)|Spread\s*NS)\s*:?\s*([0-9.]+)/i,
    canopySpreadEW: /(?:Canopy\s*Spread\s*(?:E-?W|East\s*West)|Spread\s*EW)\s*:?\s*([0-9.]+)/i,
    treeHealth: /(?:Tree\s*Health|Health)\s*:?\s*(Excellent|Good|Fair|Poor|Critical)/i,
    extensionGrowth: /(?:Extension\s*Growth|Growth)\s*:?\s*([0-9.]+)/i,
    structure: /Structure\s*:?\s*(Excellent|Good|Fair|Poor|Critical)/i,
    woundWoodDevelopment: /(?:Wound\s*Wood\s*Development|Wound\s*Wood)\s*:?\s*(Excellent|Good|Fair|Poor|Critical)/i,
    canopyCover: /(?:Canopy\s*Cover|Cover)\s*:?\s*([0-9.]+)/i,
    location: /Location\s*:?\s*([^\n,]+)/i,
    notes: /Notes?\s*:?\s*([^\n]+(?:\n(?!(?:Tree|Species|DBH|Height|Location|Recommendations?)[:\s])[^\n]*)*)/i,
    recommendations: /Recommendations?\s*:?\s*([^\n]+(?:\n(?!(?:Tree|Species|DBH|Height|Location|Notes?)[:\s])[^\n]*)*)/i
  };
  
  // Extract data using patterns
  for (const [key, pattern] of Object.entries(patterns)) {
    const match = section.match(pattern);
    if (match && match[1]) {
      const value = match[1].trim();
      
      if (key === 'dbh' || key === 'height' || key === 'canopySpreadNS' || 
          key === 'canopySpreadEW' || key === 'extensionGrowth' || key === 'canopyCover') {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
          (data as any)[key] = numValue;
        }
      } else if (key === 'treeHealth' || key === 'structure' || key === 'woundWoodDevelopment') {
        const healthValue = value as 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Critical';
        if (['Excellent', 'Good', 'Fair', 'Poor', 'Critical'].includes(healthValue)) {
          (data as any)[key] = healthValue;
        }
      } else if (key === 'recommendations') {
        data.recommendations = value.split(/[,;]/).map(r => r.trim()).filter(r => r.length > 0);
      } else {
        (data as any)[key] = value;
      }
    }
  }
  
  // Try to extract data from table-like formats
  if (!data.species && !data.treeNumber) {
    const tableData = parseTableFormat(section);
    if (tableData) {
      Object.assign(data, tableData);
    }
  }
  
  // Try to extract data from CSV-like formats
  if (!data.species && !data.treeNumber) {
    const csvData = parseCSVFormat(section);
    if (csvData) {
      Object.assign(data, csvData);
    }
  }
  
  return Object.keys(data).length > 0 ? data : null;
};

const parseTableFormat = (section: string): ImportedTreeData | null => {
  // Look for table-like data with headers and values
  const lines = section.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  if (lines.length < 2) return null;
  
  const data: ImportedTreeData = {};
  
  // Try to find header row and data row
  for (let i = 0; i < lines.length - 1; i++) {
    const headers = lines[i].split(/\s{2,}|\t|,/).map(h => h.trim().toLowerCase());
    const values = lines[i + 1].split(/\s{2,}|\t|,/).map(v => v.trim());
    
    if (headers.length === values.length && headers.length > 2) {
      for (let j = 0; j < headers.length; j++) {
        const header = headers[j];
        const value = values[j];
        
        if (header.includes('tree') && header.includes('number')) {
          data.treeNumber = value;
        } else if (header.includes('species')) {
          data.species = value;
        } else if (header.includes('common')) {
          data.commonName = value;
        } else if (header.includes('dbh')) {
          const num = parseFloat(value);
          if (!isNaN(num)) data.dbh = num;
        } else if (header.includes('height')) {
          const num = parseFloat(value);
          if (!isNaN(num)) data.height = num;
        }
        // Add more field mappings as needed
      }
      
      if (data.species || data.treeNumber) {
        return data;
      }
    }
  }
  
  return null;
};

const parseCSVFormat = (section: string): ImportedTreeData | null => {
  const lines = section.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  if (lines.length < 1) return null;
  
  // Look for comma or tab separated values
  for (const line of lines) {
    const parts = line.split(/,|\t/).map(p => p.trim());
    
    if (parts.length >= 3) {
      // Try to identify if this looks like tree data
      const hasTreeNumber = parts.some(p => /^[A-Z]?\d+$/.test(p));
      const hasSpecies = parts.some(p => p.length > 5 && /[a-z]/.test(p));
      const hasNumbers = parts.some(p => /^\d+\.?\d*$/.test(p));
      
      if ((hasTreeNumber || hasSpecies) && hasNumbers) {
        const data: ImportedTreeData = {};
        
        // Simple heuristic mapping
        if (hasTreeNumber) {
          data.treeNumber = parts.find(p => /^[A-Z]?\d+$/.test(p));
        }
        if (hasSpecies) {
          data.species = parts.find(p => p.length > 5 && /[a-z]/.test(p));
        }
        
        // Try to extract numeric values
        const numbers = parts.filter(p => /^\d+\.?\d*$/.test(p)).map(p => parseFloat(p));
        if (numbers.length > 0) data.dbh = numbers[0];
        if (numbers.length > 1) data.height = numbers[1];
        
        return data;
      }
    }
  }
  
  return null;
};