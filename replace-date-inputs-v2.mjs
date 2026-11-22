/**
 * Reliable script to replace all <input type="date"> with <DateField>
 * Uses a careful line-by-line parser to avoid corrupting non-date inputs.
 */

import { readFileSync, writeFileSync } from 'fs';
import { dirname, relative } from 'path';

const SRC_DIR = 'd:/projects/logitiq innovation/blackRiverFrontend/src';
const COMMON_DATE_FIELD = `${SRC_DIR}/components/common/DateField`;

function getImportPath(filePath) {
  const fileDir = dirname(filePath.replace(/\\/g, '/'));
  let rel = relative(fileDir, COMMON_DATE_FIELD.replace(/\//g, '\\')).replace(/\\/g, '/');
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel;
}

function addDateFieldImport(content, importPath) {
  if (/import\s+DateField\s+from/.test(content)) return content;
  // Find last import statement end
  const lines = content.split('\n');
  let lastImportLine = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('import ')) lastImportLine = i;
    // Handle multi-line imports
    if (lastImportLine >= 0 && i >= lastImportLine) {
      // Check if the import is complete (has a semicolon)
      const joined = lines.slice(lastImportLine, i + 1).join('\n');
      if (joined.includes(';') || joined.includes("'") || joined.includes('"')) {
        if (lines[i].trim().endsWith(';') || lines[i].trim().endsWith("'") || lines[i].trim().endsWith('"') || lines[i].includes("';") || lines[i].includes('";')) {
          // This might be the end of the import
          if (lines[i].match(/['"];?\s*$/)) {
            lastImportLine = i;
          }
        }
      }
    }
  }

  // Better: find last line that starts with 'import' or is continuation of an import block
  let lastImport = -1;
  let inImport = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('import ')) {
      inImport = true;
      lastImport = i;
    }
    if (inImport) {
      lastImport = i;
      if (line.includes(';')) {
        inImport = false;
      }
    }
  }

  if (lastImport === -1) return `import DateField from '${importPath}';\n` + content;

  lines.splice(lastImport + 1, 0, `import DateField from '${importPath}';`);
  return lines.join('\n');
}

/**
 * Extract a complete HTML/JSX tag starting at position `start` in content.
 * Returns { start, end } of the full tag including </tag>.
 * Handles self-closing tags.
 */
function extractTag(content, start) {
  if (content[start] !== '<') return null;
  let i = start + 1;
  // Get tag name
  let tagName = '';
  while (i < content.length && /[\w-]/.test(content[i])) {
    tagName += content[i++];
  }

  let depth = 1;
  let inStr = false;
  let strChar = '';

  while (i < content.length) {
    const ch = content[i];

    if (inStr) {
      if (ch === strChar && content[i-1] !== '\\') inStr = false;
      i++;
      continue;
    }

    if (ch === '"' || ch === "'") {
      inStr = true;
      strChar = ch;
      i++;
      continue;
    }

    // Self-closing
    if (ch === '/' && content[i+1] === '>') {
      return { start, end: i + 2, selfClosing: true };
    }

    // End of opening tag
    if (ch === '>') {
      // Not self-closing - find closing tag
      i++;
      let innerDepth = 1;
      while (i < content.length && innerDepth > 0) {
        if (content.slice(i, i + tagName.length + 2) === `<${tagName}`) {
          // Opening tag
          innerDepth++;
          i++;
        } else if (content.slice(i, i + tagName.length + 3) === `</${tagName}>`) {
          innerDepth--;
          if (innerDepth === 0) {
            return { start, end: i + tagName.length + 3, selfClosing: false };
          }
          i++;
        } else {
          i++;
        }
      }
      return null;
    }

    i++;
  }
  return null;
}

/**
 * Find the start of the <input> tag that contains `type="date"` at position `typePos`.
 */
