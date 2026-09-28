import os
import sys
import time
import re
import asyncio
import subprocess
from pathlib import Path
import requests

# For colorful console output
try:
    from colorama import init, Fore, Style
    init(autoreset=True)
    GREEN = Fore.GREEN
    YELLOW = Fore.YELLOW
    CYAN = Fore.CYAN
    RED = Fore.RED
    RESET = Style.RESET_ALL
    BOLD = Style.BRIGHT
except ImportError:
    GREEN = YELLOW = CYAN = RED = RESET = BOLD = ""

try:
    from playwright.async_api import async_playwright
except ImportError:
    print(f"{RED}Error: La librería 'playwright' no está instalada.{RESET}")
    print("Por favor ejecuta: pip install playwright pandas openpyxl requests colorama")
    sys.exit(1)

try:
    import pandas as pd
    HAS_PANDAS = True
except ImportError:
    HAS_PANDAS = False


# Setup directories
BASE_DIR = Path.cwd() / "Facturas_DIAN_Descargadas"
EMITIDAS_DIR = BASE_DIR / "Facturas_Emitidas_Ventas"
RECIBIDAS_DIR = BASE_DIR / "Facturas_Recibidas_Compras"
SOPORTE_DIR = BASE_DIR / "Documentos_Soporte"

for d in [BASE_DIR, EMITIDAS_DIR, RECIBIDAS_DIR, SOPORTE_DIR]:
    d.mkdir(parents=True, exist_ok=True)


def sanitize_filename(name):
    """Limpia caracteres no válidos para nombres de archivo en Windows."""
    if not name:
        return "DESCONOCIDO"
    clean = re.sub(r'[\\/*?:"<>|]', '_', str(name)).strip()
    return clean if clean else "DOCUMENTO"


def launch_chrome_automatically():
    """Abre Google Chrome en modo depuración automáticamente."""
    print(f"{CYAN}🌐 Abriendo Google Chrome automáticamente en modo compatible DIAN...{RESET}")
    
    chrome_path = "chrome.exe"
    possible_paths = [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe")
    ]
    for path in possible_paths:
        if os.path.exists(path):
            chrome_path = path
            break

    debug_dir = os.path.expandvars(r"%TEMP%\chrome_dian_debug")
    os.makedirs(debug_dir, exist_ok=True)

    cmd = [
        chrome_path,
        "--remote-debugging-port=9222",
        f"--user-data-dir={debug_dir}",
        "https://catalogo-vpfe.dian.gov.co"
    ]
    try:
        subprocess.Popen(cmd)
        print(f"{GREEN}✓ Google Chrome ha sido iniciado.{RESET}")
    except Exception as e:
        print(f"{RED}❌ No se pudo abrir Chrome automáticamente: {e}{RESET}")


async def find_dian_page(browser_context):
    """Busca una pestaña activa que corresponda al portal de la DIAN."""
    pages = browser_context.pages
    for page in pages:
        url = page.url.lower()
        if "dian.gov.co" in url or "vpfe" in url or "facturaelectronica" in url:
            return page
    return None


async def extract_invoices_from_page(page, document_type="Emitidas"):
    """Extrae la lista de facturas o documentos soporte de la tabla activa."""
    invoices = []
    
    try:
        await page.wait_for_selector("table, div.card, div.table-responsive", timeout=5000)
    except Exception:
        print(f"{YELLOW}⚠️ No se detectó una tabla de registros en la página actual.{RESET}")
        return invoices

    rows = await page.query_selector_all("table tbody tr")
    
    if not rows:
        print(f"{YELLOW}⚠️ No se encontraron filas en la vista actual.{RESET}")
        return invoices

    print(f"{CYAN}🔍 Procesando {len(rows)} registros encontrados en esta página...{RESET}")

    for idx, row in enumerate(rows, 1):
        try:
            row_text = await row.inner_text()
            if not row_text.strip():
                continue
            
            pdf_link = None
            xml_link = None
            
            action_elements = await row.query_selector_all("a, button, [onclick], [href]")
            
            for elem in action_elements:
                href = await elem.get_attribute("href") or ""
                onclick = await elem.get_attribute("onclick") or ""
                text = (await elem.inner_text() or "").strip().lower()
                title = (await elem.get_attribute("title") or "").strip().lower()
                
                if "pdf" in text or "pdf" in href.lower() or "pdf" in onclick.lower() or "pdf" in title:
                    pdf_link = elem
                elif "xml" in text or "zip" in text or "soporte" in href.lower() or "xml" in href.lower() or "xml" in onclick.lower() or "attached" in href.lower() or "xml" in title:
                    xml_link = elem

            cells = await row.query_selector_all("td")
            cell_texts = [(await c.inner_text()).strip() for c in cells]
            
            fecha = "FECHA_DESCONOCIDA"
            folio = f"DS_{idx}" if document_type == "Soporte" else f"FAC_{idx}"
            nit_tercero = "NIT_DESCONOCIDO"
            nombre_tercero = "PROVEEDOR/TERCERO"
            total = "0"

            for ct in cell_texts:
                if re.search(r'\d{4}-\d{2}-\d{2}|\d{2}/\d{2}/\d{4}', ct):
                    fecha = ct.replace('/', '-')
                elif re.search(r'^\d{7,10}(-\d)?$', ct):
                    nit_tercero = ct
                elif "$" in ct or re.search(r'^\$?\s?\d{1,3}(\.\d{3})*(\,\d{2})?$', ct):
                    total = ct
                elif re.search(r'^[A-Z0-9]{2,12}\d{1,10}$', ct):
                    folio = ct

            prefix_type = "DS" if document_type == "Soporte" else document_type[:3].upper()

            invoices.append({
                "index": idx,
                "document_type": document_type,
                "fecha": fecha,
                "folio": sanitize_filename(f"{prefix_type}_{folio}"),
                "nit_tercero": sanitize_filename(nit_tercero),
                "nombre_tercero": sanitize_filename(nombre_tercero),
                "total": total,
                "pdf_element": pdf_link,
                "xml_element": xml_link,
                "row_element": row
            })

        except Exception as e:
            print(f"{YELLOW}⚠️ Error leyendo fila {idx}: {e}{RESET}")

    return invoices


