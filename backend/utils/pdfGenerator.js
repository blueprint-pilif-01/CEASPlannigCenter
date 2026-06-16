/**
 * PDF Generator Utility
 * Uses pdf-lib (works on shared hosting without Chrome)
 */

const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

/**
 * Generate PDF from contract data
 */
async function generateContractPDF({ renderedText, signatureImage, title, filledFields, signatureBlocks = [], contractNumber = null }) {
  try {
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    
    // Embed fonts
    const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    
    // Page settings
    const pageWidth = 595; // A4 width in points
    const pageHeight = 842; // A4 height in points
    const margin = 50;
    const lineHeight = 16;
    const fontSize = 11;
    const titleFontSize = 16;
    
    // Clean rendered text - remove signature lines and diacritics
    let cleanedText = removeSignatureLinesFromText(renderedText, signatureBlocks);
    cleanedText = removeDiacritics(cleanedText);
    
    // Also clean the title
    const cleanTitle = removeDiacritics(title);
    
    // Split text into lines that fit the page width
    const maxWidth = pageWidth - (margin * 2);
    const lines = wrapText(removeDiacritics(cleanedText), font, fontSize, maxWidth);
    
    // Calculate pages needed
    const usableHeight = pageHeight - (margin * 2) - 100; // Leave space for header/footer
    const linesPerPage = Math.floor(usableHeight / lineHeight);
    
    // Generate date string
    const generatedAt = new Date().toLocaleString('ro-RO', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Create pages
    let currentLine = 0;
    let pageNum = 0;
    
    while (currentLine < lines.length || pageNum === 0) {
      let page = pdfDoc.addPage([pageWidth, pageHeight]);
      pageNum++;
      
      let y = pageHeight - margin;
      
      // Header (only on first page)
      if (pageNum === 1) {
        // Try to add logo (small, top left)
        try {
          const logoPath = path.join(__dirname, '../assets/logo.jpeg');
          if (fs.existsSync(logoPath)) {
            const logoBytes = fs.readFileSync(logoPath);
            const logoImage = await pdfDoc.embedJpg(logoBytes);
            const logoHeight = 40; // Fixed small height
            const logoWidth = (logoImage.width / logoImage.height) * logoHeight;
            page.drawImage(logoImage, {
              x: margin,
              y: y - logoHeight,
              width: logoWidth,
              height: logoHeight,
            });
            // Don't reduce y much - title will be on same line or slightly below
          }
        } catch (e) {
          // Logo not found, continue without it
        }
        
        // Title (centered)
        y -= 50; // Space after logo
        const titleWidth = fontBold.widthOfTextAtSize(cleanTitle.toUpperCase(), titleFontSize);
        page.drawText(cleanTitle.toUpperCase(), {
          x: (pageWidth - titleWidth) / 2,
          y: y,
          size: titleFontSize,
          font: fontBold,
          color: rgb(0, 0, 0),
        });
        y -= 20;

        // Contract number (if available)
        if (contractNumber) {
          const numText = `Nr. ${contractNumber}`;
          const numWidth = fontBold.widthOfTextAtSize(numText, 12);
          page.drawText(numText, {
            x: (pageWidth - numWidth) / 2,
            y: y,
            size: 12,
            font: fontBold,
            color: rgb(0.2, 0.2, 0.2),
          });
          y -= 18;
        }

        // Date
        const dateText = `Document generat la ${generatedAt}`;
        const dateWidth = font.widthOfTextAtSize(dateText, 9);
        page.drawText(dateText, {
          x: (pageWidth - dateWidth) / 2,
          y: y,
          size: 9,
          font: font,
          color: rgb(0.4, 0.4, 0.4),
        });
        y -= 12;
        
        // Separator line
        page.drawLine({
          start: { x: margin, y: y },
          end: { x: pageWidth - margin, y: y },
          thickness: 1,
          color: rgb(0.2, 0.2, 0.2),
        });
        y -= 25;
      }
      
      // Content
      const startLine = currentLine;
      const endLine = Math.min(currentLine + linesPerPage, lines.length);
      
      // Embed signature image once for reuse
      let embeddedSigImage = null;
      if (signatureImage) {
        try {
          embeddedSigImage = await pdfDoc.embedPng(signatureImage);
        } catch (e) {
          // Signature image failed to embed
        }
      }
      
      for (let i = startLine; i < endLine; i++) {
        if (y < margin + 50) break; // Leave space for footer
        
        const line = lines[i];
        
        // Draw text line
        page.drawText(line, {
          x: margin,
          y: y,
          size: fontSize,
          font: font,
          color: rgb(0, 0, 0),
        });
        
        y -= lineHeight;
        currentLine++;
      }
      
      // Add ALL signatures at bottom
      const allSignatures = signatureBlocks || [];
      
      if (currentLine >= lines.length && allSignatures.length > 0) {
        y -= 50; // Space before signatures section
        
        // Load fixed signature image for inline (------) signatures
        let fixedSigImage = null;
        try {
          const fixedSigPath = path.join(__dirname, '../assets/semnatura-fixa.png');
          if (fs.existsSync(fixedSigPath)) {
            const fixedSigBytes = fs.readFileSync(fixedSigPath);
            fixedSigImage = await pdfDoc.embedPng(fixedSigBytes);
          }
        } catch (e) {
          // Fixed signature not found
        }
        
        const signerName = removeDiacritics(extractSignerName(filledFields));
        
        for (let i = 0; i < allSignatures.length; i++) {
          const sig = allSignatures[i];
          
          // Check if we need a new page
          if (y < margin + 100) {
            page = pdfDoc.addPage([pageWidth, pageHeight]);
            pageNum++;
            y = pageHeight - margin - 50;
          }
          
          // Label (role) - on same line as signature for inline type
          const labelText = removeDiacritics(sig.roleLabel || 'Semnatura');
          
          if (sig.type === 'inline') {
            // Inline (------): Label + fixed signature on SAME line
            page.drawText(labelText + ' ', {
              x: margin,
              y: y,
              size: fontSize,
              font: font,
              color: rgb(0, 0, 0),
            });
            
            const labelWidth = font.widthOfTextAtSize(labelText + ' ', fontSize);
            
            if (fixedSigImage) {
              const sigHeight = 30;
              const sigWidth = (fixedSigImage.width / fixedSigImage.height) * sigHeight;
              page.drawImage(fixedSigImage, {
                x: margin + labelWidth,
                y: y - 8,
                width: Math.min(sigWidth, 100),
                height: sigHeight,
              });
            } else {
              page.drawLine({
                start: { x: margin + labelWidth, y: y - 5 },
                end: { x: margin + labelWidth + 100, y: y - 5 },
                thickness: 0.5,
                color: rgb(0, 0, 0),
              });
            }
            
            y -= 45; // Space after inline signature
            
          } else {
            // Digital or Physical: Label on top, signature below
            page.drawText(labelText, {
              x: margin,
              y: y,
              size: 11,
              font: fontBold,
              color: rgb(0, 0, 0),
            });
            
            y -= 20;
            
            if (sig.type === 'digital' && signatureImage) {
              // Digital signature - user's drawn signature
              try {
                const sigImg = await pdfDoc.embedPng(signatureImage);
                const sigDims = sigImg.scale(0.25);
                page.drawImage(sigImg, {
                  x: margin,
                  y: y - Math.min(sigDims.height, 50),
                  width: Math.min(sigDims.width, 120),
                  height: Math.min(sigDims.height, 50),
                });
                y -= 55;
              } catch (e) {
                page.drawLine({
                  start: { x: margin, y: y - 15 },
                  end: { x: margin + 150, y: y - 15 },
                  thickness: 0.5,
                  color: rgb(0, 0, 0),
                });
                y -= 25;
              }
            } else {
              // Physical signature (::::::) - draw empty line
              page.drawLine({
                start: { x: margin, y: y - 15 },
                end: { x: margin + 200, y: y - 15 },
                thickness: 0.5,
                color: rgb(0, 0, 0),
              });
              y -= 25;
            }
            
          // Label under signature line
          page.drawText(sig.type === 'digital' ? signerName : '(semnatura)', {
            x: margin,
            y: y,
            size: 9,
            font: font,
            color: rgb(0.3, 0.3, 0.3),
          });
          y -= 15;
          
          // Date
          page.drawText(sig.type === 'digital' ? `Data: ${generatedAt}` : 'Data: _______________', {
              x: margin,
              y: y,
              size: 8,
              font: font,
              color: rgb(0.4, 0.4, 0.4),
            });
            
            y -= 35; // Space between signatures
          }
        }
      }
      
      // Footer
      const footerText = `Document generat electronic | Pagina ${pageNum}`;
      const footerWidth = font.widthOfTextAtSize(footerText, 8);
      page.drawText(footerText, {
        x: (pageWidth - footerWidth) / 2,
        y: margin / 2,
        size: 8,
        font: font,
        color: rgb(0.6, 0.6, 0.6),
      });
    }
    
    // Save PDF
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
    
  } catch (error) {
    console.error('PDF generation error:', error);
    throw error;
  }
}

/**
 * Replace Romanian diacritics with ASCII equivalents
 * and remove special characters that PDF fonts can't encode
 */
function removeDiacritics(text) {
  if (!text) return '';
  
  const map = {
    'ă': 'a', 'Ă': 'A',
    'â': 'a', 'Â': 'A',
    'î': 'i', 'Î': 'I',
    'ș': 's', 'Ș': 'S', 'ş': 's', 'Ş': 'S',
    'ț': 't', 'Ț': 'T', 'ţ': 't', 'Ţ': 'T',
    'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
    'à': 'a', 'á': 'a', 'ä': 'a',
    'ù': 'u', 'ú': 'u', 'û': 'u', 'ü': 'u',
    'ò': 'o', 'ó': 'o', 'ô': 'o', 'ö': 'o',
    'ì': 'i', 'í': 'i', 'ï': 'i',
    'ñ': 'n', 'ç': 'c'
  };
  
  // Remove tabs and other control characters
  let result = text.replace(/\t/g, '    '); // Replace tabs with spaces
  result = result.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ''); // Remove control chars
  
  // Replace diacritics
  result = result.replace(/[ăĂâÂîÎșȘşŞțȚţŢéèêëàáäùúûüòóôöìíïñç]/g, char => map[char] || char);
  
  return result;
}