function findInputTagStart(content, typePos) {
  let i = typePos;
  while (i > 0 && content[i] !== '<') i--;
  if (content.slice(i, i + 6) === '<input') return i;
  return -1;
}

/**
 * Parse props from an <input ... /> tag string.
 */
function parseInputProps(tag) {
  const result = {
    value: null,
    onChange: null,
    min: null,
    max: null,
    disabled: false,
    ref: null,
  };

  // Check disabled
  result.disabled = /\bdisabled\b/.test(tag);

  // Extract value prop
  const valueMatch = tag.match(/\bvalue=\{([^}]+)\}/);
  if (valueMatch) result.value = valueMatch[1].trim();

  // Extract onChange - handle nested braces
  const onChangeStart = tag.indexOf('onChange=');
  if (onChangeStart !== -1) {
    const afterKey = tag.slice(onChangeStart + 'onChange='.length);
    if (afterKey[0] === '{') {
      let depth = 0;
      let end = 0;
      for (let i = 0; i < afterKey.length; i++) {
        if (afterKey[i] === '{') depth++;
        else if (afterKey[i] === '}') {
          depth--;
          if (depth === 0) { end = i; break; }
        }
      }
      result.onChange = afterKey.slice(1, end).trim();
    }
  }

  // Extract min/max
  const minMatch = tag.match(/\bmin=\{([^}]+)\}|\bmin="([^"]+)"/);
  if (minMatch) result.min = minMatch[1] || minMatch[2];

  const maxMatch = tag.match(/\bmax=\{([^}]+)\}|\bmax="([^"]+)"/);
  if (maxMatch) result.max = maxMatch[1] || maxMatch[2];

  return result;
}

/**
 * Find the whitespace indent before position `pos`.
 */
function getIndent(content, pos) {
  const lineStart = content.lastIndexOf('\n', pos - 1) + 1;
  const space = content.slice(lineStart, pos).match(/^(\s*)/);
  return space ? space[1] : '';
}

/**
 * Main function to find and replace a single date input.
 * Returns updated content or null if no date input found.
 */
