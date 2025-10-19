const PDFDocument = require('pdfkit');
const bwipjs = require('bwip-js');

// Generate bill PDF
exports.generateBillPDF = async (sale, template = null) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20)
         .font('Helvetica-Bold')
         .text(process.env.COMPANY_NAME || 'AutoParts Pro', { align: 'center' });

      doc.fontSize(10)
         .font('Helvetica')
         .text(process.env.COMPANY_ADDRESS || '', { align: 'center' })
         .text(`Phone: ${process.env.COMPANY_PHONE || ''}`, { align: 'center' })
         .text(`GST: ${process.env.COMPANY_GST || ''}`, { align: 'center' });

      doc.moveDown();
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown();

      // Bill Info
      const billInfoY = doc.y;
      
      doc.fontSize(12).font('Helvetica-Bold').text('INVOICE', 50, billInfoY);
      doc.fontSize(10).font('Helvetica');
      doc.text(`Bill No: ${sale.billNo}`, 50, billInfoY + 20);
      doc.text(`Date: ${sale.saleDate.toLocaleDateString()}`, 50, billInfoY + 35);

      // Customer Info
      doc.text('Bill To:', 350, billInfoY);
      doc.text(sale.customer?.name || 'Walk-in Customer', 350, billInfoY + 20);
      if (sale.customer?.phone) {
        doc.text(`Phone: ${sale.customer.phone}`, 350, billInfoY + 35);
      }

      doc.moveDown(3);
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown();

      // Items Table
      const tableTop = doc.y;
      const itemCodeX = 50;
      const descriptionX = 150;
      const quantityX = 350;
      const priceX = 420;
      const amountX = 490;

      // Table Header
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Item', itemCodeX, tableTop);
      doc.text('Description', descriptionX, tableTop);
      doc.text('Qty', quantityX, tableTop);
      doc.text('Price', priceX, tableTop);
      doc.text('Amount', amountX, tableTop);

      doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

      // Table Rows
      let yPosition = tableTop + 25;
      doc.font('Helvetica').fontSize(9);

      sale.items.forEach((item, index) => {
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 50;
        }

        doc.text(index + 1, itemCodeX, yPosition);
        doc.text(item.productName, descriptionX, yPosition, { width: 190 });
        doc.text(item.quantity.toString(), quantityX, yPosition);
        doc.text(`₹${item.price.toFixed(2)}`, priceX, yPosition);
        doc.text(`₹${item.total.toFixed(2)}`, amountX, yPosition);

        yPosition += 20;
      });

      doc.moveTo(50, yPosition).lineTo(550, yPosition).stroke();
      yPosition += 10;

      // Summary
      const summaryX = 400;
      doc.fontSize(10);

      doc.text('Subtotal:', summaryX, yPosition);
      doc.text(`₹${sale.subtotal.toFixed(2)}`, amountX, yPosition);
      yPosition += 20;

      if (sale.discount > 0) {
        doc.text('Discount:', summaryX, yPosition);
        doc.text(`- ₹${sale.discount.toFixed(2)}`, amountX, yPosition);
        yPosition += 20;
      }

      if (sale.gstAmount > 0) {
        doc.text('GST:', summaryX, yPosition);
        doc.text(`₹${sale.gstAmount.toFixed(2)}`, amountX, yPosition);
        yPosition += 20;
      }

      if (sale.roundOff !== 0) {
        doc.text('Round Off:', summaryX, yPosition);
        doc.text(`₹${sale.roundOff.toFixed(2)}`, amountX, yPosition);
        yPosition += 20;
      }

      doc.moveTo(summaryX, yPosition).lineTo(550, yPosition).stroke();
      yPosition += 10;

      doc.fontSize(12).font('Helvetica-Bold');
      doc.text('Total:', summaryX, yPosition);
      doc.text(`₹${sale.totalAmount.toFixed(2)}`, amountX, yPosition);

      yPosition += 30;

      // Payment Info
      doc.fontSize(10).font('Helvetica');
      doc.text(`Payment Mode: ${sale.paymentMode}`, 50, yPosition);
      doc.text(`Amount Paid: ₹${sale.paidAmount.toFixed(2)}`, 50, yPosition + 15);

      if (sale.pendingAmount > 0) {
        doc.text(`Pending: ₹${sale.pendingAmount.toFixed(2)}`, 50, yPosition + 30);
      }

      // Footer
      doc.fontSize(8);
      doc.text('Thank you for your business!', 50, 750, { align: 'center' });
      doc.text('This is a computer generated invoice', 50, 765, { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

// Generate barcode
exports.generateBarcode = async (text, type = 'code128') => {
  try {
    const png = await bwipjs.toBuffer({
      bcid: type,
      text: text,
      scale: 3,
      height: 10,
      includetext: true,
      textxalign: 'center'
    });

    return png;
  } catch (error) {
    throw new Error(`Barcode generation failed: ${error.message}`);
  }
};

// Generate QR code
exports.generateQRCode = async (text) => {
  try {
    const png = await bwipjs.toBuffer({
      bcid: 'qrcode',
      text: text,
      scale: 3
    });

    return png;
  } catch (error) {
    throw new Error(`QR code generation failed: ${error.message}`);
  }
};