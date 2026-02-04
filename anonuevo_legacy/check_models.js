
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function check() {
    if (!process.env.GEMINI_API_KEY) {
        console.error("❌ No GEMINI_API_KEY found in environment");
        return;
    }

    console.log("🔑 Using Key ending in: ..." + process.env.GEMINI_API_KEY.slice(-4));

    // Inicializar SDK
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // Hack para acceder directamente al ModelManager si existe, o intentar listar via fetch
    // El SDK nuevo expone esto via genAI.getGenerativeModel... pero para listar es distinto entres versiones.
    // Usaremos un fetch directo para máxima compatibilidad y ver la verdad cruda.

    try {
        console.log("📡 Querying Google API for available models...");
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            console.error("❌ API Error:", JSON.stringify(data.error, null, 2));
        } else if (data.models) {
            console.log("✅ Available Models:");
            data.models.forEach(m => {
                if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent")) {
                    console.log(`   - ${m.name} (Compatible)`);
                } else {
                    console.log(`   - ${m.name}`);
                }
            });
        } else {
            console.log("⚠️ Unknown response structure:", data);
        }
    } catch (e) {
        console.error("❌ Network/Fetch Error:", e);
    }
}

check();
