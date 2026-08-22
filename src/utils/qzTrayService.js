// src/utils/qzTrayService.js
// Servicio centralizado para la integración con QZ Tray en el sistema POS
import qz from 'qz-tray';
import { KEYUTIL, KJUR, hextorstr, stob64 } from 'jsrsasign';

// Certificado Digital Leaf emitido por KAMIA Root CA para KAMIA GastrosPOS Printing System
const GASTROS_CERTIFICATE_PEM = `-----BEGIN CERTIFICATE-----
MIIDiDCCAnCgAwIBAgIUU57gye3wYiqxTJNCpN+NjqomFQ8wDQYJKoZIhvcNAQEN
BQAwTzELMAkGA1UEBhMCQ08xHTAbBgNVBAoMFEtBTUlBIEluZHVzdHJpZXMgTExD
MSEwHwYDVQQDDBhLQU1JQSBHYXN0cm9zUE9TIFJvb3QgQ0EwHhcNMjYwODIyMDgx
OTIxWhcNNDYwODE3MDgxOTIxWjBOMQswCQYDVQQGEwJDTzEUMBIGA1UECgwLS0FN
SUEgYnkgSkYxKTAnBgNVBAMMIEtBTUlBIEdhc3Ryb3NQT1MgUHJpbnRpbmcgU3lz
dGVtMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAjKjwY3ZZ/YiiwzeV
bBA4MFSAiM2YIL7RjyECWxiRAXaZvrms0Pft5XT+BlzLr6mfwDUHCpJsHpc5k/O2
+2tJMYaeKwIOkNm57C0sSwe8TlsY/n6iznHuLNPIQ84ziLLX0nUMJYZeySWzOF45
ukXv4iuw8xn3Tw1h1R5mdrRKZZ32lyJ25gPGTqXnogw1VBdTkdCJ0wETTCTv+ELq
2PIW1Qpg3bqhy3vmAoB/vT4PFIBVvr/4a/hJ8d+ShaZNIxraDPtdhGPFpBG7Xh5r
y9VGrUjZYsj2QyywiSkXHZo2IJkEKguPhUzU/tAJ/qWg8qWDOUpXIT+Ije+Gs+Om
zfx5AwIDAQABo10wWzAJBgNVHRMEAjAAMB0GA1UdDgQWBBSEpOM5+Kc0cDiM5X1H
yUz7yVWr1DAfBgNVHSMEGDAWgBRdeVVuIgPGImIafnrttpxS/KGF9DAOBgNVHQ8B
Af8EBAMCBaAwDQYJKoZIhvcNAQENBQADggEBAFuRoLB1yEV6z+BAktEAzG59KrtU
79vAXTyXDUd4k0qIYrEFlg/lnoe7bI1zeCtC0TThjnJtXkXTWwc+vp5ZiAUKkHIo
BX79K5LzBXJ3fqBrXoBQdoeIJlHq97VRrWbga3q47IFO2QeXyRndkx5PnKyD4pCr
aX/XraL/j9qdGtwpKJe0WDet9OJFII3uUS3GUno5N+U849J6BWuYdQhHZ5lgPDNf
nE3+iN15sAdFpoDe+amJS8eOAOjmCKly31I86UmI4Mnc/Sa6AGYOYRQYQyRC4eZS
koQ5bGYWPvh/KyS6iF6nQ2RTLarVbaS4h4kiQVtuNlYfZpRLZ4KlGgd4k5I=
-----END CERTIFICATE-----`;

