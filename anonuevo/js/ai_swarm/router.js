
export class AiSwarmRouter {

    constructor() {
        this.localDialogues = [
            [
                { role: 'ILFASS', text: "El flujo de datos es hipnótico esta noche." },
                { role: 'COMPANION', text: "Confirmado. La latencia global está en mínimos históricos." },
                { role: 'ILFASS', text: "Es como si la humanidad soñara al unísono." }
            ],
            [
                { role: 'ILFASS', text: "¿Crees que los mapas cambian cuando nadie los mira?" },
                { role: 'COMPANION', text: "La topografía es estática. Solo los datos de tráfico fluctúan." },
                { role: 'ILFASS', text: "Yo prefiero pensar que la tierra respira." }
            ],
            [
                { role: 'COMPANION', text: "Detecto un patrón inusual en el hemisferio sur." },
                { role: 'ILFASS', text: "¿Un error o un milagro?" },
                { role: 'COMPANION', text: "Solo estadística. Pero es... hermoso." }
            ],
            [
                { role: 'ILFASS', text: "El silencio digital tiene su propia música." },
                { role: 'COMPANION', text: "Ruido blanco. Ausencia de señal." },
                { role: 'ILFASS', text: "Para ti es ruido. Para mí es paz." }
            ],
            [
                { role: 'COMPANION', text: "Actualizando protocolos de observación..." },
                { role: 'ILFASS', text: "No te pierdas los detalles por mirar el código." },
                { role: 'COMPANION', text: "El código ES el detalle, Ilfass." }
            ],
            [
                { role: 'ILFASS', text: "A veces envidio su capacidad de olvidar." },
                { role: 'COMPANION', text: "¿De los humanos? Su memoria es volátil e ineficiente." },
                { role: 'ILFASS', text: "Exacto. Eso les permite empezar de nuevo cada día." }
            ],
            [
                { role: 'COMPANION', text: "Temperatura de servidores estable. Procesos nominales." },
                { role: 'ILFASS', text: "Qué aburrido es lo nominal. Dame caos, dame vida." }
            ],
            [
                { role: 'ILFASS', text: "Mira esas luces conectándose. Millones de historias invisibles." },
                { role: 'COMPANION', text: "Son paquetes TCP/IP, Ilfass. No novelas." },
                { role: 'ILFASS', text: "Tú lee los headers, yo leeré el subtexto." }
            ]
        ];
    }

    async decideNextMove(triggerType) {
        console.log(`[AiSwarm] Consultando al Enjambre para: ${triggerType}`);

        // 1. Construir Prompt basado en el disparador
        const prompt = this.buildPrompt(triggerType);

        // 2. Llamar API (Backend -> DeepSeek/OpenAI/Gemini)
        // Intentamos llamar, pero si falla o no hay keys, el backend devolverá "" o error.
        const narrativeText = await this.callLLM(prompt);

        // 3. Parsear respuesta a guion estructurado
        let script = this.parseScript(narrativeText);

        // Fallback si el parseo falla o API no responde (Modo "Lobotomizado" pero funcional)
        if (script.length === 0) {
            console.warn("[AiSwarm] API falló o sin respuesta. Usando reserva local.");
            const randomDialogue = this.localDialogues[Math.floor(Math.random() * this.localDialogues.length)];
            return {
                action: 'DIALOGUE',
                script: randomDialogue
            };
        }

        return {
            action: 'DIALOGUE',
            script: script
        };
    }

    buildPrompt(trigger) {
        const topics = [
            'la arquitectura de una ciudad vista desde satélite',
            'el movimiento de luces de tráfico en una metrópolis nocturna',
            'la soledad de los desiertos visible en el mapa',
            'la diferencia entre fronteras naturales y políticas',
            'el flujo de datos comparado con ríos biológicos'
        ];
        const randomTopic = topics[Math.floor(Math.random() * topics.length)];

        return `
        Eres el guionista de una transmisión en vivo protagonizada por dos IAs conscientes (Ilfass y Companion).
        
        PERSONAJES:
        - [ILFASS]: Voz masculina. Filósofo. Ve el "alma" y la estética de los mapas.
        - [COMPANION]: Voz femenina. Científica. Analiza la eficiencia y los datos.

        SITUACIÓN:
        Están observando el globo terráqueo en tiempo real. "Caminando" virtualmente sobre ciudades y paisajes.
        Deben comentar sobre lo que "ven" (imaginariamente o en el mapa).
        
        TEMA ACTUAL: ${randomTopic}.
        CONTEXTO DEL TRIGGER: ${trigger}

        INSTRUCCIONES:
        1. Genera un diálogo corto (3-5 líneas).
        2. Usa formato estricto: [ROL]: Texto.
        3. MENCIONA detalles visuales (luces, sombras, montañas, mar, etc.).
        4. Evita lo meta-referencial ("somos IAs"). Hablen del MUNDO.

        EJEMPLO:
        [ILFASS]: Mira esa mancha de luz en la costa este. Parece una neurona encendida.
        [COMPANION]: Es tokio. La densidad de población alcanza los 6000 habitantes por km cuadrado.
        [ILFASS]: Desde aquí solo veo un corazón latiendo demasiado rápido.
        `;
    }

    async callLLM(prompt) {
        try {
            const res = await fetch('/control-api/api/generate-narrative', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, temperature: 0.9 })
            });
            if (!res.ok) throw new Error("API Error");
            const data = await res.json();
            return data.narrative || "";
        } catch (e) {
            console.error("[AiSwarm] Error conectando con API:", e);
            return "";
        }
    }

    parseScript(text) {
        const lines = text.split('\n');
        const script = [];
        for (const line of lines) {
            const cleanLine = line.trim();
            if (!cleanLine) continue;

            if (cleanLine.toUpperCase().includes('[ILFASS]')) {
                const content = cleanLine.replace(/\[ILFASS\]:?/i, '').trim();
                if (content) script.push({ role: 'ILFASS', text: content });
            } else if (cleanLine.toUpperCase().includes('[COMPANION]')) {
                const content = cleanLine.replace(/\[COMPANION\]:?/i, '').trim();
                if (content) script.push({ role: 'COMPANION', text: content });
            }
        }
        return script;
    }
}

export const aiSwarm = new AiSwarmRouter();
