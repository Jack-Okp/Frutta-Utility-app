// src/services/pdf.js
import html2pdf from 'html2pdf.js';

export const exportToPdf = (elementId, filename = 'report.pdf') => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found`);
    return;
  }
  
  const opt = {
    margin:       0.5,
    filename:     filename,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2 },
    jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
  };

  html2pdf().set(opt).from(element).save();
};
