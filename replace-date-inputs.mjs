/**
 * Script to replace all <input type="date"> with <DateField> component
 * Handles three patterns:
 * 1. Simple input with label+div wrapper
 * 2. Input with Calendar icon wrapper div
 * 3. Bare input (filter bars, no label)
 */

import { readFileSync, writeFileSync } from 'fs';
import { dirname, relative, join } from 'path';
import { fileURLToPath } from 'url';

const SRC_DIR = 'd:/projects/logitiq innovation/blackRiverFrontend/src';
const COMMON_DATE_FIELD = `${SRC_DIR}/components/common/DateField`;

function getImportPath(filePath) {
  const fileDir = dirname(filePath);
  let rel = relative(fileDir, COMMON_DATE_FIELD).replace(/\\/g, '/');
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel;
}

function addDateFieldImport(content, importPath) {
  // Already imported?
  if (/import\s+DateField\s+from\s+['"][^'"]+['"]/.test(content)) return content;
  // Add after last import line
  const lastImportIdx = content.lastIndexOf('\nimport ');
  if (lastImportIdx === -1) {
    return `import DateField from '${importPath}';\n` + content;
  }
  // Find end of that import statement
  let endIdx = content.indexOf('\n', lastImportIdx + 1);
  // Handle multi-line imports
  let checkIdx = lastImportIdx + 1;
  let depth = 0;
  for (let i = checkIdx; i < content.length; i++) {
    if (content[i] === '{') depth++;
    if (content[i] === '}') depth--;
    if (content[i] === '\n' && depth === 0) {
      endIdx = i;
      break;
    }
  }
  return content.slice(0, endIdx + 1) + `import DateField from '${importPath}';\n` + content.slice(endIdx + 1);
}

/**
 * Pattern 1: Wrapper div with Calendar icon + input, optionally preceded by label and followed by error
 * This handles the full "outer div > label > inner div (Calendar + input) > error" pattern
 */