async def download_invoice_files(page, invoice, target_dir):
    """Descarga el PDF y XML del documento soporte o factura."""
    folio = invoice["folio"]
    fecha = invoice["fecha"]
    nit = invoice["nit_tercero"]
    prefix_name = f"{folio}_{fecha}_{nit}"
    
    pdf_path = target_dir / f"{prefix_name}.pdf"

    pdf_saved = False
    xml_saved = False

    if invoice["pdf_element"]:
        try:
            async with page.expect_download(timeout=10000) as download_info:
                await invoice["pdf_element"].click()
            download = await download_info.value
            await download.save_as(pdf_path)
            pdf_saved = True
            print(f"  {GREEN}✓ PDF guardado:{RESET} {pdf_path.name}")
        except Exception as e:
            print(f"  {YELLOW}⚠ No se pudo descargar el PDF de {folio}: {e}{RESET}")

    if invoice["xml_element"]:
        try:
            async with page.expect_download(timeout=10000) as download_info:
                await invoice["xml_element"].click()
            download = await download_info.value
            ext = ".zip" if download.suggested_filename.endswith(".zip") else ".xml"
            xml_target = target_dir / f"{prefix_name}{ext}"
            await download.save_as(xml_target)
            xml_saved = True
            print(f"  {GREEN}✓ XML/ZIP guardado:{RESET} {xml_target.name}")
        except Exception as e:
            print(f"  {YELLOW}⚠ No se pudo descargar el XML de {folio}: {e}{RESET}")

    return pdf_saved, xml_saved


