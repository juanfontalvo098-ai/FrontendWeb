// src/utils/qzTrayService.js
// Servicio centralizado para la integración con QZ Tray en el sistema POS
import qz from 'qz-tray';

// Certificado Digital X.509 para KAMIA GastrosPOS Printing System
const GASTROS_CERTIFICATE_PEM = `-----BEGIN CERTIFICATE-----
MIIDfTCCAmWgAwIBAgIUc9Znk48QT40ASj32NwTGxcr7H1owDQYJKoZIhvcNAQEL
BQAwTjEpMCcGA1UEAwwgS0FNSUEgR2FzdHJvc1BPUyBQcmludGluZyBTeXN0ZW0x
FDASBgNVBAoMC0tBTUlBIGJ5IEpGMQswCQYDVQQGEwJDTzAeFw0yNjA4MjIwNzE2
MTdaFw0zNjA4MTkwNzE2MTdaME4xKTAnBgNVBAMMIEtBTUlBIEdhc3Ryb3NQT1Mg
UHJpbnRpbmcgU3lzdGVtMRQwEgYDVQQKDAtLQU1JQSBieSBKRjELMAkGA1UEBhMC
Q08wggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQC+BFms589FN1OYPd2t
4Y0/o40xoLNxQzYx7bbzChMgOUraLtG9vH51iTXj9N3DyXlaAVt36sD7TUsBqQ7e
sg9T5nZ0VbYRf3E+W72stJ/Hioq62jsYF4p5EIkqpGmYWmd8xf50pO0TgqZangRK
9a4KQmMtSYpZCWT2NYWYiez4hgykj/PIs1W58uuhdTlTpMY8MAGrlmEvwy6d9ohe
6Uf7+LTcjv/oMj2bwsRven3okxgP+543HBDZAkqKKbf10eIox50FkfdUYmNKnZfw
IlE1Hq/polYngdqxi6JLVy9EJ71zRbYKBjKAoYqChkcWt4nGMjXfUibkPcaQkGqi
rMY9AgMBAAGjUzBRMB0GA1UdDgQWBBSWJ0rWxPPa/C/KmqeerlM43+kBjjAfBgNV
HSMEGDAWgBSWJ0rWxPPa/C/KmqeerlM43+kBjjAPBgNVHRMBAf8EBTADAQH/MA0G
CSqGSIb3DQEBCwUAA4IBAQA/KFwzohtpiT8Hutv4mzypPJg2EmOfUjDrDBiuvp4F
73Y37WSAK6D+CmyDL/q/i0fy4Jje8Lj1vscaiFzQNHPDfosELNkLG4j04egg+fST
PG/prMmL7VnPrOziW8r+pOf2Stj3Qf0zuzl/bVKIC30A5TZ4BUW18VADLUyXJ25+
TwCLbc0755i3UpNEvF3m7pHSLyRu9a+31K2Wo0Qdp72aTnLVXFfRetuKZ+wdvyZM
fUYiq61lQV6v9u/jrMY4v+00Pkw0GDw/FQPsArtfQ2XEF0/CTmAa2oFaZf4Rycjg
fw4Yw0gZ2d1VJSyDGspN3tSk7OTxcCyceTdFxxPWS3uw
-----END CERTIFICATE-----`;

// Llave privada PKCS#8 para firma digital local RSA-SHA512
const GASTROS_PRIVATE_KEY_B64 = `MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC+BFms589FN1OYPd2t4Y0/o40xoLNxQzYx7bbzChMgOUraLtG9vH51iTXj9N3DyXlaAVt36sD7TUsBqQ7esg9T5nZ0VbYRf3E+W72stJ/Hioq62jsYF4p5EIkqpGmYWmd8xf50pO0TgqZangRK9a4KQmMtSYpZCWT2NYWYiez4hgykj/PIs1W58uuhdTlTpMY8MAGrlmEvwy6d9ohe6Uf7+LTcjv/oMj2bwsRven3okxgP+543HBDZAkqKKbf10eIox50FkfdUYmNKnZfwIlE1Hq/polYngdqxi6JLVy9EJ71zRbYKBjKAoYqChkcWt4nGMjXfUibkPcaQkGqirMY9AgMBAAECggEAEtA5879g23zKm052yh5EnqoqEuGTGrH5pfBgFoinE5/wjBEqJZPJ3ofHDOqj4VxrljB/tqwIzujcdg3fwcdV8qvlCwgodmuMkgzBxx18G2TZbv4n7y73gByVxCHSram3yNgOpUxmB7I+F8dA7A4OnQftK2D2YHHoa+MpNszjKEjruPvSs4VUcBHJoxUWcS/xv1O7a70HnIqhnz5QinST4bXbnXJk2eAXgjQvjjJfeDWrk30Z28tT3ab+eFVGBISSl+IUbLe6sakRsomyXQubpj6pFEPBXq6BATzqY+b73F88O/KSUELYl67iKBmOZKbZax21g+zCj5hQcDFVH0K7cQKBgQDkI/b3bb1RUunIE2S3yowmvb9oSKrSL+D36fOTapRef8YfWT6ZzKFuuAs2I/36hAQEDQMDUtbKURBCzznWN1fBxtfcLPAfUV+WhBX40/+Yjs4sXemGuUywEwjJR521P8QE4kgYDZnUvJ/paj5kDKp20l/Z9JmhU2Nfp+vU5gZ1DQKBgQDVOJWa8UFu3Di9kwbURvKxDzkRvRd5wFhURy7n8ax+ej6+DvoahmgHPwXor6PwmuPPzRdYShne+lMtmhpFHUnmmwSfIcCIIkRYvYTaleDn+q6ivHt8PJc9MSQWLv/cLoBwQHmY8VIlTrGxtIaO3j+weDDnGfbyV9vFi882Ed+p8QKBgQC9LhmYOdbYfgHAWFyXj41CfuwfBMsp+mv6CHVkE+guqJPY4P9pN+fR0Sny3ku4lgpidYu/EM1t/WSXkhFq0n+h/0p2mIkR3z99p9A0g0+a6SiMX9/LSRMPmukZR5q+dr8MMbwIvhaG81dDjkdoXZxpZa/4I73VqjloU+3aoFhQbQKBgB7GOvmRBqOsj1f1R5AN6Wtayh7gTuoYs+b+GywI+p+Kn1GpMbnwWkVpeD3cU+ofQPA2Jr9seo1vTeAQFOiS0J7DEwiww2wingC84db2uO5ihSAh2iTVTfLcC9xTzkQGRi1tcN99PSD7WbRPXPhz5Xdf8Zb5bWYO/j5l7nNcYw7RAoGBAN4VSB0Y89gIAeL1PeTUoqyAYanymnyUlWHVXlfj3lCqCAViwPhbNbZKOIMXvcWwta778CkQAkJ/XW87ruhoy+tcQ9ardHAUV8Kc3fsuUPkjjIInNIIJAYSN8MtXvSjNB/xKT9Hqx3slE6L3AIuyAExhb4c4TgVZuChw+5UsvVOo`;

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
