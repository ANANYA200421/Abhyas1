import fs from 'fs';
import path from 'path';

// Generate a valid 3-page PDF with outlines and text for Abhyas Physics textbook
function generateSamplePDF() {
  const content = `%PDF-1.4
1 0 obj
<<
  /Type /Catalog
  /Pages 2 0 R
  /Outlines 10 0 R
>>
endobj
2 0 obj
<<
  /Type /Pages
  /Kids [3 0 R 4 0 R 5 0 R]
  /Count 3
>>
endobj
3 0 obj
<<
  /Type /Page
  /Parent 2 0 R
  /MediaBox [0 0 612 792]
  /Contents 6 0 R
  /Resources <<
    /Font << /F1 9 0 R /F2 13 0 R >>
  >>
>>
endobj
4 0 obj
<<
  /Type /Page
  /Parent 2 0 R
  /MediaBox [0 0 612 792]
  /Contents 7 0 R
  /Resources <<
    /Font << /F1 9 0 R /F2 13 0 R >>
  >>
>>
endobj
5 0 obj
<<
  /Type /Page
  /Parent 2 0 R
  /MediaBox [0 0 612 792]
  /Contents 8 0 R
  /Resources <<
    /Font << /F1 9 0 R /F2 13 0 R >>
  >>
>>
endobj
6 0 obj
<< /Length 285 >>
stream
BT
/F2 24 Tf
50 720 Td
(Abhyas Physics - Grade 11) Tj
/F1 14 Tf
0 -40 Td
(Chapter 1: Electrostatics and Electric Charges) Tj
/F1 11 Tf
0 -30 Td
(1.1 Introduction to Electric Charges and Quantization) Tj
0 -20 Td
(Matter is composed of atoms containing positively charged protons and negatively charged electrons.) Tj
0 -18 Td
(Charge is quantized in integral multiples of elementary charge e = 1.602 x 10^-19 C.) Tj
0 -25 Td
(Coulomb's Law states that force between two point charges is inversely proportional to r^2.) Tj
ET
endstream
endobj
7 0 obj
<< /Length 290 >>
stream
BT
/F2 20 Tf
50 720 Td
(Chapter 1.2: Gauss's Law and Electric Flux) Tj
/F1 12 Tf
0 -35 Td
(Electric flux is the measure of the electric field passing through a given surface area.) Tj
0 -20 Td
(Formula: Flux = Closed Integral of E . dA = Q_enc / Epsilon_0) Tj
0 -25 Td
(Gauss's law provides a powerful technique for calculating electric fields of symmetric charge distributions.) Tj
0 -20 Td
(Applications include spherical shells, infinite plane sheets, and cylindrical conductors.) Tj
ET
endstream
endobj
8 0 obj
<< /Length 260 >>
stream
BT
/F2 20 Tf
50 720 Td
(Chapter 1.3: Electric Potential & Capacitors) Tj
/F1 12 Tf
0 -35 Td
(Electric potential is the work done per unit charge in bringing it from infinity to a point.) Tj
0 -20 Td
(Capacitance C = Q / V measures the ability of a conductor to store electric potential energy.) Tj
0 -20 Td
(Parallel plate capacitor capacitance is given by C = (Epsilon_0 * A) / d.) Tj
ET
endstream
endobj
9 0 obj
<<
  /Type /Font
  /Subtype /Type1
  /BaseFont /Helvetica
>>
endobj
13 0 obj
<<
  /Type /Font
  /Subtype /Type1
  /BaseFont /Helvetica-Bold
>>
endobj
10 0 obj
<<
  /Type /Outlines
  /First 11 0 R
  /Last 12 0 R
  /Count 2
>>
endobj
11 0 obj
<<
  /Title (1.1 Electric Charges & Coulomb's Law)
  /Parent 10 0 R
  /Next 12 0 R
  /Dest [3 0 R /Fit]
>>
endobj
12 0 obj
<<
  /Title (1.2 Gauss's Flux Theorem)
  /Parent 10 0 R
  /Prev 11 0 R
  /Dest [4 0 R /Fit]
>>
endobj
xref
0 14
0000000000 65535 f 
0000000009 00000 n 
0000000078 00000 n 
00000000147 00000 n 
00000000282 00000 n 
00000000417 00000 n 
00000000552 00000 n 
00000000889 00000 n 
00000001231 00000 n 
00000001543 00000 n 
00000001614 00000 n 
00000001683 00000 n 
00000001783 00000 n 
00000001880 00000 n 
trailer
<<
  /Size 14
  /Root 1 0 R
>>
startxref
1956
%%EOF`;

  const targetPath = path.resolve(process.cwd(), 'public/sample_textbook.pdf');
  fs.writeFileSync(targetPath, content.trim(), 'utf-8');
  console.log('Sample PDF generated at:', targetPath);
}

generateSamplePDF();