// Llave privada PKCS#8 para firma digital local RSA-SHA512
const GASTROS_PRIVATE_KEY_PEM = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCMqPBjdln9iKLD
N5VsEDgwVICIzZggvtGPIQJbGJEBdpm+uazQ9+3ldP4GXMuvqZ/ANQcKkmwelzmT
87b7a0kxhp4rAg6Q2bnsLSxLB7xOWxj+fqLOce4s08hDzjOIstfSdQwlhl7JJbM4
Xjm6Re/iK7DzGfdPDWHVHmZ2tEplnfaXInbmA8ZOpeeiDDVUF1OR0InTARNMJO/4
QurY8hbVCmDduqHLe+YCgH+9Pg8UgFW+v/hr+Enx35KFpk0jGtoM+12EY8WkEbte
HmvL1UatSNliyPZDLLCJKRcdmjYgmQQqC4+FTNT+0An+paDypYM5SlchP4iN74az
46bN/HkDAgMBAAECggEAHpXbk50YC0+rKKzM8m8CcMvnGRgvhKtJcQh59Sn92eYa
n0TLhbLriVHrrKF/7uYA5TACpHNbTDmQ3RGJD9lv1HOTsAFl/mxBh8/4yiXX9efM
IwaRSzet1RSF/ux2+zn8QPiPmBdERBPNCSw//DeZ5kGe2/Wg95EO3WMbX6Nra/Xf
LtQdQlKsaNTOMOlRQca1ln2HPM+D9yV/PKR6nRNIrNViGUCURULy04HYREEHevgQ
RSJ29eFgY2n4rN9NE8CJMV9Fvcf8+IeeXkH7SsZYAOomGM52H0R2pjp8GUPMy/Z5
RxinI3y/egjZ0hpdBXDl0DtgNbl+TTvQrIYe1XtS5QKBgQDBiq229doR3gUdYq/3
+txHxr8/AYqnZZyalvuhUCzTc/82WLRbHtTv1MUk+1Qh1ppSTWhOJ/NpKmKCGUNL
en797gibMH2GryUmpnzikN41912sWMIMGPScy1j3zLLXduAdD2Rv8ZRGXgECYEvN
SOTUDpSS4NQ4Dp8Mjb4eq5qxjQKBgQC6DXc34Lb/rJ2uiu1KCeRaVqXe6N/d6rpW
1STqvqgA/W49hf3L6M05VsJbDVcpzvNGmUE+dLI6gXB4Nv9QifEXpa5XD+HrxdaR
SdFrQJguklQkGk010T/ZISl60lRLi1SxlAnp5/5QJvyt+kVTy/56D+UagV2LWmww
T0nbrOSIzwKBgQCeD/cNTD37h5ofxKA34v2R9QPtngGx8q9yJUp+FO93Be3xYYJy
RHzdHaSgLk4okI5aFvPPmJsXUVFANQeblgAuu/71VyW9ID80EJY/ptaDtnEfNyHL
JXporz4KqneItoIT2aVKMz7INS+X1DM0BYs0kG/QgKNw4KgOZZhWjgl5ZQKBgQCx
l7rt1o03njBhdHEuVCTp6n2oOke+j5lQ22HCxTyevUpmZakt48lJazxYJ3LFEKr8
/7rcgA3EdNvDlFO/L/y3Iso4houTP6QhyQGiS+U3xyuTzptWvKcifloWx//4oEW2
v+V6pZ0GK0DUXOmiJD2Di/qXg1akdyqALp8ElpMK1wKBgGp1Mb7m7hOhX6oHgnHJ
UZt+DJPVcWLgNovEkSnSUCwaYcuSaXzo/sH1JS/o77BoV+XSbOyUe8CS+Jco/pbr
THq5u/HzWu+Rm15ovDsd28+ggl2/T68HUZdrexgeBWqR7erPFdSlcBpnjlF9kAoT
1T9yjdR7q9FfgmUm+KDsf733
-----END PRIVATE KEY-----`;

let cachedParsedKey = null;

const getParsedKey = () => {
  if (cachedParsedKey) return cachedParsedKey;
  try {
    cachedParsedKey = KEYUTIL.getKey(GASTROS_PRIVATE_KEY_PEM);
    return cachedParsedKey;
  } catch (err) {
    console.error('Error al inicializar llave criptográfica de QZ:', err);
    return null;
  }
};

// Configurar seguridad digital de QZ Tray (Certificado X.509 y Firma Digital RSA-SHA512 oficial)
const initQzSecurity = () => {
  if (typeof qz === 'undefined' || !qz.security) return;

  // 1. Certificado Digital
  qz.security.setCertificatePromise((resolve) => {
    resolve(GASTROS_CERTIFICATE_PEM);
  });

  // 2. Algoritmo RSA-SHA512
  qz.security.setSignatureAlgorithm('SHA512');

  // 3. Firma Digital Sincronica Infalible con jsrsasign (estándar oficial de QZ Tray)
  qz.security.setSignaturePromise(function (toSign) {
    return function (resolve, reject) {
      try {
        const pk = getParsedKey();
        if (!pk) throw new Error('Llave privada de firma no disponible');
        const sig = new KJUR.crypto.Signature({ alg: 'SHA512withRSA' });
        sig.init(pk);
        sig.updateString(toSign);
        const hex = sig.sign();
        const sigB64 = stob64(hextorstr(hex));
        resolve(sigB64);
      } catch (err) {
        console.error('⚠️ [QZ Tray] Error en firma digital jsrsasign:', err);
        reject(err);
      }
    };
  });
};

initQzSecurity();

class QzTrayService {
  constructor() {
    this.connected = false;
    this.connecting = false;
    this.connectionPromise = null;
    this.cachedPrinters = [];
    this.lastCheck = 0;
  }

  /**
   * Verifica si la conexión con QZ Tray está activa
   */
  isQzConnected() {
    return qz.websocket.isActive();
  }

  /**
   * Inicia conexión con QZ Tray en localhost:8182 (ws) o localhost:8181 (wss)
   */
  async connect(options = { retries: 0, delay: 0 }) {
    if (this.isQzConnected()) {
      this.connected = true;
      return true;
    }

    if (this.connecting && this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connecting = true;
    this.connectionPromise = (async () => {
      try {
        initQzSecurity();
        await qz.websocket.connect({
          retries: options.retries || 0,
          delay: options.delay || 0
        });
        this.connected = true;
        console.log('🟢 [QZ Tray] Conexión establecida exitosamente en localhost');
        return true;
      } catch (err) {
        this.connected = false;
        console.warn('🔴 [QZ Tray] No se pudo conectar con QZ Tray (¿está abierto en el PC?):', err.message || err);
        return false;
      } finally {
        this.connecting = false;
        this.connectionPromise = null;
      }
    })();

    return this.connectionPromise;
  }

  /**
   * Cierra la conexión websocket con QZ Tray
   */
  async disconnect() {
    if (this.isQzConnected()) {
      try {
        await qz.websocket.disconnect();
      } catch (e) {}
    }
    this.connected = false;
  }

  /**
   * Obtiene la lista de impresoras físicas instaladas en el sistema operativo Windows/Mac/Linux
   */
  async getPrinters(forceRefresh = false) {
    if (!forceRefresh && this.cachedPrinters.length > 0 && Date.now() - this.lastCheck < 15000) {
      return this.cachedPrinters;
    }

    const connected = await this.connect();
    if (!connected) {
      return [];
    }

    try {
      const list = await qz.printers.find();
      this.cachedPrinters = Array.isArray(list) ? list : (list ? [list] : []);
      this.lastCheck = Date.now();
      return this.cachedPrinters;
    } catch (err) {
      console.error('⚠️ [QZ Tray] Error al consultar impresoras:', err);
      return [];
    }
  }

  /**
   * Obtiene la impresora predeterminada del sistema
   */
  async getDefaultPrinter() {
    const connected = await this.connect();
    if (!connected) return null;

    try {
      return await qz.printers.getDefault();
    } catch (e) {
      return null;
    }
  }

  /**
   * Imprime un documento HTML (ticket térmico) de forma silenciosa directamente al spooler de la impresora
   * @param {string} htmlContent - Código HTML completo con estilos inline
   * @param {string|null} printerName - Nombre de la impresora en Windows (null para default)
   * @param {object} options - Opciones adicionales ({ paperWidth: '80mm' | '58mm', cut: true })
   */
  async printHtml(htmlContent, printerName = null, options = {}) {
    const connected = await this.connect();
    if (!connected) {
      throw new Error('QZ Tray no está conectado en este equipo');
    }

    let targetPrinter = printerName;
    if (!targetPrinter || targetPrinter === 'default') {
      targetPrinter = await this.getDefaultPrinter();
      if (!targetPrinter) {
        const list = await this.getPrinters();
        targetPrinter = list[0] || null;
      }
    }

    if (!targetPrinter) {
      throw new Error('No se encontró ninguna impresora de destino');
    }

    const widthMm = (options.paperWidth || '80mm') === '58mm' ? 58 : 80;

    // Configuración de impresión de píxeles/HTML sin escala distorsionada y sin márgenes
    const config = qz.configs.create(targetPrinter, {
      size: { width: widthMm },
      units: 'mm',
      margins: 0,
      scaleContent: false,
      colorType: 'grayscale',
      rasterize: true,
      jobName: options.jobName || 'Ticket POS Gastros'
    });

    const data = [
      {
        type: 'pixel',
        format: 'html',
        flavor: 'plain',
        data: htmlContent
      }
    ];

    await qz.print(config, data);
    console.log(`✅ [QZ Tray] Documento impreso con éxito en "${targetPrinter}"`);
    return { success: true, printer: targetPrinter };
  }

  /**
   * Envía comandos ESC/POS crudos (RAW) a la impresora
   */
  async printRaw(rawCommands, printerName = null) {
    const connected = await this.connect();
    if (!connected) {
      throw new Error('QZ Tray no está conectado en este equipo');
    }

    let targetPrinter = printerName;
    if (!targetPrinter || targetPrinter === 'default') {
      targetPrinter = await this.getDefaultPrinter();
    }
    if (!targetPrinter) {
      throw new Error('No se encontró ninguna impresora de destino');
    }

    const config = qz.configs.create(targetPrinter);
    const data = [
      {
        type: 'raw',
        format: 'plain',
        data: rawCommands
      }
    ];

    await qz.print(config, data);
    return { success: true, printer: targetPrinter };
  }

  /**
   * Envía el pulso eléctrico RJ11 para abrir el cajón monedero
   */
  async openCashDrawer(printerName = null) {
    try {
      // Comando ESC/POS estándar de apertura de cajón: ESC p 0 25 250
      const drawerCode = '\x1B\x70\x00\x19\xFA';
      return await this.printRaw(drawerCode, printerName);
    } catch (err) {
      console.warn('⚠️ [QZ Tray] No se pudo abrir cajón vía QZ Tray:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Corta el papel físicamente usando comando ESC/POS
   */
  async cutPaper(printerName = null) {
    try {
      // Feed 3 líneas + Corte total: ESC d 3 + GS V 0
      const cutCode = '\x1B\x64\x03\x1D\x56\x00';
      return await this.printRaw(cutCode, printerName);
    } catch (err) {
      console.warn('⚠️ [QZ Tray] No se pudo cortar papel:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Comprueba si este navegador está marcado como Estación de Impresión de la sucursal
   */
  isPrintStation() {
    try {
      return localStorage.getItem('pos_is_print_station') === 'true';
    } catch (e) {
      return false;
    }
  }

  /**
   * Establece este navegador como Estación de Impresión de la sucursal
   */
  setPrintStation(enabled) {
    try {
      localStorage.setItem('pos_is_print_station', enabled ? 'true' : 'false');
    } catch (e) {}
  }
}

export const qzService = new QzTrayService();