/**
 * Wrap text to fit within max width
 */
function wrapText(text, font, fontSize, maxWidth) {
  const lines = [];
  const paragraphs = text.split('\n');
  
  for (const paragraph of paragraphs) {
    if (paragraph.trim() === '') {
      lines.push('');
      continue;
    }
    
    const words = paragraph.split(' ');
    let currentLine = '';
    
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = font.widthOfTextAtSize(testLine, fontSize);
      
      if (width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }
  }
  
  return lines;
}

/**
 * Remove signature lines from contract text - ALL go to bottom
 * - ...... = digital signature (user draws)
 * - :::::: = physical signature (empty line)  
 * - ------ = fixed signature (pre-set image)
 * - ______ = fillable field
 */
function removeSignatureLinesFromText(text, signatureBlocks) {
  let cleaned = text;
  
  // Remove ALL signature lines - they will be rendered at the bottom
  cleaned = cleaned.replace(/^.*:{5,}.*$/gm, ''); // Physical signatures
  cleaned = cleaned.replace(/^.*\.{5,}.*$/gm, ''); // Digital signatures
  cleaned = cleaned.replace(/^.*-{5,}.*$/gm, '');  // Fixed signatures
  
  // Replace remaining underscores sequences (unfilled fields)
  cleaned = cleaned.replace(/_{5,}/g, '_________________');
  
  // Clean up multiple empty lines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  // Remove leading/trailing whitespace from each line
  cleaned = cleaned.split('\n').map(line => line.trimEnd()).join('\n');
  
  cleaned = cleaned.trim();
  
  return cleaned;
}

/**
 * Extract signer name from filled fields
 */
function extractSignerName(filledFields) {
  if (!filledFields) return 'Semnatar';
  
  const nameFields = [
    filledFields.nume_complet_1,
    filledFields.nume_complet,
    filledFields['Nume complet'],
    [filledFields.nume, filledFields.prenume].filter(Boolean).join(' '),
    filledFields.subsemnatul,
    filledFields.name,
    filledFields.nume
  ];
  
  for (const name of nameFields) {
    if (name && name.trim()) {
      return name.trim();
    }
  }
  
  return 'Semnatar';
}

module.exports = {
  generateContractPDF
};
