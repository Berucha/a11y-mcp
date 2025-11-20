#!/usr/bin/env node
/**
 * CLI Scanner for GitHub Actions Integration  
 * Comprehensive accessibility checker for all file types
 * Supports: .js, .jsx, .ts, .tsx, .html, .htm, .css, .scss
 */

import fs from 'fs';
import path from 'path';

/**
 * Comprehensive accessibility analyzer
 */
function analyzeFile(content, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const violations = [];
  let line = 1;
  let match;
  
  // === JSX/TSX/JS/HTML CHECKS ===
  if (['.jsx', '.tsx', '.js', '.html', '.htm'].includes(ext)) {
    
    // 1. Missing alt attributes on images
    const imgRegex = /<img[^>]*>/gi;
    while ((match = imgRegex.exec(content)) !== null) {
      if (!match[0].includes('alt=')) {
        line = content.substring(0, match.index).split('\n').length;
        violations.push({
          id: 'img-missing-alt',
          severity: 'error',
          wcagCriteria: ['1.1.1'],
          title: 'Image missing alt attribute',
          description: 'All images must have an alt attribute for screen readers',
          help: 'Add alt attribute with meaningful description',
          line,
          column: 1,
          code: match[0],
          fixSuggestions: ['Add alt="description" to the image tag'],
          tags: ['wcag-a', 'images']
        });
      }
    }

    // 2. Div used as button
    const divButtonRegex = /<div[^>]*(onclick|onClick)[^>]*>/gi;
    while ((match = divButtonRegex.exec(content)) !== null) {
      line = content.substring(0, match.index).split('\n').length;
      violations.push({
        id: 'div-button',
        severity: 'error',
        wcagCriteria: ['1.3.1', '4.1.2'],
        title: 'Interactive div should be a button',
        description: 'Div with click handler should be a semantic button element',
        help: 'Replace with <button> or add proper ARIA role and keyboard support',
        line,
        column: 1,
        code: match[0],
        fixSuggestions: [
          'Replace <div onClick> with <button>',
          'Add role="button" tabIndex="0" and keyboard handlers if div is required'
        ],
        tags: ['wcag-a', 'semantic-html', 'keyboard']
      });
    }

    // 3. Buttons with no accessible name
    const buttonRegex = /<button[^>]*>([\s\S]*?)<\/button>/gi;
    while ((match = buttonRegex.exec(content)) !== null) {
      const buttonContent = match[1].replace(/<!--.*?-->/gs, '').replace(/<[^>]+>/g, '').trim();
      const hasAriaLabel = match[0].includes('aria-label');
      
      if (!buttonContent && !hasAriaLabel) {
        line = content.substring(0, match.index).split('\n').length;
        violations.push({
          id: 'button-missing-accessible-name',
          severity: 'error',
          wcagCriteria: ['4.1.2'],
          title: 'Button has no accessible name',
          description: 'Button must have text content or aria-label',
          help: 'Add visible text or aria-label attribute',
          line,
          column: 1,
          code: match[0],
          fixSuggestions: [
            'Add text inside the button',
            'Add aria-label="description" attribute'
          ],
          tags: ['wcag-a', 'buttons']
        });
      }
    }

    // 4. Form inputs missing labels
    const inputRegex = /<input[^>]*>/gi;
    while ((match = inputRegex.exec(content)) !== null) {
      const hasId = /id=["']([^"']+)["']/.exec(match[0]);
      const hasAriaLabel = match[0].includes('aria-label');
      const hasAriaLabelledBy = match[0].includes('aria-labelledby');
      const inputType = /type=["']([^"']+)["']/.exec(match[0]);
      const type = inputType ? inputType[1] : 'text';
      
      // Skip hidden and submit/button inputs
      if (type === 'hidden' || type === 'submit' || type === 'button') continue;
      
      if (hasId && !hasAriaLabel && !hasAriaLabelledBy) {
        const inputId = hasId[1];
        const labelRegex = new RegExp(`<label[^>]*for=["']${inputId}["'][^>]*>`, 'i');
        
        if (!labelRegex.test(content)) {
          line = content.substring(0, match.index).split('\n').length;
          violations.push({
            id: 'input-missing-label',
            severity: 'error',
            wcagCriteria: ['1.3.1', '3.3.2'],
            title: 'Form input missing label',
            description: 'All form inputs must have an associated label',
            help: 'Add a <label> element or aria-label attribute',
            line,
            column: 1,
            code: match[0],
            fixSuggestions: [
              `Add <label for="${inputId}">Label text</label>`,
              'Add aria-label="description" to the input'
            ],
            tags: ['wcag-a', 'forms']
          });
        }
      } else if (!hasId && !hasAriaLabel && !hasAriaLabelledBy) {
        line = content.substring(0, match.index).split('\n').length;
        violations.push({
          id: 'input-no-id-or-label',
          severity: 'error',
          wcagCriteria: ['1.3.1', '3.3.2'],
          title: 'Form input has no label or id',
          description: 'Input needs an id with matching label or aria-label',
          help: 'Add id and <label for> or aria-label',
          line,
          column: 1,
          code: match[0],
          fixSuggestions: [
            'Add id="inputId" and <label for="inputId">Label</label>',
            'Add aria-label="description"'
          ],
          tags: ['wcag-a', 'forms']
        });
      }
    }

    // 5. Links with non-descriptive text
    const linkRegex = /<a[^>]*>(.*?)<\/a>/gi;
    while ((match = linkRegex.exec(content)) !== null) {
      const linkText = match[1].replace(/<[^>]+>/g, '').trim().toLowerCase();
      const badTexts = ['click here', 'here', 'read more', 'more', 'link'];
      
      if (badTexts.includes(linkText)) {
        line = content.substring(0, match.index).split('\n').length;
        violations.push({
          id: 'link-non-descriptive',
          severity: 'warning',
          wcagCriteria: ['2.4.4'],
          title: 'Link text not descriptive',
          description: `Link text "${linkText}" is not meaningful out of context`,
          help: 'Use descriptive link text that makes sense when read alone',
          line,
          column: 1,
          code: match[0],
          fixSuggestions: [
            'Use descriptive text like "Read the full article" instead of "Read more"',
            'Add aria-label with descriptive text'
          ],
          tags: ['wcag-aa', 'links']
        });
      }
    }
  }

  // === HTML-ONLY CHECKS ===
  if (['.html', '.htm'].includes(ext)) {
    
    // 6. Missing page language
    if (!/<html[^>]*lang=/i.test(content)) {
      violations.push({
        id: 'html-missing-lang',
        severity: 'error',
        wcagCriteria: ['3.1.1'],
        title: 'HTML missing lang attribute',
        description: 'The <html> element must have a lang attribute',
        help: 'Add lang attribute to specify page language',
        line: 1,
        column: 1,
        code: content.match(/<html[^>]*>/i)?.[0] || '<html>',
        fixSuggestions: ['Add lang="en" to <html> tag'],
        tags: ['wcag-a', 'language']
      });
    }

    // 7. Missing page title
    if (!/<title[^>]*>[\s\S]*?<\/title>/i.test(content)) {
      violations.push({
        id: 'html-missing-title',
        severity: 'error',
        wcagCriteria: ['2.4.2'],
        title: 'Page missing title',
        description: 'Every HTML page must have a descriptive <title>',
        help: 'Add <title> element in <head>',
        line: 1,
        column: 1,
        code: '<head>',
        fixSuggestions: ['Add <title>Page Title</title> in the <head> section'],
        tags: ['wcag-a', 'title']
      });
    }

    // 8. Iframe missing title
    const iframeRegex = /<iframe[^>]*>/gi;
    while ((match = iframeRegex.exec(content)) !== null) {
      if (!match[0].includes('title=')) {
        line = content.substring(0, match.index).split('\n').length;
        violations.push({
          id: 'iframe-missing-title',
          severity: 'error',
          wcagCriteria: ['2.4.1', '4.1.2'],
          title: 'Iframe missing title',
          description: 'All iframes must have a title attribute',
          help: 'Add title attribute describing iframe content',
          line,
          column: 1,
          code: match[0],
          fixSuggestions: ['Add title="description" to iframe'],
          tags: ['wcag-a', 'iframe']
        });
      }
    }
  }

  // === CSS/SCSS CHECKS ===
  if (['.css', '.scss'].includes(ext)) {
    
    // 9. Missing focus styles
    if (!/:focus[^}]*/g.test(content)) {
      violations.push({
        id: 'missing-focus-styles',
        severity: 'warning',
        wcagCriteria: ['2.4.7'],
        title: 'No focus styles defined',
        description: 'CSS should include :focus styles for keyboard navigation',
        help: 'Add :focus and :focus-visible styles',
        line: 1,
        column: 1,
        code: '',
        fixSuggestions: [
          'Add :focus styles for interactive elements',
          'Use :focus-visible for better UX'
        ],
        tags: ['wcag-aa', 'focus', 'keyboard']
      });
    }

    // 10. outline: none or outline: 0 without alternative
    // Match outline: none/0 with optional !important and semicolon
    const outlineNoneRegex = /outline\s*:\s*(none|0)(\s*!important)?\s*[;!]/gi;
    while ((match = outlineNoneRegex.exec(content)) !== null) {
      line = content.substring(0, match.index).split('\n').length;
      
      // Find the CSS rule block this belongs to
      const ruleStart = content.lastIndexOf('{', match.index);
      const ruleEnd = content.indexOf('}', match.index);
      let ruleBlock = '';
      if (ruleStart !== -1 && ruleEnd !== -1 && ruleEnd > ruleStart) {
        ruleBlock = content.substring(ruleStart, ruleEnd);
      } else {
        // Fallback: check nearby context
        const contextStart = Math.max(0, match.index - 200);
        const contextEnd = Math.min(content.length, match.index + 200);
        ruleBlock = content.substring(contextStart, contextEnd);
      }
      
      // Check if there's an alternative focus indicator in the same rule
      // Look for box-shadow, border, or other outline values in the same block
      const hasAlternative = /(box-shadow\s*:|border\s*[:\-]|outline\s*:\s*(2|3|4|5|auto|dotted|dashed|solid|double|groove|ridge|inset|outset|\d+px))/i.test(ruleBlock);
      
      // Also check if this is in a :focus rule that has alternatives
      const isInFocusRule = /:focus[^}]*\{[^}]*outline\s*:\s*(none|0)/i.test(ruleBlock);
      
      if (!hasAlternative || isInFocusRule) {
        violations.push({
          id: 'outline-none-no-alternative',
          severity: 'error',
          wcagCriteria: ['2.4.7'],
          title: 'Removed focus outline without alternative',
          description: 'outline: none or outline: 0 removes keyboard focus indicator without providing an alternative',
          help: 'Provide alternative focus indicator (box-shadow, border, etc.)',
          line,
          column: 1,
          code: match[0],
          fixSuggestions: [
            'Add custom focus style: button:focus { box-shadow: 0 0 0 3px rgba(0,0,255,0.3); }',
            'Or remove outline: none to keep default focus indicator'
          ],
          tags: ['wcag-aa', 'focus']
        });
      }
    }

    // 11. Very small font sizes
    const fontSizeRegex = /font-size\s*:\s*(\d+(?:\.\d+)?)\s*px/gi;
    while ((match = fontSizeRegex.exec(content)) !== null) {
      const fontSize = parseFloat(match[1]);
      if (fontSize < 10) {
        line = content.substring(0, match.index).split('\n').length;
        violations.push({
          id: 'font-size-too-small',
          severity: 'error',
          wcagCriteria: ['1.4.4'],
          title: 'Font size too small for readability',
          description: `Font size ${fontSize}px is below minimum readable size (12px minimum, 16px recommended)`,
          help: 'Increase font size to at least 12px, preferably 16px',
          line,
          column: 1,
          code: match[0],
          fixSuggestions: [
            `Change font-size to at least 12px: font-size: 12px;`,
            'For body text, use 16px or larger',
            'Use relative units (rem, em) for better scalability'
          ],
          tags: ['wcag-aa', 'typography']
        });
      } else if (fontSize < 12) {
        line = content.substring(0, match.index).split('\n').length;
        violations.push({
          id: 'font-size-small',
          severity: 'warning',
          wcagCriteria: ['1.4.4'],
          title: 'Font size may be too small',
          description: `Font size ${fontSize}px is below recommended minimum (12px minimum, 16px recommended)`,
          help: 'Consider increasing font size for better readability',
          line,
          column: 1,
          code: match[0],
          fixSuggestions: [
            `Increase to at least 12px: font-size: 12px;`,
            'For body text, use 16px or larger'
          ],
          tags: ['wcag-aa', 'typography']
        });
      }
    }

    // 12. Very small touch targets
    const sizeRegex = /(width|height|min-width|min-height)\s*:\s*(\d+(?:\.\d+)?)\s*px/gi;
    while ((match = sizeRegex.exec(content)) !== null) {
      const size = parseFloat(match[2]);
      if (size < 44 && (match[1].includes('width') || match[1].includes('height'))) {
        line = content.substring(0, match.index).split('\n').length;
        const lines = content.substring(0, match.index).split('\n');
        const currentLine = lines[lines.length - 1];
        const selectorMatch = currentLine.match(/([.#]?[\w-]+)\s*\{/);
        const selector = selectorMatch ? selectorMatch[1] : 'unknown';
        
        if (selector.includes('button') || selector.includes('btn') || 
            selector.includes('link') || selector.includes('a') ||
            selector.includes('input') || selector.includes('click')) {
          violations.push({
            id: 'touch-target-too-small',
            severity: 'error',
            wcagCriteria: ['2.5.5'],
            title: 'Touch target too small',
            description: `${match[1]} of ${size}px is below WCAG minimum of 44x44px for touch targets`,
            help: 'Increase touch target size to at least 44x44px',
            line,
            column: 1,
            code: match[0],
            fixSuggestions: [
              `Increase ${match[1]} to at least 44px: ${match[1]}: 44px;`,
              'Add padding to increase effective touch target size',
              'Ensure both width and height meet 44px minimum'
            ],
            tags: ['wcag-aa', 'touch-targets']
          });
        }
      }
    }

    // 13. display: none on potentially interactive elements
    const displayNoneRegex = /\.([\w-]+)\s*\{[^}]*display\s*:\s*none/gi;
    while ((match = displayNoneRegex.exec(content)) !== null) {
      const className = match[1];
      if (className.includes('button') || className.includes('btn') || 
          className.includes('link') || className.includes('menu') ||
          className.includes('nav') || className.includes('interactive')) {
        line = content.substring(0, match.index).split('\n').length;
        violations.push({
          id: 'display-none-on-interactive',
          severity: 'warning',
          wcagCriteria: ['2.1.1', '4.1.2'],
          title: 'display: none may hide interactive content from screen readers',
          description: `Using display: none on "${className}" may hide content from assistive technologies`,
          help: 'Use visually-hidden technique instead of display: none for screen reader content',
          line,
          column: 1,
          code: match[0],
          fixSuggestions: [
            'Use .sr-only or visually-hidden class instead',
            'Example: .visually-hidden { position: absolute; width: 1px; height: 1px; clip: rect(0,0,0,0); overflow: hidden; }'
          ],
          tags: ['wcag-a', 'screen-readers']
        });
      }
    }

    // 14. color: transparent
    const transparentRegex = /color\s*:\s*transparent/gi;
    while ((match = transparentRegex.exec(content)) !== null) {
      line = content.substring(0, match.index).split('\n').length;
      violations.push({
        id: 'text-transparent',
        severity: 'error',
        wcagCriteria: ['1.4.3'],
        title: 'Text color is transparent',
        description: 'Transparent text color makes content invisible',
        help: 'Use visible text color or ensure content is accessible via other means',
        line,
        column: 1,
        code: match[0],
        fixSuggestions: [
          'Use a visible color: color: #333;',
          'If hiding text visually, ensure it\'s available to screen readers'
        ],
        tags: ['wcag-aa', 'color']
      });
    }

    // 15. pointer-events: none on interactive elements
    const pointerEventsRegex = /(button|a|input|select|textarea)[^}]*\{[^}]*pointer-events\s*:\s*none/gi;
    if (pointerEventsRegex.test(content)) {
      const pointerMatch = content.match(/(button|a|input|select|textarea)[^}]*\{[^}]*pointer-events\s*:\s*none/gi);
      if (pointerMatch) {
        const matchIndex = content.indexOf(pointerMatch[0]);
        line = content.substring(0, matchIndex).split('\n').length;
        violations.push({
          id: 'pointer-events-none',
          severity: 'error',
          wcagCriteria: ['2.1.1', '2.5.3'],
          title: 'pointer-events: none disables keyboard interaction',
          description: 'pointer-events: none on interactive elements prevents keyboard and touch interaction',
          help: 'Remove pointer-events: none or use alternative method',
          line,
          column: 1,
          code: pointerMatch[0].substring(0, 100),
          fixSuggestions: [
            'Remove pointer-events: none from interactive elements',
            'Use disabled attribute for form elements instead',
            'Ensure keyboard navigation still works'
          ],
          tags: ['wcag-a', 'keyboard']
        });
      }
    }
  }

  return violations;
}