function replaceWrappedWithCalendar(content) {
  // Pattern: <div className="relative cursor-pointer" onMouseDown...> <Calendar .../> <input type="date" .../> </div>
  // or: <div className="relative"> <Calendar .../> <input type="date" .../> </div>
  // We need to handle all indentation levels

  let result = content;
  let iterations = 0;

  while (iterations < 200) {
    iterations++;

    // Match: optional outer wrapper div + optional label + inner Calendar div + input + optional error
    // Strategy: find each <input type="date" ... /> and work outward

    const inputMatch = result.match(/([ \t]*)<input\s[^>]*type="date"[^>]*\/>/s);
    if (!inputMatch) break;

    const inputStart = result.indexOf(inputMatch[0]);
    const inputEnd = inputStart + inputMatch[0].length;
    const indent = inputMatch[1];

    // Extract props from the input tag
    const inputTag = inputMatch[0];
    const valueMatch = inputTag.match(/value=\{([^}]+)\}/);
    const onChangeMatch = inputTag.match(/onChange=\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/s);
    const minMatch = inputTag.match(/min="([^"]+)"/);
    const maxMatch = inputTag.match(/max="([^"]+)"/);
    const disabledMatch = inputTag.match(/\bdisabled\b/);

    if (disabledMatch) {
      // Skip disabled inputs - mark them to skip
      result = result.slice(0, inputStart) + '##SKIP_DISABLED##' + result.slice(inputEnd);
      continue;
    }

    const value = valueMatch ? valueMatch[1] : '';
    const onChange = onChangeMatch ? onChangeMatch[1] : '';
    const minProp = minMatch ? ` min="${minMatch[1]}"` : '';
    const maxProp = maxMatch ? ` max="${maxMatch[1]}"` : '';

    // Now try to find the surrounding structure
    // Look backwards from the input for a Calendar icon wrapper
    const beforeInput = result.slice(0, inputStart);

    // Try to find Calendar wrapper div: <div className="relative..."> \n <Calendar .../>
    // Look for the innermost wrapping div that contains just the Calendar + input
    let calendarWrapStart = -1;
    let calendarWrapEnd = -1;
    let hasCalendarWrapper = false;

    // Find the last <div before the input that's a "relative" or "relative cursor-pointer" wrapper
    // containing a Calendar icon
    const divBeforeInput = beforeInput.lastIndexOf('<div');
    if (divBeforeInput !== -1) {
      const divSnippet = result.slice(divBeforeInput, inputEnd + 200);
      // Check if this div contains Calendar icon
      if (/Calendar\s+className=/.test(divSnippet.slice(0, inputEnd - divBeforeInput + 50))) {
        // Find the closing </div> for this div
        let depth = 0;
        let closeIdx = -1;
        for (let i = divBeforeInput; i < result.length; i++) {
          if (result.slice(i, i + 4) === '<div') depth++;
          else if (result.slice(i, i + 6) === '</div>') {
            depth--;
            if (depth === 0) {
              closeIdx = i + 6;
              break;
            }
          }
        }
        if (closeIdx !== -1) {
          calendarWrapStart = divBeforeInput;
          calendarWrapEnd = closeIdx;
          hasCalendarWrapper = true;
        }
      }
    }

    let label = null;
    let labelRequired = false;
    let error = null;
    let outerDivStart = -1;
    let outerDivEnd = -1;

    if (hasCalendarWrapper) {
      // Now look outward for the label before calendarWrapStart
      const beforeCalendar = result.slice(0, calendarWrapStart);

      // Look for <label ... > ... </label> just before the calendar wrapper
      const labelMatch = beforeCalendar.match(/([ \t]*)<label[^>]*>([\s\S]*?)<\/label>\s*$/);
      if (labelMatch) {
        const labelContent = labelMatch[2];
        // Extract text content (strip HTML tags)
        const labelText = labelContent.replace(/<[^>]+>/g, '').trim();
        // Check for required asterisk
        if (/<span[^>]*>\s*\*\s*<\/span>/.test(labelContent) || /text-red/.test(labelContent) || /text-\[var\(--accent-red\)\]/.test(labelContent)) {
          labelRequired = true;
        }
        // Extract label text without the * span
        const cleanLabel = labelContent.replace(/<span[^>]*>\s*\*?\s*<\/span>/g, '').replace(/<[^>]+>/g, '').trim();
        label = cleanLabel;

        const labelStart = beforeCalendar.lastIndexOf(labelMatch[0]);

        // Look for outer wrapper <div> before the label
        const beforeLabel = result.slice(0, calendarWrapStart - labelMatch[0].length + labelStart - labelStart);
        // Find the outer div that wraps the label
        const outerBefore = result.slice(0, labelStart + (beforeCalendar.length - labelMatch[0].length));

        // Actually: labelStart is position in beforeCalendar string
        // Real position in result:
        const realLabelStart = beforeCalendar.length - labelMatch[0].length;

        // Look for the containing <div> that starts before the label
        const beforeRealLabel = result.slice(0, realLabelStart);
        const lastDivBeforeLabel = beforeRealLabel.lastIndexOf('\n' + indent.slice(0, -2));
        // Find the outer div
        const outerDivMatch = beforeRealLabel.match(/([ \t]*<div[^>]*>)\s*$/);
        if (outerDivMatch) {
          outerDivStart = beforeRealLabel.lastIndexOf(outerDivMatch[0]) + beforeRealLabel.lastIndexOf(outerDivMatch[0]) - beforeRealLabel.lastIndexOf(outerDivMatch[0]) + beforeRealLabel.length - outerDivMatch[0].length;

          // Find the closing </div> after calendarWrapEnd
          const afterCalendar = result.slice(calendarWrapEnd);

          // Check for error element
          const errorMatch = afterCalendar.match(/^\s*\{([a-zA-Z_$][a-zA-Z0-9_$]*)\s*&&\s*<[^>]+>([\s\S]*?)<\/[^>]+>\}/);
          let afterEnd = calendarWrapEnd;
          if (errorMatch) {
            error = errorMatch[1];
            afterEnd = calendarWrapEnd + errorMatch.index + errorMatch[0].length;
          }

          // Find the closing </div> for outerDivStart
          const outerClose = afterCalendar.match(/^\s*<\/div>/);
          if (outerClose) {
            outerDivEnd = afterEnd + (outerClose.index !== undefined ? afterCalendar.indexOf('</div>', afterEnd - calendarWrapEnd) + 6 : 0);
          }
        }
      }

      // Build the replacement
      let replacement = '';
      const baseIndent = indent.slice(0, Math.max(0, indent.length - 4)); // outer div indent

      let dateFieldProps = `value={${value}} onChange={${onChange}}`;
      if (label) dateFieldProps = `label="${label}" ${dateFieldProps}`;
      if (labelRequired) dateFieldProps = dateFieldProps + ` required`;
      if (error) dateFieldProps = dateFieldProps + ` error={${error}}`;
      if (minProp) dateFieldProps = dateFieldProps + minProp;
      if (maxProp) dateFieldProps = dateFieldProps + maxProp;

      replacement = `${baseIndent}<DateField ${dateFieldProps} />`;

      // Replace from calendarWrapStart backward to include label, or just the calendar wrapper
      if (label && outerDivStart !== -1 && outerDivEnd !== -1) {
        // Replace the whole outer div
        result = result.slice(0, outerDivStart) + '##PLACEHOLDER##' + result.slice(outerDivEnd);
      } else if (label) {
        // Replace from label start to calendar wrap end
        const realLabelStart2 = beforeCalendar.length - labelMatch[0].length;
        const afterCalendar2 = result.slice(calendarWrapEnd);
        const errorM = afterCalendar2.match(/^\s*\{[a-zA-Z_$][a-zA-Z0-9_$]*\s*&&\s*<[^>]+>[\s\S]*?<\/[^>]+>\}/);
        const endPos = errorM ? calendarWrapEnd + errorM[0].length : calendarWrapEnd;
        result = result.slice(0, realLabelStart2) + '##PLACEHOLDER##' + result.slice(endPos);
      } else {
        // Just replace the calendar wrapper div
        result = result.slice(0, calendarWrapStart) + '##PLACEHOLDER##' + result.slice(calendarWrapEnd);
      }

      result = result.replace('##PLACEHOLDER##', replacement);
    } else {
      // No Calendar wrapper - simple input with or without label
      // Check if there's a label just before
      const beforeInputLines = beforeInput.split('\n');
      const lastLine = beforeInputLines[beforeInputLines.length - 1];
      const secondLastLine = beforeInputLines[beforeInputLines.length - 2];

      // Build simple DateField replacement
      let dateFieldProps = `value={${value}} onChange={${onChange}}`;
      if (minProp) dateFieldProps = dateFieldProps + minProp;
      if (maxProp) dateFieldProps = dateFieldProps + maxProp;

      const replacement = `${indent}<DateField ${dateFieldProps} />`;
      result = result.slice(0, inputStart) + replacement + result.slice(inputEnd);
    }
  }

  // Restore skipped disabled inputs
  result = result.replace(/##SKIP_DISABLED##/g, '');

  return result;
}

