// src/utils/qzTrayService.js
// Servicio centralizado para la integración con QZ Tray en el sistema POS
import qz from 'qz-tray';

// Configurar seguridad digital de QZ Tray (Certificado X.509 y Firma Digital RSA-SHA512)
const initQzSecurity = () => {
  if (typeof qz === 'undefined' || !qz.security) return;

  qz.security.setCertificatePromise((resolve, reject) => {
    fetch('/api/printing/qz-certificate')
      .then(res => {
        if (!res.ok) throw new Error('Certificado digital no disponible');
        return res.text();
      })
      .then(resolve)
      .catch(err => {
        console.warn('⚠️ [QZ Tray] No se pudo cargar el certificado digital:', err.message);
        reject(err);
      });
  });

  qz.security.setSignatureAlgorithm('SHA512');

  qz.security.setSignaturePromise((toSign) => {
    return (resolve, reject) => {
      fetch('/api/printing/qz-sign', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: toSign
      })
        .then(res => {
          if (!res.ok) throw new Error('Error al generar firma digital');
          return res.text();
        })
        .then(resolve)
        .catch(err => {
          console.warn('⚠️ [QZ Tray] Error en firma digital:', err.message);
          reject(err);
        });
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