/**
 * Scan a file and return results
 */
function scanFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const violations = analyzeFile(content, filePath);
  const ext = path.extname(filePath).toLowerCase();
  
  let fileType = 'unknown';
  if (['.jsx'].includes(ext)) fileType = 'jsx';
  else if (['.tsx'].includes(ext)) fileType = 'tsx';
  else if (['.js'].includes(ext)) fileType = 'js';
  else if (['.ts'].includes(ext)) fileType = 'ts';
  else if (['.html', '.htm'].includes(ext)) fileType = 'html';
  else if (['.css'].includes(ext)) fileType = 'css';
  else if (['.scss'].includes(ext)) fileType = 'scss';

  return {
    filePath,
    fileType,
    content,
    violations,
    statistics: {
      totalViolations: violations.length,
      errors: violations.filter(v => v.severity === 'error').length,
      warnings: violations.filter(v => v.severity === 'warning').length,
      info: violations.filter(v => v.severity === 'info').length,
      estimatedFixTime: `${Math.max(violations.length * 2, 1)} minutes`
    },
    metadata: {
      lineCount: content.split('\n').length,
      analyzedAt: new Date().toISOString()
    }
  };
}

/**
 * Format and print human-readable results
 */
function printResults(result) {
  console.log(`\n📄 File: ${result.filePath}`);
  console.log(`🗂️  File Type: ${result.fileType.toUpperCase()}`);
  console.log(`📊 Lines: ${result.metadata.lineCount}`);
  
  if (result.violations.length === 0) {
    console.log('✅ Result: No accessibility violations found! 🎉');
  } else {
    console.log(`❌ Result: Found ${result.violations.length} accessibility violation(s):\n`);
    
    result.violations.forEach((violation, index) => {
      console.log(`   ${index + 1}. [${violation.severity.toUpperCase()}] ${violation.title}`);
      console.log(`      📍 Line: ${violation.line}`);
      console.log(`      📝 ${violation.description}`);
      console.log(`      🔧 ${violation.help}`);
      console.log(`      📚 WCAG: ${violation.wcagCriteria.join(', ')}`);
      if (violation.fixSuggestions && violation.fixSuggestions.length > 0) {
        console.log(`      💡 Suggestions:`);
        violation.fixSuggestions.forEach(suggestion => {
          console.log(`         - ${suggestion}`);
        });
      }
      console.log();
    });
    
    console.log(`\n📈 Statistics:`);
    console.log(`   Errors: ${result.statistics.errors}`);
    console.log(`   Warnings: ${result.statistics.warnings}`);
    console.log(`   Estimated fix time: ${result.statistics.estimatedFixTime}`);
  }
  
  console.log('─'.repeat(80));
}