async def main():
    print(f"\n{BOLD}{CYAN}==============================================================={RESET}")
    print(f"{BOLD}{GREEN} 🚀 ASISTENTE DE DESCARGA MASIVA DIAN: FACTURAS & DOC. SOPORTE{RESET}")
    print(f"{BOLD}{CYAN}==============================================================={RESET}\n")

    print(f"Conectando al navegador Chrome en {CYAN}http://localhost:9222{RESET}...")

    async with async_playwright() as p:
        browser = None
        for intento in range(3):
            try:
                browser = await p.chromium.connect_over_cdp("http://localhost:9222")
                break
            except Exception:
                if intento == 0:
                    print(f"{YELLOW}⚠️ Chrome no está abierto con el depurador activado.{RESET}")
                    launch_chrome_automatically()
                    print(f"{CYAN}Esperando a que la ventana de Chrome cargue (5 segundos)...{RESET}\n")
                    await asyncio.sleep(5)
                else:
                    await asyncio.sleep(2)

        if not browser:
            print(f"\n{RED}❌ No se pudo establecer conexión con Chrome.{RESET}")
            return

        contexts = browser.contexts
        dian_page = None
        
        print(f"{CYAN}Verificando sesión activa en la DIAN...{RESET}")
        for retry in range(15):
            for context in contexts:
                dian_page = await find_dian_page(context)
                if dian_page: break
            if dian_page: break
            await asyncio.sleep(3)

        if not dian_page:
            print(f"\n{YELLOW}⚠️ No se detectó ninguna pestaña abierta en la DIAN.{RESET}\n")
            return

        url = dian_page.url
        title = await dian_page.title()
        print(f"\n{GREEN}✓ ¡Sesión DIAN detectada con éxito!{RESET}")
        print(f"  Pestaña: {title}\n")

        print(f"{BOLD}Selecciona el tipo de documentos a descargar:{RESET}")
        print(" [1] Facturas Emitidas (Ventas)")
        print(" [2] Facturas Recibidas (Compras / Gastos)")
        print(" [3] Documentos Soporte (Sujetos No Obligados a Expedir Factura)")
        print(" [4] Todos los tipos (Ventas + Compras + Doc. Soporte)")
        
        opcion = input(f"\n{CYAN}Ingresa tu opción (1, 2, 3 o 4) [Default: 3]: {RESET}").strip() or "3"

        modos = []
        if opcion == "1":
            modos = [("Emitidas", EMITIDAS_DIR)]
        elif opcion == "2":
            modos = [("Recibidas", RECIBIDAS_DIR)]
        elif opcion == "3":
            modos = [("Soporte", SOPORTE_DIR)]
        else:
            modos = [("Emitidas", EMITIDAS_DIR), ("Recibidas", RECIBIDAS_DIR), ("Soporte", SOPORTE_DIR)]

        summary_records = []

        for doc_type, target_folder in modos:
            print(f"\n{BOLD}{CYAN}---------------------------------------------------------------{RESET}")
            print(f"{BOLD} 📥 PROCESANDO: {doc_type.upper()}{RESET}")
            print(f" Carpeta destino: {target_folder}")
            print(f"{BOLD}{CYAN}---------------------------------------------------------------{RESET}\n")

            await dian_page.bring_to_front()

            page_num = 1
            total_downloaded_pdf = 0
            total_downloaded_xml = 0

            while True:
                print(f"\n{BOLD}📄 Procesando Página #{page_num}...{RESET}")
                invoices = await extract_invoices_from_page(dian_page, document_type=doc_type)

                if not invoices:
                    print(f"{YELLOW}No se encontraron documentos procesables en esta página.{RESET}")
                    break

                for inv in invoices:
                    print(f"\n{CYAN}[{inv['index']}/{len(invoices)}] Registro: {inv['folio']} | Fecha: {inv['fecha']} | NIT: {inv['nit_tercero']}{RESET}")
                    pdf_ok, xml_ok = await download_invoice_files(dian_page, inv, target_folder)
                    
                    if pdf_ok: total_downloaded_pdf += 1
                    if xml_ok: total_downloaded_xml += 1

                    summary_records.append({
                        "Tipo Documento": doc_type,
                        "Fecha": inv["fecha"],
                        "Folio / Prefijo": inv["folio"],
                        "NIT Tercero": inv["nit_tercero"],
                        "Tercero / Proveedor": inv["nombre_tercero"],
                        "Total": inv["total"],
                        "PDF Descargado": "SÍ" if pdf_ok else "NO",
                        "XML Descargado": "SÍ" if xml_ok else "NO"
                    })

                    await asyncio.sleep(0.8)

                print(f"\n{CYAN}Buscando botón 'Siguiente' página...{RESET}")
                next_btn = await dian_page.query_selector("a.page-link:has-text('Next'), a.page-link:has-text('Siguiente'), li.next a, button:has-text('Siguiente')")
                
                if next_btn:
                    is_disabled = await next_btn.evaluate("el => el.classList.contains('disabled') || el.hasAttribute('disabled')")
                    if is_disabled:
                        print(f"{GREEN}✓ Se ha alcanzado la última página.{RESET}")
                        break
                    
                    print(f"{CYAN}▶ Avanzando a la siguiente página...{RESET}")
                    await next_btn.click()
                    await asyncio.sleep(3.0)
                    page_num += 1
                else:
                    print(f"{GREEN}✓ No hay más páginas para recorrer.{RESET}")
                    break

            print(f"\n{GREEN} Resumen {doc_type}:{RESET} {total_downloaded_pdf} PDFs y {total_downloaded_xml} XMLs guardados en {target_folder}")

        if HAS_PANDAS and summary_records:
            excel_path = BASE_DIR / "resumen_documentos_dian.xlsx"
            df = pd.DataFrame(summary_records)
            df.to_excel(excel_path, index=False)
            print(f"\n{BOLD}{GREEN}📊 Reporte consolidado en Excel guardado en:{RESET}\n   {excel_path}\n")

        print(f"{BOLD}{GREEN}🎉 ¡Proceso finalizado con éxito! Todos los archivos están en:{RESET}\n   {BASE_DIR}\n")


if __name__ == "__main__":
    asyncio.run(main())