// Better approach: process file line by line with state machine
function processFile(filePath) {
  let content = readFileSync(filePath, 'utf-8');
  const importPath = getImportPath(filePath);

  // Check if file has any date inputs
  if (!content.includes('type="date"')) return false;

  // Use a different, simpler approach: use regex to find and replace patterns
  content = replaceAllDateInputs(content);

  // Add import if needed
  if (content.includes('<DateField ') && !content.includes("import DateField from '")) {
    content = addDateFieldImport(content, importPath);
  }

  // Remove unused Calendar imports if Calendar is no longer used in JSX
  content = cleanupCalendarImport(content);

  writeFileSync(filePath, content, 'utf-8');
  return true;
}

function replaceAllDateInputs(content) {
  // We'll process the content iteratively, finding each date input and replacing it
  let result = content;
  let safety = 0;

  while (result.includes('type="date"') && safety < 100) {
    safety++;
    result = replaceSingleDateInput(result);
  }

  return result;
}

function replaceSingleDateInput(content) {
  // Find the first occurrence of type="date"
  const typeIdx = content.indexOf('type="date"');
  if (typeIdx === -1) return content;

  // Find the start of the <input tag
  let inputTagStart = typeIdx;
  while (inputTagStart > 0 && content[inputTagStart] !== '<') {
    inputTagStart--;
  }

  // Find the end of the input tag (/>)
  let inputTagEnd = content.indexOf('/>', typeIdx);
  if (inputTagEnd === -1) return content; // malformed, skip
  inputTagEnd += 2;

  const inputTag = content.slice(inputTagStart, inputTagEnd);

  // Check for disabled - skip if disabled
  if (/\bdisabled\b/.test(inputTag)) {
    // Replace type="date" temporarily to skip it
    return content.slice(0, typeIdx) + 'type="date_SKIP"' + content.slice(typeIdx + 'type="date"'.length);
  }

  // Extract props
  const valueMatch = inputTag.match(/\bvalue=\{([^}]+)\}/);
  const onChangeMatch = inputTag.match(/\bonChange=\{([\s\S]*?)\}(?=[\s\n]*(?:className|style|required|min=|max=|placeholder|ref=|id=|name=|\/>))/);
  const onChangeMatch2 = inputTag.match(/\bonChange=\{((?:[^{}]|\{[^{}]*\})*)\}/);
  const minMatch = inputTag.match(/\bmin="([^"]+)"/);
  const maxMatch = inputTag.match(/\bmax="([^"]+)"/);

  const value = valueMatch ? valueMatch[1] : '';
  const onChange = onChangeMatch ? onChangeMatch[1] : (onChangeMatch2 ? onChangeMatch2[1] : '');
  const minProp = minMatch ? ` min="${minMatch[1]}"` : '';
  const maxProp = maxMatch ? ` max="${maxMatch[1]}"` : '';

  // Get indentation of the input tag
  const lineStart = content.lastIndexOf('\n', inputTagStart) + 1;
  const indent = content.slice(lineStart, inputTagStart).match(/^(\s*)/)?.[1] || '';

  // Now look backward for the Calendar wrapper div
  const before = content.slice(0, inputTagStart);

  // Pattern: look for a wrapping div that contains a Calendar component just before the input
  // The div should be the immediate parent
  let wrapStart = -1;
  let wrapEnd = -1;
  let hasCalendarWrap = false;

  // Look for <div ... > \n [whitespace] <Calendar ... /> \n [whitespace] <input
  // Search backwards for the nearest <div
  const calendarPattern = /<Calendar[^/]*\/>/;

  // Find if there's a <Calendar ... /> between the nearest <div and the <input
  // Look at the 500 chars before the input
  const lookback = Math.max(0, inputTagStart - 500);
  const snippet = content.slice(lookback, inputTagStart);

  if (calendarPattern.test(snippet)) {
    // Find the div that wraps both Calendar and input
    const lastDivInSnippet = snippet.lastIndexOf('<div');
    if (lastDivInSnippet !== -1) {
      const absDiv = lookback + lastDivInSnippet;
      // Verify the Calendar is inside this div (not some other div)
      const calInSnippet = snippet.lastIndexOf('<Calendar');
      if (calInSnippet > lastDivInSnippet) {
        // Found! Now find closing tag
        let depth = 0;
        let closePos = -1;
        for (let i = absDiv; i < content.length - 5; i++) {
          if (content.slice(i, i + 4) === '<div') depth++;
          else if (content.slice(i, i + 6) === '</div>') {
            depth--;
            if (depth === 0) {
              closePos = i + 6;
              break;
            }
          }
        }
        if (closePos !== -1 && closePos > inputTagEnd) {
          wrapStart = absDiv;
          wrapEnd = closePos;
          hasCalendarWrap = true;
        }
      }
    }
  }

  // Now look for outer structure: label before + error after
  let label = null;
  let labelRequired = false;
  let error = null;

  const structStart = hasCalendarWrap ? wrapStart : inputTagStart;
  const structEnd = hasCalendarWrap ? wrapEnd : inputTagEnd;

  // Look for <label ...> ... </label> just before structStart
  const beforeStruct = content.slice(0, structStart);
  const labelRegex = /<label[^>]*>([\s\S]*?)<\/label>\s*$/;
  const labelMatch = beforeStruct.match(labelRegex);

  if (labelMatch) {
    const labelContent = labelMatch[1];
    // Check for required marker
    if (/<span[^>]*text-red[^>]*>\s*\*?\s*<\/span>/.test(labelContent) ||
        /<span[^>]*text-\[var\(--accent-red\)\][^>]*>\s*\*?\s*<\/span>/.test(labelContent) ||
        /\*<\/span>/.test(labelContent)) {
      labelRequired = true;
    }
    // Clean label text
    label = labelContent
      .replace(/<span[^>]*>\s*\*?\s*<\/span>/g, '')
      .replace(/<[^>]+>/g, '')
      .trim();
  }

  // Look for error element after structEnd
  const afterStruct = content.slice(structEnd);
  const errorPattern = /^\s*\{(\w+)\s*&&\s*<[pP][^>]*>[\s\S]*?<\/[pP]>\}/;
  const errorMatch = afterStruct.match(errorPattern);
  if (errorMatch) {
    error = errorMatch[1];
  }

  // Determine full replacement range
  let replaceStart = structStart;
  let replaceEnd = structEnd;

  if (labelMatch) {
    replaceStart = beforeStruct.length - labelMatch[0].length;
  }
  if (errorMatch) {
    replaceEnd = structEnd + errorMatch[0].length;
  }

  // Check if these are inside an outer wrapper div that ONLY contains label + calendar + error
  // (i.e., the outer div exists purely for the label/input grouping)
  const beforeReplace = content.slice(0, replaceStart).trimEnd();
  const afterReplace = content.slice(replaceEnd).trimStart();

  // Build the DateField component
  let props = '';
  if (label) props += `label="${label}" `;
  props += `value={${value}} onChange={${onChange}}`;
  if (labelRequired) props += ` required`;
  if (error) props += ` error={${error}}`;
  if (minProp) props += minProp;
  if (maxProp) props += maxProp;

  const replIndent = hasCalendarWrap ? getIndentBefore(content, wrapStart) : indent;
  const replacement = `${replIndent}<DateField ${props.trim()} />`;

  return content.slice(0, replaceStart) + replacement + content.slice(replaceEnd);
}

