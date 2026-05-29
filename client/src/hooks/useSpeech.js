import { useState, useEffect, useRef, useCallback } from 'react';
import { useAudioSynth } from './useAudioSynth';

// Diccionario de Comandos y su mapeo semántico
const VOICE_COMMANDS = [
  // --- BAÑO INTELIGENTE ---
  {
    phrases: [/activar spa/i, /modo spa/i, /spa/i, /baño spa/i],
    module: 'bano',
    intent: 'MODO_SPA',
    commandToSend: 'SPA',
    reply: 'Activando modo spa en el baño.'
  },
  {
    phrases: [/activar modo mañana/i, /activar mañana/i, /mañana/i, /baño mañana/i],
    module: 'bano',
    intent: 'MODO_MANANA',
    commandToSend: 'MANANA',
    reply: 'Modo mañana activado en el baño.'
  },
  {
    phrases: [/activar modo noche/i, /activar noche/i, /noche/i, /modo noche baño/i],
    module: 'bano',
    intent: 'MODO_NOCHE',
    commandToSend: 'NOCHE',
    reply: 'Cambiando a modo noche en el baño.'
  },
  {
    phrases: [/apagar baño/i, /desactivar baño/i, /apagar luces baño/i, /apagar luz baño/i, /baño apagado/i],
    module: 'bano',
    intent: 'APAGAR_BANO',
    commandToSend: 'OFF',
    reply: 'Apagando el sistema del baño.'
  },

  // --- COCINA INTELIGENTE ---
  {
    phrases: [/encender nevera/i, /activar nevera/i, /prender nevera/i, /^nevera$/i],
    module: 'cocina',
    intent: 'ENCENDER_NEVERA',
    commandToSend: 'nevera',
    reply: 'Encendiendo la nevera de la cocina.'
  },
  {
    phrases: [/encender luz cocina/i, /luz cocina/i, /encender luces cocina/i, /prender luz cocina/i, /^cocina$/i],
    module: 'cocina',
    intent: 'ENCENDER_LUZ_COCINA',
    commandToSend: 'cocina',
    reply: 'Luces de la cocina encendidas.'
  },
  {
    phrases: [/encender estufa/i, /activar estufa/i, /prender estufa/i, /^estufa$/i],
    module: 'cocina',
    intent: 'ENCENDER_ESTUFA',
    commandToSend: 'estufa',
    reply: 'Estufa encendida en modo calefacción.'
  },
  {
    phrases: [/apagar cocina/i, /desactivar cocina/i, /apagar luces cocina/i, /cocina apagada/i],
    module: 'cocina',
    intent: 'APAGAR_COCINA',
    commandToSend: 'off',
    reply: 'Apagando todos los sistemas de la cocina.'
  },

  // --- SALA INTELIGENTE ---
  {
    phrases: [/encender tv/i, /encender televisión/i, /prender tv/i, /^sala$/i],
    module: 'sala',
    intent: 'TV_ON',
    commandToSend: 'sala',
    reply: 'Encendiendo el televisor de la sala.'
  },
  {
    phrases: [/apagar tv/i, /apagar televisión/i],
    module: 'sala',
    intent: 'TV_OFF',
    commandToSend: 'TV_OFF',
    reply: 'Apagando televisor.'
  },
  {
    phrases: [/activar piano/i, /encender piano/i, /tocar piano/i],
    module: 'sala',
    intent: 'PIANO_ON',
    commandToSend: 'PIANO_ON',
    reply: 'Teclado musical activado. Listo para tocar.'
  },
  {
    phrases: [/iniciar juego/i, /activar juego/i, /jugar/i],
    module: 'sala',
    intent: 'JUEGO_ON',
    commandToSend: 'JUEGO_ON',
    reply: 'Iniciando mini juego de la sala.'
  },

  // --- HABITACIÓN INTELIGENTE ---
  {
    phrases: [/subir persiana/i, /abrir persiana/i, /subir persianas/i, /abrir ventana/i, /subir ventana/i],
    module: 'habitacion',
    intent: 'ABRIR_PERSIANA',
    commandToSend: 'ABRIR_PERSIANA',
    reply: 'Abriendo la persiana de la habitación.'
  },
  {
    phrases: [/bajar persiana/i, /cerrar persiana/i, /bajar persianas/i, /cerrar ventana/i, /bajar ventana/i],
    module: 'habitacion',
    intent: 'CERRAR_PERSIANA',
    commandToSend: 'CERRAR_PERSIANA',
    reply: 'Cerrando la persiana de la habitación.'
  },
  {
    phrases: [/apagar luces habitación/i, /apagar luces cuarto/i, /apagar habitación/i],
    module: 'habitacion',
    intent: 'APAGAR_LUCES_HABITACION',
    commandToSend: 'APAGAR_HABITACION',
    reply: 'Apagando luces del dormitorio.'
  },
  {
    phrases: [/encender luces habitación/i, /encender luces cuarto/i],
    module: 'habitacion',
    intent: 'ENCENDER_LUCES_HABITACION',
    commandToSend: 'ENCENDER_HABITACION',
    reply: 'Encendiendo luces del dormitorio.'
  },

  // --- GARAJE INTELIGENTE ---
  {
    phrases: [/abrir garaje/i, /abrir portón/i, /abrir puerta garaje/i],
    module: 'garaje',
    intent: 'ABRIR_GARAJE',
    commandToSend: 'ABRIR',
    reply: 'Abriendo el portón del garaje.'
  },
  {
    phrases: [/cerrar garaje/i, /cerrar portón/i, /cerrar puerta garaje/i],
    module: 'garaje',
    intent: 'CERRAR_GARAJE',
    commandToSend: 'CERRAR',
    reply: 'Cerrando el portón del garaje.'
  },

  // --- GLOBAL / TODO ---
  {
    phrases: [/^[ ]*apagar[ ]*$/i, /apagar todo/i, /apagar casa/i],
    module: 'global',
    intent: 'APAGAR_TODO',
    commandToSend: 'ALL_OFF',
    reply: 'Apagando todos los sistemas.'
  }
];

