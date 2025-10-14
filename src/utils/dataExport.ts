import { jsPDF } from "jspdf";

export const addLogoToPDF = (doc: jsPDF, pageWidth: number): Promise<void> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = '/logo.png'; // doit être dans /public/logo.png

    img.onload = () => {
      try {
        const logoX = 15;      // Position horizontale du logo
        const logoY = 15;      // Position verticale du logo
        const logoW = 50;      // Largeur
        const logoH = 20;      // Hauteur

        // ✅ Ajout du logo
        doc.addImage(img, 'PNG', logoX, logoY, logoW, logoH);

        // ✅ Texte en dessous du logo
        const textY = logoY + logoH + 5; // 5px d'espace sous le logo
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text("Groupe Chimique Tunisien", logoX, textY);

        // Si tu veux aussi la 2e ligne :
        /*
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text("Direction des Arrêts Techniques", logoX, textY + 7);
        */

        resolve();
      } catch (err) {
        console.error("Erreur ajout logo :", err);
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text("Groupe Chimique Tunisien", 15, 25);
        resolve();
      }
    };

    img.onerror = () => {
      console.warn("⚠️ Impossible de charger le logo, utilisation du texte seul.");
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text("Groupe Chimique Tunisien", 15, 25);
      resolve();
    };
  });
};


function toBase64(img: HTMLImageElement): string {
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.drawImage(img, 0, 0);
  }
  return canvas.toDataURL("image/png");
}