function getIndentBefore(content, pos) {
  const lineStart = content.lastIndexOf('\n', pos - 1) + 1;
  return content.slice(lineStart, pos).match(/^(\s*)/)?.[1] || '';
}

function cleanupCalendarImport(content) {
  // Check if Calendar is still used in JSX (not in DateField component itself)
  // If the only Calendar imports are from lucide-react and it's no longer used
  const calendarUsageInJSX = content.replace(/import[^;]+;/g, '').match(/<Calendar[\s/]/);

  if (!calendarUsageInJSX) {
    // Remove Calendar from lucide-react import
    content = content.replace(/,?\s*Calendar\s*(?=,|\})/g, (match) => {
      // Only remove if it leaves other imports
      return match.includes(',') ? match.replace('Calendar', '').replace(/,\s*,/, ',') : '';
    });
    // Clean up imports like "import { Calendar } from 'lucide-react';"
    content = content.replace(/import\s*\{\s*Calendar\s*\}\s*from\s*['"]lucide-react['"];\n?/g, '');
    // Clean up "Calendar," or ", Calendar" in imports
    content = content.replace(/,\s*Calendar\b/g, '');
    content = content.replace(/\bCalendar\s*,\s*/g, '');
    // If import becomes empty "{}" remove it
    content = content.replace(/import\s*\{\s*\}\s*from\s*['"][^'"]+['"];\n?/g, '');
  }

  return content;
}

// Process all files
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
  const fullPath = `${SRC_DIR}/${f}`.replace(/\//g, '/');
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

// Restore skipped type="date_SKIP" back to type="date"
for (const f of files) {
  const fullPath = `${SRC_DIR}/${f}`.replace(/\//g, '/');
  try {
    let c = readFileSync(fullPath, 'utf-8');
    if (c.includes('type="date_SKIP"')) {
      c = c.replace(/type="date_SKIP"/g, 'type="date"');
      writeFileSync(fullPath, c, 'utf-8');
    }
  } catch {}
}

console.log(`\nDone. Processed ${processed} files. Errors: ${errors.length}`);
if (errors.length > 0) {
  console.log('Errors:', errors);
}