/**
 * Format results as JSON for CI/CD
 */
function formatAsJSON(result) {
  return JSON.stringify({
    file: result.filePath,
    type: result.fileType,
    violations: result.violations.map(v => ({
      id: v.id,
      severity: v.severity,
      title: v.title,
      description: v.description,
      line: v.line,
      wcag: v.wcagCriteria,
      fix: v.help
    })),
    summary: result.statistics
  }, null, 2);
}

/**
 * Main CLI entry point
 */
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log('Usage: node cli-scanner.js <file-path> [--json]');
    console.log('');
    console.log('  Analyze a file for accessibility violations');
    console.log('  Supports: .js, .jsx, .ts, .tsx, .html, .htm, .css, .scss');
    console.log('');
    console.log('Options:');
    console.log('  --json    Output results in JSON format for CI/CD integration');
    console.log('');
    console.log('Exit codes:');
    console.log('  0 = No violations');
    console.log('  3 = Violations found');
    console.log('  1 = Error (file not found, etc.)');
    process.exit(0);
  }

  const jsonOutput = args.includes('--json');
  const filePath = args.find(arg => !arg.startsWith('--'));

  if (!filePath) {
    console.error('Error: No file path provided');
    process.exit(1);
  }

  try {
    const result = scanFile(filePath);
    
    if (jsonOutput) {
      console.log(formatAsJSON(result));
    } else {
      printResults(result);
    }
    
    // Exit with code 3 if violations found (so PR checks fail)
    process.exit(result.violations.length > 0 ? 3 : 0);
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
