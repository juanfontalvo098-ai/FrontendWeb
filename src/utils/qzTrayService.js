// src/utils/qzTrayService.js
// Servicio centralizado para la integración con QZ Tray en el sistema POS
import qz from 'qz-tray';

// Certificado Digital X.509 v3 CA para KAMIA GastrosPOS Printing System
const GASTROS_CERTIFICATE_PEM = `-----BEGIN CERTIFICATE-----
MIIDjTCCAnWgAwIBAgIUOOdLXPRSovG8BA5FHsMSvfXdSKQwDQYJKoZIhvcNAQEL
BQAwTjELMAkGA1UEBhMCQ08xFDASBgNVBAoMC0tBTUlBIGJ5IEpGMSkwJwYDVQQD
DCBLQU1JQSBHYXN0cm9zUE9TIFByaW50aW5nIFN5c3RlbTAeFw0yNjA4MjIwNzMx
NDhaFw00NjA4MTcwNzMxNDhaME4xCzAJBgNVBAYTAkNPMRQwEgYDVQQKDAtLQU1J
QSBieSBKRjEpMCcGA1UEAwwgS0FNSUEgR2FzdHJvc1BPUyBQcmludGluZyBTeXN0
ZW0wggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQC9uFRj1hlCQco655M0
RKFmegH/KDZm0kfWJbbRJZbgLrGcND0aiMfmGgNbf6jB93Kr/a6eRUtCP9eYvelf
2VdFJRDk1a8UHKVrBATYv9px/S3sr6rQ9zaxPDRidIDfqaLVLxv5t9hbL+AVciND
IvmivpW5zuZ2mUxrP1wVCjaiVwUKutzcCrc4tfa1e7wlbXg8V7LSTcKFMz5XIN2d
mJ/KbujSek79WffNUFH7wWQ2Bxn/+UBLhmjMcWootF4HAoZs1laYxbYcoQPeRaxH
do3w2rpry2ldBLMIv9onsmTlMfiv0EbRabeawMM4uqyOQxmT1wYGs/au1ohI/erF
z/5rAgMBAAGjYzBhMB0GA1UdDgQWBBTiVpGggnmelQSvKrSYV7KRPOwOPDAfBgNV
HSMEGDAWgBTiVpGggnmelQSvKrSYV7KRPOwOPDAPBgNVHRMBAf8EBTADAQH/MA4G
A1UdDwEB/wQEAwIBhjANBgkqhkiG9w0BAQsFAAOCAQEArzv4om65r5jNiSXhg5ps
A9jyY2SK4xPRmVD1XrVJi/QqAPXZMuvcvOmsIjHiZeXOaLbQgQU3Ew3m0V7QQ+zc
A7XjHTKFk4BfFAb469u3KzGll6zatRp4yJNQ17EoWufsWSyj2xxdqU1SnMjBFhxJ
DyKZqibPlbfy1ThNuleqOsdTGqSTHfjXCpqiCkfZA6rbJs2/CJZe/ySxzk7qn24k
68c5WLpApRGCerTRF+fhFnd8q/apkPJdMynOeW5LvWH/s9lbywvmhKsBsLCo1tj7
9GUDEK1dvrqXpSJoZVMdKCJzXQkN/LM9GZLwzIL7Pzz4HcGTV0Sc+5CejL1wLcBs
8A==
-----END CERTIFICATE-----`;

