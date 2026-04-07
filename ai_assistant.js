/**
 * DIMALCCO AI Assistant - Engine
 * Powered by Anthropic Claude
 */

class DimalccoAI {
    constructor() {
        this.apiKey = localStorage.getItem('ANTHROPIC_API_KEY') || '';
        this.proxyUrl = localStorage.getItem('AI_PROXY_URL') || '';
        this.chatHistory = [];
        this.isProcessing = false;
    }

    // Recopila datos de todos los módulos del localStorage
    getBusinessContext() {
        const ts = JSON.parse(localStorage.getItem('dim_tesoreria_v1') || 'null');
        const cx = JSON.parse(localStorage.getItem('dim_cxcxp_v1') || 'null');
        const no = JSON.parse(localStorage.getItem('dim_nomina_v1') || 'null');
        
        // Buscar datos de impuestos (ReteICA, ICA, Retefuente)
        const taxes = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.includes('reteica') || key.includes('industria_comercio') || key.includes('retefuente')) {
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    taxes.push({ module: key, data: data });
                } catch(e) {}
            }
        }

        let context = "CONTEXTO DE NEGOCIO - DIMALCCO SAS:\n\n";

        if (ts) {
            context += "--- TESORERÍA ---\n";
            context += `Saldo Consolidado: ${ts.cuentas.reduce((acc, c) => acc + (c.saldo_inicial || 0), 0)}\n\n`;
        }

        if (cx) {
            context += "--- CARTERA (CxC / CxP) ---\n";
            const totCob = cx.cobrar?.reduce((acc, c) => acc + (c.valor_total - (c.valor_aplicado || 0)), 0);
            const totPag = cx.pagar?.reduce((acc, p) => acc + (p.valor_total - (p.valor_aplicado || 0)), 0);
            context += `Pendiente por Cobrar: $${totCob}\n`;
            context += `Pendiente por Pagar: $${totPag}\n\n`;
        }

        if (taxes.length > 0) {
            context += "--- IMPUESTOS Y RETENCIONES ---\n";
            taxes.forEach(t => {
                const records = t.data.records || (Array.isArray(t.data) ? t.data : []);
                const total = records.reduce((acc, r) => acc + (r.retenido || 0), 0);
                context += `Módulo ${t.module}: ${records.length} registros, Total: $${total}\n`;
            });
            context += "\n";
        }

        context += "CALENDARIO TRIBUTARIO 2026 (REFERENCIA):\n";
        context += "- ReteICA Soacha: Mensual (Vence los 15 de cada mes).\n";
        context += "- ReteICA Bogotá: Bimestral (Vence los 20 del mes siguiente al bimestre).\n";
        context += "- Retefuente: Mensual (Vence entre los 10 y 20 de cada mes según último dígito del NIT).\n";
        context += "- ICA Bogotá: Anual o Bimestral según ingresos.\n\n";

        return context;
    }

    async sendMessage(userText, onUpdate) {
        if (!this.apiKey && !this.proxyUrl) {
            throw new Error("API Key no configurada. Por favor, ve a ajustes.");
        }

        this.isProcessing = true;
        this.chatHistory.push({ role: "user", content: userText });

        const systemPrompt = `Eres el Director Financiero IA de DIMALCCO SAS, una empresa en Colombia.
        Tu tono es profesional, ejecutivo y analítico.
        ${this.getBusinessContext()}
        Responde basándote en estos datos. Si no tienes datos de un módulo, invita al usuario a completarlos.
        Utiliza formato Markdown en tus respuestas.`;

        try {
            // URL a usar: proxy o directa (la directa fallará por CORS en navegadores standard)
            const targetUrl = this.proxyUrl || "https://api.anthropic.com/v1/messages";

            const response = await fetch(targetUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": this.apiKey,
                    "anthropic-version": "2023-06-01",
                    "dangerously-allow-browser": "true" // Solo para propósitos de desarrollo/demo
                },
                body: JSON.stringify({
                    model: "claude-3-5-sonnet-20241022",
                    max_tokens: 1024,
                    system: systemPrompt,
                    messages: this.chatHistory
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || "Error en la comunicación con Claude");
            }

            const data = await response.json();
            const aiText = data.content[0].text;

            this.chatHistory.push({ role: "assistant", content: aiText });
            this.isProcessing = false;
            return aiText;

        } catch (error) {
            this.isProcessing = false;
            console.error("AI Error:", error);
            if (error.message.includes('Failed to fetch')) {
                throw new Error("Error de conexión (CORS). Anthropic no permite llamadas directas desde el navegador. Por favor, configura un Proxy URL en ajustes.");
            }
            throw error;
        }
    }
}

window.DimalccoAI = new DimalccoAI();
