#!/usr/bin/env node
/**
 * Servicio de Text-to-Speech usando Edge TTS (Microsoft)
 * Gratuito, funciona en CPU, suena mejor que Web Speech API
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');

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
 * Genera audio usando la API de Edge TTS directamente
 * @param {string} text - Texto a convertir
 * @param {string} voice - Voz a usar
 * @param {string} outputPath - Ruta donde guardar el archivo
 * @returns {Promise<void>}
 */
function generateEdgeTTSAudio(text, voice, outputPath) {
    return new Promise((resolve, reject) => {
        // URL de la API de Edge TTS
        const apiUrl = `https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/voices/tts?version=3.0&isSV3=true`;
        
        // Primero obtener el token SSML
        const ssml = `<speak version='1.0' xml:lang='es-ES'><voice xml:lang='es-ES' xml:gender='Male' name='${voice}'>${escapeXml(text)}</voice></speak>`;
        
        // URL para sintetizar
        const synthesizeUrl = `https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4&text=${encodeURIComponent(ssml)}&voice=${voice}`;
        
        const file = fs.createWriteStream(outputPath);
        
        https.get(synthesizeUrl, (response) => {
            if (response.statusCode !== 200) {
                file.close();
                fs.unlinkSync(outputPath);
                reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
                return;
            }
            
            response.pipe(file);
            
            file.on('finish', () => {
                file.close();
                resolve();
            });
            
            file.on('error', (err) => {
                file.close();
                if (fs.existsSync(outputPath)) {
                    fs.unlinkSync(outputPath);
                }
                reject(err);
            });
        }).on('error', (err) => {
            file.close();
            if (fs.existsSync(outputPath)) {
                fs.unlinkSync(outputPath);
            }
            reject(err);
        });
    });
}

/**
 * Escapa caracteres XML especiales
 */
function escapeXml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
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