// Llave privada PKCS#8 para firma digital local RSA-SHA512
const GASTROS_PRIVATE_KEY_B64 = `MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC9uFRj1hlCQco6
55M0RKFmegH/KDZm0kfWJbbRJZbgLrGcND0aiMfmGgNbf6jB93Kr/a6eRUtCP9eY
velf2VdFJRDk1a8UHKVrBATYv9px/S3sr6rQ9zaxPDRidIDfqaLVLxv5t9hbL+AV
ciNDIvmivpW5zuZ2mUxrP1wVCjaiVwUKutzcCrc4tfa1e7wlbXg8V7LSTcKFMz5X
IN2dmJ/KbujSek79WffNUFH7wWQ2Bxn/+UBLhmjMcWootF4HAoZs1laYxbYcoQPe
RaxHdo3w2rpry2ldBLMIv9onsmTlMfiv0EbRabeawMM4uqyOQxmT1wYGs/au1ohI
/erFz/5rAgMBAAECggEAJKCMJlQkvz5tWQ7xQ/OGB39BmG2+hv5M4SKZ12n+5VwO
bR5Gt7M1iI54HHeacIwhxuOsjSDKpUknCfWMMzWGHDLKPqukZ+kZ5H27o87yUPR0
o8/MVhiMJg59/I4KfWPGLIsyRvU/32bwR6On/COp90n9JQi1RKtW7hOm5ub4YkG9
tnyuSCSJvXgy2jTLSamIdXKLPFonCczSp/QXZbngmYbl6AHVfgCYlHc+SUoZgy1H
vCMbylJNEQyynMVivF8VlzJ+ZFMYhIN/tMAvOGdaRjVwuySuVlemQWVPrWNkNJpm
JqtbgeU/fAjNm50AIzGV4aLU/J8FqLAvK9FiDXbatQKBgQD8WpCdzpGIgaIJlwB/
U0azISl2fDdhzH9trfC6T26sEXFO35gF9vFeCLIy0CF8LZ0O+hcWt/1JagfwnQ5w
jNccyAKnlPyYWyb/+WTWR32KnfFoL8snmH7ONYTYT+guigyeuAMFLlpuoYNSwdRT
galRzjM0gb3IBSVwqb9VXhHT3QKBgQDAdhaA3+l1aN4pBXCdhBsNcKpnIapitI6y
wC2SQe1oaL74ki9QGY6336xHpWugvvEUt2HI1TiBf33oMO7OrVpdTllC2h2c8wRl
OxBIhIyKGH5zb296nLwbSrdO4Gr+Qn1cSxyTr/kxYELrbEuhRH2DW/fLLV9EgqpJ
YqzoUuT65wKBgQCZWifb3jYOcEiZ70t8FI04OgTKXf4BzpX5fuR1M+QbaJYkyjfG
GCThcgNoYZaXsdhpy4zQX4rqXCbrD2ZA+zWV5e3HDQDbTTlMALBIjzU5UXXsTG72
ZvNYOKm8EgMUlQvKQCSFt395D2mQlv2CqZ7NebMgS1+a95Wi+2SsafgHeQKBgC0y
DerJqis2KyV6740t3qRzVrDNSRPQzsnPM2RrMvMX1fDNc2rd9ZPcZLqWcAXZkQeK
YN4mpBRU+h4yj4HdV6Edqvx1+ApJTzjue85rwg0T324ANy+V6t6F1zIgpT98IbAw
u087PcuIjW53ifMfAFJ+oFwIFZ0jChYdo/kSrk71AoGBAOuZIDLrs78WyxtsDmzS
fxUwDy0PH7akKffDQVfIde5VOzlPy7Lgi1chdfaZnhGX8mT2GqAZEUFoZIdXC00N
3/ld5gT/mOERaqbSNJ+OmeFiDc0YopYCfXZCb+HO6JEaO9cdtVbxVVMlZVtVq9VB
rflf6GDSYBDRaBzKF4JFQcUC
-----END PRIVATE KEY-----`;

let cachedCryptoKey = null;

// Importar llave privada con WebCrypto nativo del navegador
const getWebCryptoKey = async () => {
  if (cachedCryptoKey) return cachedCryptoKey;
  try {
    if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) return null;
    const cleanB64 = GASTROS_PRIVATE_KEY_B64.replace(/\s+/g, '');
    const binaryDer = Uint8Array.from(atob(cleanB64), c => c.charCodeAt(0));
    cachedCryptoKey = await window.crypto.subtle.importKey(
      'pkcs8',
      binaryDer.buffer,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-512' },
      false,
      ['sign']
    );
    return cachedCryptoKey;
  } catch (err) {
    console.error('Error al inicializar llave criptográfica de QZ:', err);
    return null;
  }
};

// Configurar seguridad digital de QZ Tray (Certificado X.509 y Firma Digital RSA-SHA512)
const initQzSecurity = () => {
  if (typeof qz === 'undefined' || !qz.security) return;

  // 1. Promesa de Certificado Digital (0ms, siempre disponible)
  qz.security.setCertificatePromise((resolve) => {
    resolve(GASTROS_CERTIFICATE_PEM);
  });

  // 2. Algoritmo RSA-SHA512
  qz.security.setSignatureAlgorithm('SHA512');

  // 3. Promesa de Firma Digital (WebCrypto local ultrarrápido y fallback a API)
  qz.security.setSignaturePromise((toSign) => {
    return async (resolve, reject) => {
      try {
        const key = await getWebCryptoKey();
        if (key && window.crypto && window.crypto.subtle) {
          const enc = new TextEncoder();
          const dataBuf = enc.encode(toSign);
          const sigBuf = await window.crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, dataBuf);
          const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sigBuf)));
          return resolve(sigB64);
        }

        // Fallback a endpoint de firma
        fetch('/api/printing/qz-sign', {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: toSign
        })
          .then(res => res.text())
          .then(resolve)
          .catch(reject);
      } catch (err) {
        console.error('⚠️ [QZ Tray] Error al firmar digitalmente la petición:', err);
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
