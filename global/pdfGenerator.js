// Ensure jsPDF and html2canvas are loaded
if (typeof jsPDF === 'undefined' || typeof html2canvas === 'undefined') {
    console.error('jsPDF or html2canvas is not loaded. Make sure to include these libraries.');
}

const PdfGenerator = {
    generatePdf: async function(containerSelector, options = {}) {
        const { jsPDF } = window.jspdf;

        // Default options
        const defaultOptions = {
            filename: 'document.pdf',
            margin: 10,
            removeElements: ['button'],
            removeDottedLines: true
        };

        // Merge default options with provided options
        const settings = { ...defaultOptions, ...options };

        // Create a new jsPDF instance
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const contentWidth = pageWidth - 2 * settings.margin;
        const contentHeight = pageHeight - 2 * settings.margin;

        // Function to add page number
        function addPageNumber(doc, pageNumber) {
            doc.setFontSize(10);
            doc.text('Page ' + pageNumber, pageWidth / 2, pageHeight - 5, { align: 'center' });
        }

        // Clone the container to avoid modifying the original
        const container = document.querySelector(containerSelector).cloneNode(true);
        
        // Modify the clone for PDF generation
        container.style.width = contentWidth + 'mm';
        container.style.padding = '0';
        container.style.margin = '0';
        container.style.boxShadow = 'none';
        container.style.borderRadius = '0';

        // Remove specified elements and replace inputs/selects
        container.querySelectorAll(settings.removeElements.join(', ')).forEach(el => el.remove());
        container.querySelectorAll('input, select').forEach(el => {
            const placeholder = document.createElement('span');
            placeholder.textContent = '________________';
            placeholder.style.borderBottom = '1px solid #000';
            placeholder.style.display = 'inline-block';
            placeholder.style.width = '100px';
            el.parentNode.replaceChild(placeholder, el);
        });

        // Remove dotted lines if specified
        if (settings.removeDottedLines) {
            container.querySelectorAll('*').forEach(el => {
                el.style.borderStyle = 'none';
            });
        }

        // Temporarily add the modified clone to the document
        document.body.appendChild(container);

        // Function to capture a section of the container
        async function captureSection(element) {
            const canvas = await html2canvas(element, { 
                scale: 2,
                useCORS: true,
                logging: false
            });
            return canvas.toDataURL('image/jpeg', 1.0);
        }

        // Get all top-level sections
        const sections = container.children;
        let pageNumber = 1;
        let yOffset = settings.margin;

        for (let i = 0; i < sections.length; i++) {
            const sectionImg = await captureSection(sections[i]);
            const imgProps = doc.getImageProperties(sectionImg);
            const imgHeight = (contentWidth / imgProps.width) * imgProps.height;

            if (yOffset + imgHeight > pageHeight - settings.margin) {
                // Start a new page
                doc.addPage();
                addPageNumber(doc, pageNumber);
                pageNumber++;
                yOffset = settings.margin;
            }

            doc.addImage(sectionImg, 'JPEG', settings.margin, yOffset, contentWidth, imgHeight);
            yOffset += imgHeight + 5; // 5mm space between sections
        }

        // Add page number to the last page
        addPageNumber(doc, pageNumber);

        // Remove the temporary element
        document.body.removeChild(container);

        // Generate file name
        let fileName = settings.filename;
        const titleElement = container.querySelector('.title-panel h1');
        if (titleElement) {
            fileName = titleElement.textContent.trim().replace(/\s+/g, '-') + '.pdf';
        } else if (fileName === 'document.pdf') {
            const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
            fileName = timestamp + '-story.pdf';
        }

        // Save the PDF
        doc.save(fileName);
    }
};
