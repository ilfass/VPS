#!/usr/bin/env node
/**
 * Servicio de Text-to-Speech usando Edge TTS (Microsoft)
 * Gratuito, funciona en CPU, suena mejor que Web Speech API
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Intentar cargar el paquete edge-tts
let EdgeTTS, Constants;
try {
    const edgeTTSModule = require('@andresaya/edge-tts');
    EdgeTTS = edgeTTSModule.EdgeTTS;
    Constants = edgeTTSModule.Constants;
} catch (e) {
    console.error('[EdgeTTS] Paquete @andresaya/edge-tts no encontrado, usando CLI fallback');
    EdgeTTS = null;
    Constants = null;
}

// Configuración
const OUTPUT_DIR = path.join(__dirname, '..', 'assets', 'audio', 'generated');

// Asegurar que el directorio de salida existe
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Voces disponibles en español (Edge TTS)
const SPANISH_VOICES = [
    'es-ES-ElviraNeural',      // Femenina, natural
    'es-ES-AlvaroNeural',      // Masculina, natural
    'es-ES-ArnauNeural',       // Masculina, joven
    'es-ES-DarioNeural',       // Masculina, adulta
    'es-ES-EliasNeural',       // Masculina, madura
    'es-MX-DaliaNeural',       // Femenina, mexicana
    'es-MX-JorgeNeural',       // Masculina, mexicana
    'es-AR-ElenaNeural',       // Femenina, argentina
    'es-AR-TomasNeural',       // Masculina, argentina
];

// Voz por defecto (masculina, española, natural)
const DEFAULT_VOICE = 'es-ES-AlvaroNeural';

/**
 * Genera audio usando Edge TTS (paquete npm o API directa)
 * @param {string} text - Texto a convertir
 * @param {string} voice - Voz a usar
 * @param {string} outputPath - Ruta donde guardar el archivo
 * @returns {Promise<void>}
 */
async function generateEdgeTTSAudio(text, voice, outputPath) {
    if (EdgeTTS) {
        // Usar paquete npm @andresaya/edge-tts
        try {
            const tts = new EdgeTTS();
            await tts.synthesize(text, voice, {
                outputFormat: Constants ? Constants.OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3 : 'audio-24khz-96kbitrate-mono-mp3'
            });
            // Usar toBuffer y escribir manualmente
            const buffer = await tts.toBuffer();
            fs.writeFileSync(outputPath, buffer);
        } catch (error) {
            throw new Error(`Error con paquete edge-tts: ${error.message}`);
        }
    } else {
        // Fallback: usar CLI edge-tts si está disponible
        return new Promise((resolve, reject) => {
            const escapedText = text.replace(/'/g, "'\\''");
            const command = `edge-tts --voice "${voice}" --text "${escapedText}" --write "${outputPath}"`;

            exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
                if (error) {
                    reject(new Error(`CLI error: ${error.message}`));
                    return;
                }
                if (!fs.existsSync(outputPath)) {
                    reject(new Error('Archivo no generado por CLI'));
                    return;
                }
                resolve();
            });
        });
    }
}

/**
 * Genera audio usando Edge TTS
 * @param {string} text - Texto a convertir
 * @param {string} voice - Voz a usar (opcional)
 * @returns {Promise<Object>} - {success, file_path, url, error}
 */
function generateSpeech(text, voice = DEFAULT_VOICE) {
    return new Promise((resolve) => {
        if (!text || text.trim().length === 0) {
            resolve({
                error: 'Texto vacío',
                message: 'El texto no puede estar vacío'
            });
            return;
        }

        // Generar nombre de archivo único basado en hash del texto
        const textHash = crypto.createHash('md5').update(text + voice).digest('hex').substring(0, 8);
        const outputFilename = `edge_tts_${textHash}.mp3`;
        const outputPath = path.join(OUTPUT_DIR, outputFilename);

        // Si el archivo ya existe, retornarlo directamente (cache)
        if (fs.existsSync(outputPath)) {
            const fileSize = fs.statSync(outputPath).size;
            resolve({
                success: true,
                file_path: outputPath,
                url: `/assets/audio/generated/${outputFilename}`,
                file_size: fileSize,
                cached: true
            });
            return;
        }

        console.error(`[EdgeTTS] Generando audio: ${text.substring(0, 50)}...`);

        // Usar la API de Edge TTS directamente (más confiable que CLI)
        generateEdgeTTSAudio(text, voice, outputPath)
            .then(() => {
                if (fs.existsSync(outputPath)) {
                    const fileSize = fs.statSync(outputPath).size;
                    resolve({
                        success: true,
                        file_path: outputPath,
                        url: `/assets/audio/generated/${outputFilename}`,
                        file_size: fileSize,
                        cached: false
                    });
                } else {
                    resolve({
                        error: 'Archivo no generado',
                        message: 'El proceso completó pero no se encontró el archivo'
                    });
                }
            })
            .catch((error) => {
                console.error(`[EdgeTTS] Error: ${error.message}`);
                resolve({
                    error: 'Error generando audio',
                    message: error.message
                });
            });
    });
}

/**
 * Lista voces disponibles
 */
function listVoices() {
    return new Promise((resolve) => {
        exec('edge-tts --list-voices', { maxBuffer: 1024 * 1024 * 5 }, (error, stdout, stderr) => {
            if (error) {
                resolve({
                    error: 'Error listando voces',
                    message: error.message
                });
                return;
            }

            // Parsear salida (formato JSON o texto)
            try {
                const voices = JSON.parse(stdout);
                resolve({
                    success: true,
                    voices: voices,
                    spanish: voices.filter(v => v.Locale && v.Locale.startsWith('es'))
                });
            } catch (e) {
                // Si no es JSON, retornar texto crudo
                resolve({
                    success: true,
                    voices_text: stdout,
                    spanish_voices: SPANISH_VOICES
                });
            }
        });
    });
}

// Modo CLI
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args[0] === '--list-voices' || args[0] === '-l') {
        listVoices().then(result => {
            console.log(JSON.stringify(result, null, 2));
        });
    } else if (args[0] === '--text' || args[0] === '-t') {
        const text = args[1] || '';
        const voice = args[2] || DEFAULT_VOICE;

        if (!text) {
            console.error('Error: Texto requerido');
            console.error('Uso: node edge-tts-service.js --text "tu texto" [voz]');
            process.exit(1);
        }

        generateSpeech(text, voice).then(result => {
            console.log(JSON.stringify(result, null, 2));
        });
    } else {
        // Modo JSON desde stdin
        let inputData = '';
        process.stdin.setEncoding('utf8');

        process.stdin.on('data', (chunk) => {
            inputData += chunk;
        });

        process.stdin.on('end', () => {
            try {
                const data = JSON.parse(inputData);
                const text = data.text || '';
                const voice = data.voice || DEFAULT_VOICE;

                if (!text) {
                    console.log(JSON.stringify({
                        error: 'Texto requerido',
                        message: 'Proporciona "text" en el JSON'
                    }));
                    return;
                }

                generateSpeech(text, voice).then(result => {
                    console.log(JSON.stringify(result));
                });
            } catch (e) {
                console.log(JSON.stringify({
                    error: 'JSON inválido',
                    message: e.message
                }));
            }
        });
    }
}

module.exports = { generateSpeech, listVoices, SPANISH_VOICES, DEFAULT_VOICE };