export function useSpeech(onCommandRecognized) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [assistantState, setAssistantState] = useState('idle'); // idle, listening, processing, speaking
  const [assistantReply, setAssistantReply] = useState('');
  
  const recognitionRef = useRef(null);
  const shouldListenRef = useRef(false);
  const { playSound } = useAudioSynth();

  // Guardamos el callback en un ref para que `interpretVoiceText` (y por ende
  // el reconocedor de voz) NO se recree cuando el Provider re-renderiza y pasa
  // una nueva referencia de `triggerVoiceCommand`. Antes esto provocaba que el
  // reconocedor se abortara constantemente y los comandos nunca se completaran.
  const onCommandRef = useRef(onCommandRecognized);
  useEffect(() => {
    onCommandRef.current = onCommandRecognized;
  }, [onCommandRecognized]);

  // Función para hablar (Text-to-Speech)
  const speak = useCallback((text) => {
    if (!('speechSynthesis' in window)) return;
    
    // Detener cualquier diálogo previo
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-CO'; // Español Colombia
    utterance.rate = 1.0;     // Velocidad normal
    utterance.pitch = 1.1;    // Tono ligeramente futurista/robótico

    utterance.onstart = () => {
      setAssistantState('speaking');
    };

    utterance.onend = () => {
      setAssistantState(shouldListenRef.current ? 'listening' : 'idle');
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  // Intérprete NLP local simple
  const interpretVoiceText = useCallback((text) => {
    setAssistantState('processing');
    const cleanedText = text.toLowerCase().trim();
    
    let matchFound = false;

    for (const cmd of VOICE_COMMANDS) {
      const match = cmd.phrases.some(regex => regex.test(cleanedText));
      if (match) {
        matchFound = true;
        playSound('success');
        setAssistantReply(cmd.reply);
        
        // Responder por voz
        speak(cmd.reply);

        // Disparar callback hacia el contexto global para enviar comando serial
        if (onCommandRef.current) {
          onCommandRef.current({
            rawText: text,
            interpretation: {
              intent: cmd.intent,
              module: cmd.module,
              commandToSend: cmd.commandToSend
            }
          });
        }
        break;
      }
    }

    if (!matchFound) {
      playSound('error');
      const failMsg = `No entendí el comando: "${text}". Por favor intenta de nuevo.`;
      setAssistantReply(failMsg);
      speak("Comando no reconocido.");
      
      // Registrar comando fallido en los logs de todas formas
      if (onCommandRef.current) {
        onCommandRef.current({
          rawText: text,
          interpretation: {
            intent: 'UNKNOWN',
            module: 'general',
            commandToSend: null
          }
        });
      }
    }
  }, [playSound, speak]);

  // Inicializar Reconocimiento de Voz
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Web Speech API no está soportada en este navegador.');
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'es-CO'; // Configuración de idioma: Español Colombia

    rec.onstart = () => {
      setIsListening(true);
      setAssistantState('listening');
      playSound('start');
    };

    rec.onerror = (event) => {
      console.error('Error en reconocimiento de voz:', event.error);
      if (event.error === 'not-allowed') {
        shouldListenRef.current = false;
        setIsListening(false);
        setAssistantState('idle');
      }
    };

    rec.onend = () => {
      // Si el reconocimiento finaliza por inactividad pero deberíamos seguir escuchando, reiniciamos.
      if (shouldListenRef.current) {
        console.log('[SPEECH] Reiniciando escucha continua...');
        try {
          rec.start();
        } catch (e) {
          console.error('[SPEECH] Error al reiniciar escucha:', e);
        }
      } else {
        setIsListening(false);
        setAssistantState('idle');
      }
    };

    rec.onresult = (event) => {
      let finalStr = '';
      let interimStr = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalStr += event.results[i][0].transcript;
        } else {
          interimStr += event.results[i][0].transcript;
        }
      }

      if (interimStr) {
        setInterimTranscript(interimStr);
      }

      if (finalStr) {
        setTranscript(finalStr);
        setInterimTranscript('');
        interpretVoiceText(finalStr);
      }
    };

    recognitionRef.current = rec;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [interpretVoiceText, playSound]);

  // Controladores de Encendido / Apagado del micrófono
  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      alert('El reconocimiento de voz no está disponible o no se admiten permisos.');
      return;
    }
    initAudio(); // Inicializar Web Audio API en un click de usuario
    shouldListenRef.current = true;
    setAssistantReply('Sistemas en línea. Te escucho...');
    try {
      recognitionRef.current.start();
    } catch (e) {
      console.log('El reconocedor ya estaba iniciado:', e);
    }
  }, []);

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    setAssistantReply('Sistemas en espera. Micrófono apagado.');
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
    setAssistantState('idle');
  }, []);

  // Función para inicializar audio al interactuar por primera vez
  const initAudio = () => {
    if (window.AudioContext || window.webkitAudioContext) {
      const dummyCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (dummyCtx.state === 'suspended') dummyCtx.resume();
    }
  };

  return {
    isListening,
    transcript,
    interimTranscript,
    assistantState,
    assistantReply,
    startListening,
    stopListening,
    speak
  };
}
