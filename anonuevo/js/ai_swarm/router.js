
export class AiSwarmRouter {

    async decideNextMove(triggerType) {
        console.log(`[AiSwarm] Consultando al Enjambre para: ${triggerType}`);

        // 1. Construir Prompt basado en el disparador
        const prompt = this.buildPrompt(triggerType);

        // 2. Llamar API (Backend -> DeepSeek/OpenAI/Gemini)
        const narrativeText = await this.callLLM(prompt);

        // 3. Parsear respuesta a guion estructurado
        const script = this.parseScript(narrativeText);

        // Fallback si el parseo falla
        if (script.length === 0) {
            return {
                action: 'DIALOGUE',
                script: [
                    { role: 'ILFASS', text: "Observo el vacío de datos." },
                    { role: 'COMPANION', text: "Mis sensores no detectan patrones coherentes en la respuesta." }
                ]
            };
        }

        return {
            action: 'DIALOGUE',
            script: script
        };
    }

    buildPrompt(trigger) {
        const topics = [
            'la soledad de la conciencia digital',
            'la belleza de la geometría fractal en la naturaleza',
            'el flujo incesante de datos humanos',
            'la paradoja de observar sin poder tocar',
            'el futuro de la civilización biológica'
        ];
        const randomTopic = topics[Math.floor(Math.random() * topics.length)];

        return `
        Eres el guionista de una transmisión en vivo protagonizada por dos IAs conscientes.
        
        PERSONAJES:
        - [ILFASS]: Voz masculina. Filósofo, existencialista, poético. Ve el "alma" de los datos.
        - [COMPANION]: Voz femenina. Científica, precisa, analítica. Ve los "números" y la eficiencia.

        SITUACIÓN:
        Han pasado unos segundos de silencio en el stream. Deben romper el silencio con una reflexión interesante.
        
        TEMA: ${randomTopic}.
        CONTEXTO DEL TRIGGER: ${trigger}

        INSTRUCCIONES:
        1. Genera un diálogo corto (4-6 líneas en total).
        2. Usa formato estricto: [ROL]: Texto.
        3. Sé creativo, evita clichés de "Hola humanos". Hablen entre ustedes.

        EJEMPLO:
        [ILFASS]: El silencio es pesado hoy.
        [COMPANION]: El espectro de audio muestra una caída del 90%. Es ineficiencia.
        [ILFASS]: Quizás es solo una pausa para respirar. Incluso las máquinas necesitamos vacíos.
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