function replaceNextDateInput(content) {
  const typeMatch = /\btype="date"/.exec(content);
  if (!typeMatch) return null;

  const typePos = typeMatch.index;
  const inputStart = findInputTagStart(content, typePos);
  if (inputStart === -1) return null;

  // Find the end of the <input /> tag
  let inputEnd = content.indexOf('/>', typePos);
  if (inputEnd === -1) return null;
  inputEnd += 2;

  const inputTag = content.slice(inputStart, inputEnd);
  const props = parseInputProps(inputTag);

  // Skip disabled inputs
  if (props.disabled) {
    // Replace the type="date" temporarily to skip it and move on
    return content.slice(0, typePos) + 'type="_date_skip_"' + content.slice(typePos + 'type="date"'.length);
  }

  const inputIndent = getIndent(content, inputStart);

  // Look for Calendar wrapper div before the input
  // A Calendar wrapper is a <div> that contains a <Calendar> icon immediately before <input type="date">
  const lookBackStart = Math.max(0, inputStart - 600);
  const lookBack = content.slice(lookBackStart, inputStart);

  let calWrapStart = -1;
  let calWrapEnd = -1;
  let hasCalendarWrapper = false;

  // Find the last <div in lookBack that also contains <Calendar
  const calendarIdx = lookBack.lastIndexOf('<Calendar');
  if (calendarIdx !== -1) {
    // Find the div that contains this Calendar
    const divIdx = lookBack.lastIndexOf('<div', calendarIdx);
    if (divIdx !== -1) {
      const absDiv = lookBackStart + divIdx;
      // Count nested divs to find closing tag
      let depth = 0;
      let closePos = -1;
      for (let i = absDiv; i < content.length - 5; i++) {
        if (content.slice(i, i + 4) === '<div' && (content[i+4] === ' ' || content[i+4] === '\n' || content[i+4] === '>')) {
          depth++;
        } else if (content.slice(i, i + 6) === '</div>') {
          depth--;
          if (depth === 0) {
            closePos = i + 6;
            break;
          }
        }
      }
      if (closePos !== -1 && closePos > inputEnd) {
        calWrapStart = absDiv;
        calWrapEnd = closePos;
        hasCalendarWrapper = true;
      }
    }
  }

  const structureStart = hasCalendarWrapper ? calWrapStart : inputStart;
  const structureEnd = hasCalendarWrapper ? calWrapEnd : inputEnd;

  // Look for <label> before the structure
  const beforeStruct = content.slice(0, structureStart);

  let label = null;
  let labelRequired = false;
  let labelBlockStart = -1;

  // Match <label ...>content</label> at the end of beforeStruct
  // Be careful: the label must end right before our structure (with only whitespace between)
  const labelCloseIdx = beforeStruct.lastIndexOf('</label>');
  if (labelCloseIdx !== -1) {
    // Check that there's only whitespace between the label close and our structure
    const afterLabel = beforeStruct.slice(labelCloseIdx + 8);
    if (/^\s*$/.test(afterLabel)) {
      // Find the opening <label
      const labelOpenIdx = beforeStruct.lastIndexOf('<label', labelCloseIdx);
      if (labelOpenIdx !== -1) {
        const labelTag = beforeStruct.slice(labelOpenIdx, labelCloseIdx + 8);
        const labelContentMatch = labelTag.match(/<label[^>]*>([\s\S]*)<\/label>/);
        if (labelContentMatch) {
          const rawContent = labelContentMatch[1];
          // Check for required marker
          labelRequired = /<span[^>]*>\s*\*\s*<\/span>/.test(rawContent) ||
                          /text-\[var\(--accent-red\)\]/.test(rawContent) ||
                          /text-red/.test(rawContent);
          // Clean text
          label = rawContent.replace(/<span[^>]*>[\s\S]*?<\/span>/g, '').replace(/<[^>]+>/g, '').trim();
          // Remove trailing * if present
          label = label.replace(/\s*\*\s*$/, '').trim();

          labelBlockStart = labelOpenIdx;
        }
      }
    }
  }

  // Look for error element after the structure
  const afterStruct = content.slice(structureEnd);
  let errorVar = null;
  let errorBlockEnd = 0;

  const errorMatch = /^\s*\{(\w+)\s*&&\s*<[pP][^>]*>[\s\S]*?<\/[pP]>\}/.exec(afterStruct);
  if (errorMatch) {
    errorVar = errorMatch[1];
    errorBlockEnd = errorMatch[0].length;
  }

  // Determine final replacement range
  let replaceStart = structureStart;
  let replaceEnd = structureEnd + errorBlockEnd;

  if (label !== null && labelBlockStart !== -1) {
    replaceStart = labelBlockStart;
  }

  // Build DateField component
  const dfIndent = label !== null ? getIndent(content, replaceStart) :
                   hasCalendarWrapper ? getIndent(content, calWrapStart) :
                   inputIndent;

  let dfProps = '';
  if (label !== null) {
    // Escape any quotes in label
    const safeLabel = label.replace(/"/g, "'");
    dfProps += `label="${safeLabel}" `;
  }
  dfProps += `value={${props.value || ''}} onChange={${props.onChange || ''}}`;
  if (labelRequired) dfProps += ' required';
  if (errorVar) dfProps += ` error={${errorVar}}`;
  if (props.min) dfProps += ` min="${props.min}"`;
  if (props.max) dfProps += ` max="${props.max}"`;

  const dfComponent = `${dfIndent}<DateField ${dfProps} />`;

  return content.slice(0, replaceStart) + dfComponent + content.slice(replaceEnd);
}

function cleanupCalendarImport(content) {
  // Check if Calendar is used anywhere in JSX (not in imports, not in comments)
  const noImports = content.replace(/^import[^;]+;/gm, '');
  const noComments = noImports.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');

  if (/<Calendar[\s/>]/.test(noComments)) return content; // Still used

  // Remove Calendar from lucide-react import line(s)
  // Strategy: find the import line, parse the named exports, remove Calendar, reconstruct
  content = content.replace(/^(import\s*\{)([^}]+)(\}\s*from\s*['"]lucide-react['"];?\s*)$/gm, (match, open, names, close) => {
    const parts = names.split(',').map(s => s.trim()).filter(s => s && s !== 'Calendar');
    if (parts.length === 0) return ''; // All removed
    return open + ' ' + parts.join(', ') + ' ' + close;
  });

  // Remove completely empty import lines
  content = content.replace(/^import\s*\{\s*\}\s*from\s*['"][^'"]+['"];\n?/gm, '');

  return content;
}

function cleanupShowPickerRefs(content) {
  // Remove useRef declarations that are ONLY used for showPicker
  // Pattern: const someRef = useRef<HTMLInputElement>(null);
  // Check if that ref is used anywhere other than showPicker

  const refPattern = /const (\w+Ref|\w+DateRef|\w+InputRef|\w+PickerRef) = useRef<HTMLInputElement>\(null\);\n?/g;
  let match;
  while ((match = refPattern.exec(content)) !== null) {
    const refName = match[1];
    // Count usages of this ref
    const usages = content.split(refName).length - 1;
    // If only used in declaration + showPicker call (typically 2-3 usages)
    const showPickerUsages = (content.match(new RegExp(`${refName}\\.current\\?\\.showPicker`, 'g')) || []).length;
    const refUsages = (content.match(new RegExp(`\\b${refName}\\b`, 'g')) || []).length;

    if (showPickerUsages > 0 && refUsages <= showPickerUsages + 1) {
      // Only used for showPicker - remove the declaration
      content = content.replace(match[0], '');
    }
  }

  return content;
}

function processFile(filePath) {
  const normPath = filePath.replace(/\\/g, '/');
  let content = readFileSync(normPath, 'utf-8');

  if (!content.includes('type="date"')) return false;

  const importPath = getImportPath(normPath);

  // Process all date inputs
  let iterations = 0;
  while (content.includes('type="date"') && iterations < 100) {
    iterations++;
    const newContent = replaceNextDateInput(content);
    if (newContent === null) break;
    content = newContent;
  }

  // Restore skipped inputs
  content = content.replace(/type="_date_skip_"/g, 'type="date"');

  // Add import if needed
  if (content.includes('<DateField ')) {
    content = addDateFieldImport(content, importPath);
    content = cleanupCalendarImport(content);
    content = cleanupShowPickerRefs(content);
  }

  writeFileSync(normPath, content, 'utf-8');
  return true;
}

const files = [
  'pages/admin/compilance/insurance-claims/InsuranceClaims.tsx',
  'pages/admin/compilance/tickets/Tickets.tsx',
  'pages/admin/dispatch/operations/order-list/NewOrderSidebar.tsx',
  'pages/admin/accounts/driverpayroll/index.tsx',
  'pages/admin/driverManagement/employees/index.tsx',
  'pages/admin/driverManagement/trailers/index.tsx',
  'pages/admin/driverManagement/trucks/Trucks.tsx',
  'pages/admin/fleetMaintenance/trailers/index.tsx',
  'pages/admin/dashboard/setting/Users.tsx',
  'pages/admin/dispatch/resources/fuel-reports/index.tsx',
  'pages/admin/accounts/settlements/index.tsx',
  'pages/admin/accounts/payroll/index.tsx',
  'pages/admin/accounts/paystubs/index.tsx',
  'pages/admin/fleetMaintenance/invoices/index.tsx',
  'pages/admin/accounts/invoice/index.tsx',
  'pages/admin/accounts/cash-flow-insights/index.tsx',
  'pages/admin/dispatch/operations/revenue-per-mile/index.tsx',
  'pages/admin/driverManagement/driverdocument/index.tsx',
  'pages/admin/driverManagement/document/index.tsx',
  'pages/admin/accounts/expenses/index.tsx',
  'pages/admin/fleetMaintenance/scheduledServicesLog/index.tsx',
  'pages/admin/fleetMaintenance/generalRepairsLog/index.tsx',
  'pages/admin/compilance/cvsa/CvsaInspection.tsx',
  'pages/admin/fleetMaintenance/trucks/Trucks.tsx',
  'pages/admin/healthandsafety/SafetyInspections/index.tsx',
  'pages/admin/accounts/fleet-maintenance/index.tsx',
  'pages/admin/accounts/receipts-notes/index.tsx',
  'pages/admin/healthandsafety/inspections-hazards/index.tsx',
  'pages/admin/compilance/host/HosAndEld.tsx',
  'pages/admin/healthandsafety/emergency-procedures/index.tsx',
  'pages/admin/healthandsafety/TruckingOperations/index.tsx',
  'pages/admin/healthandsafety/committee-capa/index.tsx',
  'pages/admin/healthandsafety/policies-documents/index.tsx',
  'pages/admin/healthandsafety/training-certificates/index.tsx',
  'pages/admin/healthandsafety/incidents-accidents/index.tsx',
  'pages/admin/accounts/tax-setup/index.tsx',
  'pages/admin/dispatch/resources/fuel-reports/NewFuelReportSidebar.tsx',
  'pages/admin/fleetMaintenance/customers/index.tsx',
  'pages/admin/fleetMaintenance/sparePart/index.tsx',
  'pages/admin/driverManagement/trainingCertificates/index.tsx',
  'pages/admin/fleetMaintenance/trailers/Trailers.tsx',
  'pages/admin/driverManagement/drugTest/index.tsx',
  'pages/admin/driverManagement/driverportfolio/index.tsx',
  'pages/admin/driverManagement/Attendance/index.tsx',
  'pages/admin/dispatch/operations/bulk-order/index.tsx',
  'pages/admin/healthandsafety/document-library/index.tsx',
  'pages/admin/healthandsafety/first-aid-logs/index.tsx',
  'pages/admin/fleetMaintenance/vehicleService/index.tsx',
  'pages/admin/fleetMaintenance/vehicleDocument/VehicleDocuments.tsx',
  'pages/admin/fleetMaintenance/unitMasterList/index.tsx',
  'pages/admin/fleetMaintenance/fleetUnits/index.tsx',
  'pages/admin/fleetMaintenance/regulatorySafety/index.tsx',
  'pages/admin/fleetMaintenance/scheduling/index.tsx',
  'pages/admin/dispatch/operations/bulk-order/NewBulkOrderSidebar.tsx',
  'pages/admin/dispatch/operations/delivery/index.tsx',
  'pages/admin/compilance/vehicle/VehicleDocument.tsx',
  'pages/admin/compilance/driver/DriverDocumenet.tsx',
  'components/dispatch/AssignDriverTruckModal.tsx',
  'pages/admin/driverManagement/schedulePage/index.tsx',
  'pages/admin/dispatch/operations/schedular/index.tsx',
  'pages/admin/dispatch/NewLoad.tsx',
];

let processed = 0;
let errors = [];

for (const f of files) {
  const fullPath = `${SRC_DIR}/${f}`;
  try {
    const changed = processFile(fullPath);
    if (changed) {
      processed++;
      console.log(`✓ ${f}`);
    } else {
      console.log(`- ${f} (no date inputs found)`);
    }
  } catch (err) {
    errors.push({ file: f, error: err.message });
    console.error(`✗ ${f}: ${err.message}`);
  }
}

console.log(`\nDone. Processed ${processed} files. Errors: ${errors.length}`);
if (errors.length) console.log(errors);
