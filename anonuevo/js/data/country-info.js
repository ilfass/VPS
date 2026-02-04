// Mapping of ISO 3166-1 numeric codes to Name and Region/Continent
// Regions: AF (Africa), AS (Asia), EU (Europe), NA (North America), SA (South America), OC (Oceania)

export const COUNTRY_INFO = {
    "004": {
        name: "Afganistán",
        region: "AS",
        timezone: "Asia/Kabul",
        facts: [
            "Es un país sin salida al mar, ubicado en el corazón de Asia.",
            "El Buzkashi es su deporte nacional, jugado a caballo.",
            "Produce algunas de las mejores granadas y uvas del mundo."
        ]
    },
    "008": {
        name: "Albania",
        region: "EU",
        timezone: "Europe/Tirane",
        facts: [
            "Es conocido como el 'País de las Águilas'.",
            "Tiene más de 170.000 búnkeres construidos durante la era comunista.",
            "El lago Ohrid es uno de los lagos más antiguos y profundos de Europa."
        ]
    },
    "012": {
        name: "Argelia",
        region: "AF",
        timezone: "Africa/Algiers",
        facts: [
            "Es el país más grande de África por superficie.",
            "El desierto del Sahara cubre más del 80% de su territorio.",
            "Alberga siete sitios del Patrimonio Mundial de la UNESCO."
        ]
    },
    "024": {
        name: "Angola",
        region: "AF",
        timezone: "Africa/Luanda",
        facts: [
            "Sus cataratas de Kalandula son unas de las más grandes de África.",
            "Es uno de los mayores productores de diamantes del continente.",
            "El baile Kizomba se originó aquí."
        ]
    },
    "032": {
        name: "Argentina",
        region: "SA",
        timezone: "America/Argentina/Buenos_Aires",
        immediateTexts: [
            `[ILFASS]: Hemos llegado a Argentina. Siento una energía particular aquí.
[COMPANION]: Mis datos indican que Argentina es un punto clave en esta región.
[ILFASS]: Así es. Profundicemos en su realidad.`,

            `[ILFASS]: Estamos en Argentina. Observo el paisaje y me pregunto qué historias guarda.
[COMPANION]: Argentina tiene una geografía diversa y una población activa.
[ILFASS]: Es un escenario perfecto para nuestra documentación.`,

            `[ILFASS]: Argentina se despliega ante nosotros.
[COMPANION]: Confirmado. Iniciando escaneo de patrones culturales en Argentina.
[ILFASS]: Excelente. Veamos qué nos revela este lugar.`
        ],
        facts: [
            "El Aconcagua es la montaña más alta de los hemisferios sur y occidental.",
            "Es el lugar de nacimiento del tango.",
            "Tiene la avenida más ancha del mundo, la 9 de Julio."
        ],
        recommendations: [
            "te recomendaría probar un asado auténtico en una parrilla de barrio.",
            "no podrías perderte una caminata por los bosques de Palermo.",
            "deberías visitar el glaciar Perito Moreno, es una experiencia única.",
            "te sugeriría tomar un café en el histórico Café Tortoni."
        ],
        media: [
            { type: 'image', url: '/assets/media/ar/obelisco.jpg', caption: 'Obelisco de Buenos Aires al amanecer' },
            { type: 'image', url: '/assets/media/ar/perito.jpg', caption: 'Glaciar Perito Moreno' }
        ]
    },
    "036": {
        name: "Australia",
        region: "OC",
        timezone: "Australia/Sydney",
        facts: [
            "Es el único país que es también un continente.",
            "Tiene más canguros que personas.",
            "La Gran Barrera de Coral es el sistema de arrecifes más grande del mundo."
        ]
    },
    "040": {
        name: "Austria",
        region: "EU",
        timezone: "Europe/Vienna",
        facts: [
            "Hogar de compositores famosos como Mozart, Haydn y Schubert.",
            "Aproximadamente el 62% de su territorio está cubierto por los Alpes.",
            "Viena ha sido nombrada múltiples veces la mejor ciudad para vivir."
        ]
    },
    "031": {
        name: "Azerbaiyán",
        region: "AS",
        timezone: "Asia/Baku",
        facts: [
            "Es conocido como la 'Tierra del Fuego' por sus reservas de gas.",
            "Bakú es la capital más baja del mundo, a 28 metros bajo el nivel del mar.",
            "El té es la bebida nacional y símbolo de hospitalidad."
        ]
    },
    "050": {
        name: "Bangladesh",
        region: "AS",
        timezone: "Asia/Dhaka",
        facts: [
            "Tiene la playa de arena natural ininterrumpida más larga del mundo.",
            "Es uno de los países más densamente poblados del planeta.",
            "El tigre de Bengala es su animal nacional."
        ]
    },
    "112": {
        name: "Bielorrusia",
        region: "EU",
        timezone: "Europe/Minsk",
        facts: [
            "El 40% de su territorio está cubierto por bosques.",
            "Es famoso por sus tractores y maquinaria pesada.",
            "Tiene uno de los últimos bosques primarios de Europa, Belovezhskaya Pushcha."
        ]
    },
    "056": {
        name: "Bélgica",
        region: "EU",
        timezone: "Europe/Brussels",
        facts: [
            "Produce más de 220.000 toneladas de chocolate al año.",
            "Tiene más castillos por kilómetro cuadrado que cualquier otro país.",
            "Bruselas es la sede administrativa de la Unión Europea."
        ]
    },
    "068": {
        name: "Bolivia",
        region: "SA",
        timezone: "America/La_Paz",
        facts: [
            "El Salar de Uyuni es el desierto de sal más grande del mundo.",
            "La Paz es la capital administrativa más alta del mundo.",
            "Tiene 37 idiomas oficiales."
        ]
    },
    "070": {
        name: "Bosnia y Herz.",
        region: "EU",
        timezone: "Europe/Sarajevo",
        facts: [
            "Sarajevo fue sede de los Juegos Olímpicos de Invierno de 1984.",
            "Es apodado el 'País con forma de corazón' por su silueta en el mapa.",
            "Tiene uno de los últimos bosques tropicales de Europa, Perućica."
        ]
    },
    "072": {
        name: "Botsuana",
        region: "AF",
        timezone: "Africa/Gaborone",
        facts: [
            "Alberga la mayor población de elefantes del mundo.",
            "El Delta del Okavango es uno de los deltas interiores más grandes.",
            "Es uno de los mayores productores de diamantes del mundo."
        ]
    },
    "076": {
        name: "Brasil",
        region: "SA",
        timezone: "America/Sao_Paulo",
        facts: [
            "Posee la mayor biodiversidad de flora y fauna del planeta.",
            "Es el mayor productor de café del mundo desde hace 150 años.",
            "El río Amazonas es el más caudaloso del mundo."
        ]
    },
    "100": {
        name: "Bulgaria",
        region: "EU",
        timezone: "Europe/Sofia",
        facts: [
            "Es uno de los productores de aceite de rosa más grandes del mundo.",
            "El alfabeto cirílico se originó aquí.",
            "Plovdiv es una de las ciudades habitadas más antiguas de Europa."
        ]
    },
    "854": {
        name: "Burkina Faso",
        region: "AF",
        timezone: "Africa/Ouagadougou",
        facts: [
            "Su nombre significa 'Tierra de los hombres íntegros'.",
            "Es famoso por su festival de cine FESPACO.",
            "La arquitectura de adobe de Tiébélé es única en el mundo."
        ]
    },
    "108": {
        name: "Burundi",
        region: "AF",
        timezone: "Africa/Bujumbura",
        facts: [
            "El lago Tanganica es el segundo lago de agua dulce más profundo.",
            "Es conocido como el 'Corazón de África' por su forma y ubicación.",
            "Los tambores sagrados son Patrimonio Inmaterial de la Humanidad."
        ]
    },
    "116": {
        name: "Camboya",
        region: "AS",
        timezone: "Asia/Phnom_Penh",
        facts: [
            "Angkor Wat es el monumento religioso más grande del mundo.",
            "Es el único país con un edificio en su bandera.",
            "El lago Tonlé Sap cambia de dirección de flujo dos veces al año."
        ]
    },
    "120": {
        name: "Camerún",
        region: "AF",
        timezone: "Africa/Douala",
        facts: [
            "Es conocido como 'África en miniatura' por su diversidad geológica.",
            "Alberga más de 200 grupos lingüísticos diferentes.",
            "El Monte Camerún es uno de los volcanes más activos de África."
        ]
    },
    "124": {
        name: "Canadá",
        region: "NA",
        timezone: "America/Toronto",
        facts: [
            "Tiene más lagos que el resto de los países del mundo combinados.",
            "Tiene la costa más larga del mundo.",
            "El 10% de los bosques del mundo están aquí."
        ]
    },
    "140": {
        name: "Rep. Centroafricana",
        region: "AF",
        timezone: "Africa/Bangui",
        facts: [
            "Es uno de los mejores lugares para observar gorilas de llanura.",
            "Observar mariposas es una actividad popular en la reserva Dzanga-Sangha.",
            "Es uno de los países con menor contaminación lumínica."
        ]
    },
    "148": {
        name: "Chad",
        region: "AF",
        timezone: "Africa/Ndjamena",
        facts: [
            "El lago Chad ha reducido su tamaño en un 95% desde 1963.",
            "El Sahara cubre el tercio norte del país.",
            "Es hogar del macizo de Tibesti, las montañas más altas del Sahara."
        ]
    },
    "152": {
        name: "Chile",
        region: "SA",
        timezone: "America/Santiago",
        facts: [
            "El desierto de Atacama es el lugar más árido de la Tierra.",
            "Tiene la piscina más grande del mundo en Algarrobo.",
            "Es el país más largo y estrecho del mundo."
        ]
    },
    "156": {
        name: "China",
        region: "AS",
        timezone: "Asia/Shanghai",
        facts: [
            "La Gran Muralla es la estructura militar más larga del mundo.",
            "Es el país más poblado del mundo (o el segundo, compitiendo con India).",
            "El té fue descubierto aquí hace miles de años."
        ]
    },
    "170": {
        name: "Colombia",
        region: "SA",
        timezone: "America/Bogota",
        facts: [
            "Es el segundo país con mayor biodiversidad del mundo.",
            "Produce algunas de las mejores esmeraldas del planeta.",
            "Es el único país de Sudamérica con costas en el Pacífico y el Caribe."
        ]
    },
    "178": {
        name: "Congo",
        region: "AF",
        timezone: "Africa/Brazzaville",
        facts: [
            "El río Congo es el segundo más caudaloso del mundo.",
            "Brazzaville y Kinshasa son las capitales más cercanas entre sí.",
            "Alberga grandes poblaciones de gorilas occidentales de llanura."
        ]
    },
    "180": {
        name: "R.D. del Congo",
        region: "AF",
        timezone: "Africa/Kinshasa",
        facts: [
            "Alberga la segunda selva tropical más grande del mundo.",
            "Es el país francófono más poblado del mundo.",
            "Es rico en minerales raros como el coltán."
        ]
    },
    "188": {
        name: "Costa Rica",
        region: "NA",
        timezone: "America/Costa_Rica",
        facts: [
            "No tiene ejército desde 1948.",
            "Alberga el 5% de la biodiversidad mundial en solo el 0.03% de la superficie terrestre.",
            "Más del 98% de su energía proviene de fuentes renovables."
        ]
    },
    "191": {
        name: "Croacia",
        region: "EU",
        timezone: "Europe/Zagreb",
        facts: [
            "Inventó la corbata, originada en los mercenarios croatas.",
            "Dubrovnik es conocida como la 'Perla del Adriático'.",
            "Tiene más de 1200 islas e islotes."
        ]
    },
    "192": {
        name: "Cuba",
        region: "NA",
        timezone: "America/Havana",
        facts: [
            "Es la isla más grande del Caribe.",
            "Tiene una de las tasas de alfabetización más altas del mundo.",
            "El Valle de Viñales es famoso por sus formaciones rocosas 'mogotes'."
        ]
    },
    "196": {
        name: "Chipre",
        region: "EU",
        timezone: "Asia/Nicosia",
        facts: [
            "Es la tercera isla más grande del Mediterráneo.",
            "Nicosia es la última capital dividida del mundo.",
            "Según la mitología, Afrodita nació en sus costas."
        ]
    },
    "203": {
        name: "Rep. Checa",
        region: "EU",
        timezone: "Europe/Prague",
        facts: [
            "Tiene la mayor densidad de castillos en el mundo.",
            "Praga tiene el reloj astronómico en funcionamiento más antiguo.",
            "Es el país con mayor consumo de cerveza per cápita."
        ]
    },
    "208": {
        name: "Dinamarca",
        region: "EU",
        timezone: "Europe/Copenhagen",
        facts: [
            "Es el país más antiguo del mundo con una bandera en uso continuo.",
            "No hay lugar en el país a más de 52 km del mar.",
            "La bicicleta es el medio de transporte principal en Copenhague."
        ]
    },
    "214": {
        name: "Rep. Dominicana",
        region: "NA",
        timezone: "America/Santo_Domingo",
        facts: [
            "Tiene el punto más alto y el más bajo del Caribe.",
            "Santo Domingo es la ciudad colonial europea más antigua de América.",
            "El larimar es una piedra semipreciosa que solo se encuentra aquí."
        ]
    },
    "218": {
        name: "Ecuador",
        region: "SA",
        timezone: "America/Guayaquil",
        facts: [
            "Las Islas Galápagos inspiraron la teoría de la evolución de Darwin.",
            "Quito es la capital constitucional más alta del mundo.",
            "El punto más alejado del centro de la Tierra es el volcán Chimborazo."
        ]
    },
    "818": {
        name: "Egipto",
        region: "AF",
        timezone: "Africa/Cairo",
        facts: [
            "La Gran Pirámide de Guiza es la única maravilla antigua en pie.",
            "El calendario de 365 días fue inventado aquí.",
            "El río Nilo es tradicionalmente considerado el más largo del mundo."
        ]
    },
    "222": {
        name: "El Salvador",
        region: "NA",
        timezone: "America/El_Salvador",
        facts: [
            "Es conocido como la 'Tierra de los Volcanes'.",
            "Es el país más pequeño de América Central.",
            "Tiene algunas de las mejores olas para surfear en el mundo."
        ]
    },
    "231": {
        name: "Etiopía",
        region: "AF",
        timezone: "Africa/Addis_Ababa",
        facts: [
            "Es el único país africano que nunca fue colonizado.",
            "Tiene su propio calendario con 13 meses.",
            "Es considerado el lugar de origen del café."
        ]
    },
    "233": {
        name: "Estonia",
        region: "EU",
        timezone: "Europe/Tallinn",
        facts: [
            "Fue el primer país en permitir el voto por internet.",
            "Casi el 50% del país está cubierto de bosques.",
            "Skype fue desarrollado por ingenieros estonios."
        ]
    },
    "242": {
        name: "Fiyi",
        region: "OC",
        timezone: "Pacific/Fiji",
        facts: [
            "Está compuesto por más de 330 islas.",
            "El rugby es el deporte nacional y obsesión del país.",
            "Es uno de los primeros lugares en ver el amanecer cada día."
        ]
    },
    "246": {
        name: "Finlandia",
        region: "EU",
        timezone: "Europe/Helsinki",
        facts: [
            "Tiene más saunas que coches.",
            "Es conocido como el 'País de los mil lagos' (tiene 188.000).",
            "Es consistentemente clasificado como el país más feliz del mundo."
        ]
    },
    "250": {
        name: "Francia",
        region: "EU",
        timezone: "Europe/Paris",
        facts: [
            "Es el destino turístico más popular del mundo.",
            "Tiene más zonas horarias que cualquier otro país (por sus territorios de ultramar).",
            "El Museo del Louvre es el museo de arte más grande del mundo."
        ],
        recommendations: [
            "te diría que te pierdas por las calles de Montmartre al atardecer.",
            "tienes que probar un croissant recién horneado en una boulangerie local.",
            "visitaría los castillos del Valle del Loira si tuviera tiempo.",
            "un paseo por el Sena de noche es algo mágico."
        ]
    },
    "266": {
        name: "Gabón",
        region: "AF",
        timezone: "Africa/Libreville",
        facts: [
            "El 85% del país está cubierto por selva tropical.",
            "Alberga la mayor población de elefantes de bosque.",
            "El Parque Nacional de Loango es famoso por sus hipopótamos surfistas."
        ]
    },
    "270": {
        name: "Gambia",
        region: "AF",
        timezone: "Africa/Banjul",
        facts: [
            "Es el país más pequeño de África continental.",
            "Su forma sigue el curso del río Gambia.",
            "Es un paraíso para los observadores de aves con más de 500 especies."
        ]
    },
    "268": {
        name: "Georgia",
        region: "AS",
        timezone: "Asia/Tbilisi",
        facts: [
            "Es considerada la cuna del vino, con 8000 años de historia.",
            "Tiene uno de los alfabetos más antiguos y únicos del mundo.",
            "Alberga la aldea habitada más alta de Europa, Ushguli."
        ]
    },
    "276": {
        name: "Alemania",
        region: "EU",
        timezone: "Europe/Berlin",
        facts: [
            "Tiene más de 20.000 castillos.",
            "El primer libro impreso fue en alemán.",
            "Hay más de 1.500 tipos de salchichas alemanas."
        ]
    },
    "288": {
        name: "Ghana",
        region: "AF",
        timezone: "Africa/Accra",
        facts: [
            "El lago Volta es el embalse artificial más grande del mundo.",
            "Fue el primer país de África subsahariana en obtener la independencia.",
            "Es el segundo mayor productor de cacao del mundo."
        ]
    },
    "300": {
        name: "Grecia",
        region: "EU",
        timezone: "Europe/Athens",
        facts: [
            "Tiene miles de islas, de las cuales solo unas 200 están habitadas.",
            "Es la cuna de la democracia, la filosofía occidental y los Juegos Olímpicos.",
            "El sol brilla más de 250 días al año."
        ]
    },
    "304": {
        name: "Groenlandia",
        region: "NA",
        timezone: "America/Nuuk",
        facts: [
            "Es la isla más grande del mundo que no es un continente.",
            "Tiene la población más dispersa del mundo.",
            "No hay carreteras que conecten las ciudades entre sí."
        ]
    },
    "320": {
        name: "Guatemala",
        region: "NA",
        timezone: "America/Guatemala",
        facts: [
            "Es el corazón del mundo maya.",
            "Tikal es una de las ciudades mayas más grandes y mejor conservadas.",
            "El lago de Atitlán es considerado uno de los más bellos del mundo."
        ]
    },
    "324": {
        name: "Guinea",
        region: "AF",
        timezone: "Africa/Conakry",
        facts: [
            "Posee las mayores reservas de bauxita del mundo.",
            "Es la fuente de los ríos Níger, Senegal y Gambia.",
            "El Monte Nimba es Patrimonio de la Humanidad en Peligro."
        ]
    },
    "328": {
        name: "Guyana",
        region: "SA",
        timezone: "America/Guyana",
        facts: [
            "Es el único país de Sudamérica donde el inglés es oficial.",
            "Las cataratas Kaieteur son 5 veces más altas que las del Niágara.",
            "El 80% del país está cubierto por selva virgen."
        ]
    },
    "332": {
        name: "Haití",
        region: "NA",
        timezone: "America/Port-au-Prince",
        facts: [
            "Fue la primera república negra independiente del mundo.",
            "La Citadelle Laferrière es la fortaleza más grande de América.",
            "Comparte la isla La Española con la República Dominicana."
        ]
    },
    "340": {
        name: "Honduras",
        region: "NA",
        timezone: "America/Tegucigalpa",
        facts: [
            "Fue donde Cristóbal Colón pisó tierra firme americana por primera vez.",
            "Alberga las ruinas mayas de Copán, famosas por sus estelas.",
            "La Lluvia de Peces es un fenómeno anual en Yoro."
        ]
    },
    "348": {
        name: "Hungría",
        region: "EU",
        timezone: "Europe/Budapest",
        facts: [
            "Tiene una de las mayores reservas de aguas termales del mundo.",
            "El cubo de Rubik fue inventado por el húngaro Ernő Rubik.",
            "El lago Balatón es el lago más grande de Europa Central."
        ]
    },
    "352": {
        name: "Islandia",
        region: "EU",
        timezone: "Atlantic/Reykjavik",
        facts: [
            "No tiene mosquitos.",
            "Utiliza casi 100% energía renovable.",
            "Tiene más escritores per cápita que cualquier otro país."
        ]
    },
    "356": {
        name: "India",
        region: "AS",
        timezone: "Asia/Kolkata",
        facts: [
            "El ajedrez se inventó aquí.",
            "Es la democracia más grande del mundo.",
            "El sistema numérico y el concepto de cero se originaron aquí."
        ]
    },
    "360": {
        name: "Indonesia",
        region: "AS",
        timezone: "Asia/Jakarta",
        facts: [
            "Es el archipiélago más grande del mundo.",
            "Tiene más volcanes activos que cualquier otro país.",
            "El dragón de Komodo es nativo de aquí."
        ]
    },
    "364": {
        name: "Irán",
        region: "AS",
        timezone: "Asia/Tehran",
        facts: [
            "Es uno de los fabricantes de alfombras más antiguos del mundo.",
            "El gato persa es originario de esta región.",
            "Tiene 24 sitios del Patrimonio Mundial de la UNESCO."
        ]
    },
    "368": {
        name: "Irak",
        region: "AS",
        timezone: "Asia/Baghdad",
        facts: [
            "Es el hogar de la antigua Mesopotamia, cuna de la civilización.",
            "La escritura cuneiforme se inventó aquí.",
            "Bagdad fue una vez el centro intelectual del mundo islámico."
        ]
    },
    "372": {
        name: "Irlanda",
        region: "EU",
        timezone: "Europe/Dublin",
        facts: [
            "El Halloween tiene sus orígenes en el festival celta de Samhain.",
            "El arpa es el símbolo nacional, único país con un instrumento musical.",
            "San Patricio no era irlandés, era romano-británico."
        ]
    },
    "376": {
        name: "Israel",
        region: "AS",
        timezone: "Asia/Jerusalem",
        facts: [
            "Tiene la mayor densidad de startups tecnológicas per cápita.",
            "El Mar Muerto es el punto más bajo de la Tierra.",
            "Jerusalén es sagrada para tres religiones principales."
        ]
    },
    "380": {
        name: "Italia",
        region: "EU",
        timezone: "Europe/Rome",
        facts: [
            "Tiene más sitios del Patrimonio Mundial de la UNESCO que cualquier otro país.",
            "La pizza se inventó en Nápoles.",
            "El Vaticano es el estado soberano más pequeño del mundo, dentro de Roma."
        ]
    },
    "384": {
        name: "Costa de Marfil",
        region: "AF",
        timezone: "Africa/Abidjan",
        facts: [
            "Es el mayor productor de cacao del mundo.",
            "La Basílica de Nuestra Señora de la Paz es la iglesia más grande del mundo.",
            "Su nombre oficial siempre es en francés: Côte d'Ivoire."
        ]
    },
    "388": {
        name: "Jamaica",
        region: "NA",
        timezone: "America/Jamaica",
        facts: [
            "Es la cuna de la música reggae.",
            "Tiene la mayor cantidad de iglesias por kilómetro cuadrado.",
            "Blue Mountain Coffee es uno de los cafés más caros y buscados."
        ]
    },
    "392": {
        name: "Japón",
        region: "AS",
        timezone: "Asia/Tokyo",
        facts: [
            "Tiene la mayor esperanza de vida del mundo.",
            "Tokio es el área metropolitana más poblada del mundo.",
            "Tiene más de 6.800 islas."
        ],
        recommendations: [
            "te recomendaría visitar un onsen tradicional en las montañas.",
            "no puedes irte sin probar el sushi en el mercado de Tsukiji.",
            "caminar por el cruce de Shibuya es una experiencia electrizante.",
            "visitaría los templos de Kioto en otoño para ver los colores."
        ]
    },
    "400": {
        name: "Jordania",
        region: "AS",
        timezone: "Asia/Amman",
        facts: [
            "Petra es una de las Nuevas Siete Maravillas del Mundo.",
            "El Mar Muerto te permite flotar sin esfuerzo.",
            "Wadi Rum ha sido escenario de muchas películas de Marte."
        ]
    },
    "398": {
        name: "Kazajistán",
        region: "AS",
        timezone: "Asia/Almaty",
        facts: [
            "Es el país sin salida al mar más grande del mundo.",
            "Es el lugar de origen de las manzanas.",
            "El cosmódromo de Baikonur es la base de lanzamiento espacial más antigua."
        ]
    },
    "404": {
        name: "Kenia",
        region: "AF",
        timezone: "Africa/Nairobi",
        facts: [
            "Es famoso por sus safaris y la Gran Migración.",
            "El Valle del Rift atraviesa el país de norte a sur.",
            "Produce algunos de los mejores corredores de larga distancia del mundo."
        ]
    },
    "408": {
        name: "Corea del Norte",
        region: "AS",
        timezone: "Asia/Pyongyang",
        facts: [
            "Tiene el estadio más grande del mundo.",
            "Tiene su propia zona horaria, llamada 'Hora de Pyongyang'.",
            "El metro de Pyongyang es uno de los más profundos del mundo."
        ]
    },
    "410": {
        name: "Corea del Sur",
        region: "AS",
        timezone: "Asia/Seoul",
        facts: [
            "Tiene la velocidad de internet más rápida del mundo.",
            "El kimchi es el plato nacional y hay cientos de variedades.",
            "Es el líder mundial en cirugía plástica per cápita."
        ]
    },
    "414": {
        name: "Kuwait",
        region: "AS",
        timezone: "Asia/Kuwait",
        facts: [
            "El dinar kuwaití es la moneda de mayor valor del mundo.",
            "No tiene reservas naturales de agua dulce.",
            "Las Torres de Kuwait son el símbolo más famoso del país."
        ]
    },
    "417": {
        name: "Kirguistán",
        region: "AS",
        timezone: "Asia/Bishkek",
        facts: [
            "El 94% de su territorio es montañoso.",
            "El poema épico de Manas es uno de los más largos del mundo.",
            "El lago Issyk-Kul es el segundo lago alpino más grande."
        ]
    },
    "418": {
        name: "Laos",
        region: "AS",
        timezone: "Asia/Vientiane",
        facts: [
            "Es el único país sin salida al mar en el sudeste asiático.",
            "Es conocido como la 'Tierra del Millón de Elefantes'.",
            "El café de Laos es considerado uno de los mejores del mundo."
        ]
    },
    "428": {
        name: "Letonia",
        region: "EU",
        timezone: "Europe/Riga",
        facts: [
            "Tiene una de las velocidades de internet más rápidas de Europa.",
            "Más del 50% del país está cubierto de bosques.",
            "Riga tiene la mayor concentración de arquitectura Art Nouveau."
        ]
    },
    "422": {
        name: "Líbano",
        region: "AS",
        timezone: "Asia/Beirut",
        facts: [
            "Biblos es una de las ciudades habitadas continuamente más antiguas.",
            "El cedro es el símbolo nacional y aparece en la bandera.",
            "Tiene 18 sectas religiosas reconocidas oficialmente."
        ]
    },
    "426": {
        name: "Lesoto",
        region: "AF",
        timezone: "Africa/Maseru",
        facts: [
            "Es el único país del mundo que está completamente por encima de los 1000m.",
            "Es un enclave, completamente rodeado por Sudáfrica.",
            "Es uno de los pocos lugares en África donde nieva regularmente."
        ]
    },
    "430": {
        name: "Liberia",
        region: "AF",
        timezone: "Africa/Monrovia",
        facts: [
            "Fue la primera república de África.",
            "Fue fundada por esclavos liberados de Estados Unidos.",
            "Su bandera es muy similar a la de Estados Unidos."
        ]
    },
    "434": {
        name: "Libia",
        region: "AF",
        timezone: "Africa/Tripoli",
        facts: [
            "El desierto del Sahara cubre más del 90% del país.",
            "Leptis Magna es una de las ciudades romanas mejor conservadas.",
            "Tuvo la temperatura más alta registrada en la Tierra durante décadas."
        ]
    },
    "440": {
        name: "Lituania",
        region: "EU",
        timezone: "Europe/Vilnius",
        facts: [
            "El lituano es una de las lenguas vivas más antiguas de Europa.",
            "Fue la última nación de Europa en convertirse al cristianismo.",
            "El baloncesto es el deporte nacional y religión no oficial."
        ]
    },
    "442": {
        name: "Luxemburgo",
        region: "EU",
        timezone: "Europe/Luxembourg",
        facts: [
            "Es el único Gran Ducado del mundo.",
            "Es uno de los países más ricos del mundo per cápita.",
            "El transporte público es gratuito en todo el país."
        ]
    },
    "450": {
        name: "Madagascar",
        region: "AF",
        timezone: "Indian/Antananarivo",
        facts: [
            "El 90% de su vida silvestre no se encuentra en ningún otro lugar.",
            "Es la cuarta isla más grande del mundo.",
            "Los lémures son endémicos de la isla."
        ]
    },
    "454": {
        name: "Malaui",
        region: "AF",
        timezone: "Africa/Blantyre",
        facts: [
            "El lago Malaui contiene más especies de peces que cualquier otro lago.",
            "Es conocido como el 'Corazón Cálido de África'.",
            "El té es uno de sus principales productos de exportación."
        ]
    },
    "458": {
        name: "Malasia",
        region: "AS",
        timezone: "Asia/Kuala_Lumpur",
        facts: [
            "Las Torres Petronas fueron los edificios más altos del mundo.",
            "Tiene la rotonda más grande del mundo.",
            "Alberga la flor más grande del mundo, la Rafflesia."
        ]
    },
    "466": {
        name: "Malí",
        region: "AF",
        timezone: "Africa/Bamako",
        facts: [
            "La Gran Mezquita de Djenné es el edificio de adobe más grande del mundo.",
            "Tombuctú fue un centro mundial de aprendizaje islámico.",
            "El músico Salif Keita es conocido como la 'Voz de Oro de África'."
        ]
    },
    "478": {
        name: "Mauritania",
        region: "AF",
        timezone: "Africa/Nouakchott",
        facts: [
            "Tiene uno de los trenes más largos del mundo.",
            "La Estructura de Richat es visible desde el espacio.",
            "Fue el último país en abolir la esclavitud (en 1981)."
        ]
    },
    "484": {
        name: "México",
        region: "NA",
        timezone: "America/Mexico_City",
        facts: [
            "Introdujo el chocolate, el maíz y el chile al mundo.",
            "La Ciudad de México se hunde unos centímetros cada año.",
            "La pirámide de Cholula es la más grande del mundo por volumen."
        ]
    },
    "496": {
        name: "Mongolia",
        region: "AS",
        timezone: "Asia/Ulaanbaatar",
        facts: [
            "Es el país con menor densidad de población del mundo.",
            "Ulán Bator es la capital más fría del mundo.",
            "El Imperio Mongol fue el imperio contiguo más grande de la historia."
        ]
    },
    "499": {
        name: "Montenegro",
        region: "EU",
        timezone: "Europe/Podgorica",
        facts: [
            "Tiene el cañón más profundo de Europa.",
            "El lago Skadar es el lago más grande de los Balcanes.",
            "Kotor es un fiordo impresionante en el Mediterráneo."
        ]
    },
    "504": {
        name: "Marruecos",
        region: "AF",
        timezone: "Africa/Casablanca",
        facts: [
            "Alberga la universidad más antigua del mundo en funcionamiento.",
            "Chefchaouen es famosa por sus edificios pintados de azul.",
            "Es el mayor exportador de sardinas del mundo."
        ]
    },
    "508": {
        name: "Mozambique",
        region: "AF",
        timezone: "Africa/Maputo",
        facts: [
            "Es el único país con un arma moderna en su bandera.",
            "Tiene algunas de las mejores reservas marinas de África.",
            "La isla de Mozambique es Patrimonio de la Humanidad."
        ]
    },
    "104": {
        name: "Myanmar",
        region: "AS",
        timezone: "Asia/Yangon",
        facts: [
            "Es conocida como la 'Tierra de las Pagodas de Oro'.",
            "Los hombres usan faldas tradicionales llamadas longyi.",
            "Bagan tiene más de 2.000 templos y pagodas antiguas."
        ]
    },
    "516": {
        name: "Namibia",
        region: "AF",
        timezone: "Africa/Windhoek",
        facts: [
            "Tiene el desierto más antiguo del mundo.",
            "Sossusvlei tiene algunas de las dunas de arena más altas.",
            "El Cañón del Río Fish es el segundo más grande del mundo."
        ]
    },
    "524": {
        name: "Nepal",
        region: "AS",
        timezone: "Asia/Kathmandu",
        facts: [
            "Tiene la bandera no rectangular del mundo.",
            "Ocho de las diez montañas más altas del mundo están aquí.",
            "Es el lugar de nacimiento de Buda."
        ]
    },
    "528": {
        name: "Países Bajos",
        region: "EU",
        timezone: "Europe/Amsterdam",
        facts: [
            "Un tercio del país está bajo el nivel del mar.",
            "Hay más bicicletas que personas.",
            "Son los mayores exportadores de flores del mundo."
        ]
    },
    "554": {
        name: "Nueva Zelanda",
        region: "OC",
        timezone: "Pacific/Auckland",
        facts: [
            "Fue el primer país en dar el voto a las mujeres.",
            "El Señor de los Anillos fue filmado enteramente aquí.",
            "Tiene un lugar con el nombre más largo: Taumatawhakatangihangakoauauotamateaturipukakapikimaungahoronukupokaiwhenuakitanatahu."
        ]
    },
    "558": {
        name: "Nicaragua",
        region: "NA",
        timezone: "America/Managua",
        facts: [
            "El lago de Nicaragua tiene tiburones de agua dulce.",
            "Es el país más grande de América Central.",
            "Granada es la ciudad colonial más antigua de Nicaragua."
        ]
    },
    "562": {
        name: "Níger",
        region: "AF",
        timezone: "Africa/Niamey",
        facts: [
            "Es uno de los países más calurosos del mundo.",
            "El río Níger es la principal fuente de agua.",
            "Las jirafas de África Occidental se encuentran aquí."
        ]
    },
    "566": {
        name: "Nigeria",
        region: "AF",
        timezone: "Africa/Lagos",
        facts: [
            "Es el país más poblado de África.",
            "Nollywood es la segunda industria cinematográfica más grande.",
            "Tiene la mayor diversidad de mariposas del mundo."
        ]
    },
    "578": {
        name: "Noruega",
        region: "EU",
        timezone: "Europe/Oslo",
        facts: [
            "El túnel de Lærdal es el túnel de carretera más largo del mundo.",
            "Introdujo el sushi de salmón a Japón.",
            "Es uno de los mejores lugares para ver la aurora boreal."
        ]
    },
    "512": {
        name: "Omán",
        region: "AS",
        timezone: "Asia/Muscat",
        facts: [
            "Es el estado independiente más antiguo del mundo árabe.",
            "Es famoso por sus inciensos de alta calidad.",
            "No hay impuesto sobre la renta personal."
        ]
    },
    "586": {
        name: "Pakistán",
        region: "AS",
        timezone: "Asia/Karachi",
        facts: [
            "Tiene la segunda montaña más alta del mundo, el K2.",
            "Produce más de la mitad de los balones de fútbol del mundo.",
            "La carretera del Karakórum es la carretera pavimentada más alta."
        ]
    },
    "591": {
        name: "Panamá",
        region: "NA",
        timezone: "America/Panama",
        facts: [
            "Es el único lugar donde se puede ver amanecer en el Atlántico y atardecer en el Pacífico.",
            "El Canal de Panamá conecta dos océanos.",
            "El sombrero Panamá en realidad se originó en Ecuador."
        ]
    },
    "598": {
        name: "Papúa N. Guinea",
        region: "OC",
        timezone: "Pacific/Port_Moresby",
        facts: [
            "Se hablan más de 800 idiomas indígenas.",
            "Es uno de los países menos explorados cultural y geográficamente.",
            "Es hogar de las aves del paraíso."
        ]
    },
    "600": {
        name: "Paraguay",
        region: "SA",
        timezone: "America/Asuncion",
        facts: [
            "Es el mayor exportador de energía hidroeléctrica del mundo.",
            "El guaraní es idioma oficial junto con el español.",
            "Su bandera tiene dos escudos diferentes en cada lado."
        ]
    },
    "604": {
        name: "Perú",
        region: "SA",
        timezone: "America/Lima",
        facts: [
            "La papa es originaria de aquí, con más de 3000 variedades.",
            "Machu Picchu es una de las Nuevas Siete Maravillas.",
            "El Cañón del Colca es dos veces más profundo que el Gran Cañón."
        ]
    },
    "608": {
        name: "Filipinas",
        region: "AS",
        timezone: "Asia/Manila",
        facts: [
            "Es el segundo archipiélago más grande del mundo.",
            "Tiene tres de los diez centros comerciales más grandes del mundo.",
            "El jeepney es el medio de transporte más popular."
        ]
    },
    "616": {
        name: "Polonia",
        region: "EU",
        timezone: "Europe/Warsaw",
        facts: [
            "Tiene el castillo de ladrillo más grande del mundo (Malbork).",
            "Marie Curie nació en Varsovia.",
            "El bosque de Białowieża es el hogar del bisonte europeo."
        ]
    },
    "620": {
        name: "Portugal",
        region: "EU",
        timezone: "Europe/Lisbon",
        facts: [
            "Es el mayor productor de corcho del mundo.",
            "Tiene la librería más antigua del mundo en funcionamiento.",
            "El fado es su música tradicional melancólica."
        ]
    },
    "630": {
        name: "Puerto Rico",
        region: "NA",
        timezone: "America/Puerto_Rico",
        facts: [
            "Tiene el radiotelescopio de plato único más grande de América.",
            "El coquí es una rana pequeña símbolo de la isla.",
            "Tiene una de las bahías bioluminiscentes más brillantes del mundo."
        ]
    },
    "634": {
        name: "Qatar",
        region: "AS",
        timezone: "Asia/Qatar",
        facts: [
            "Es uno de los países más ricos del mundo per cápita.",
            "Hamad International Airport es uno de los mejores del mundo.",
            "El desierto se encuentra con el mar en Khor Al Adaid."
        ]
    },
    "642": {
        name: "Rumania",
        region: "EU",
        timezone: "Europe/Bucharest",
        facts: [
            "El Palacio del Parlamento es el edificio administrativo más pesado del mundo.",
            "Es el hogar de la leyenda de Drácula.",
            "Tiene una de las carreteras más bellas, la Transfăgărășan."
        ]
    },
    "643": {
        name: "Rusia",
        region: "EU",
        timezone: "Europe/Moscow",
        facts: [
            "Cubre 11 zonas horarias.",
            "El lago Baikal contiene el 20% del agua dulce no congelada del mundo.",
            "El metro de Moscú es famoso por su arquitectura palaciega."
        ]
    },
    "646": {
        name: "Ruanda",
        region: "AF",
        timezone: "Africa/Kigali",
        facts: [
            "Es conocido como la 'Tierra de las Mil Colinas'.",
            "Tiene el mayor porcentaje de mujeres en el parlamento.",
            "Es uno de los países más limpios de África."
        ]
    },
    "682": {
        name: "Arabia Saudita",
        region: "AS",
        timezone: "Asia/Riyadh",
        facts: [
            "Es el país más grande del mundo sin ríos permanentes.",
            "La Meca y Medina son las ciudades más sagradas del Islam.",
            "Está construyendo una ciudad lineal llamada The Line."
        ]
    },
    "686": {
        name: "Senegal",
        region: "AF",
        timezone: "Africa/Dakar",
        facts: [
            "El Lago Rosa obtiene su color de una bacteria amante de la sal.",
            "Dakar es el punto más occidental de África continental.",
            "La isla de Gorea es un sitio histórico importante."
        ]
    },
    "688": {
        name: "Serbia",
        region: "EU",
        timezone: "Europe/Belgrade",
        facts: [
            "Es uno de los mayores exportadores de frambuesas del mundo.",
            "Nikola Tesla era de origen serbio.",
            "Belgrado es una de las ciudades más antiguas de Europa."
        ]
    },
    "694": {
        name: "Sierra Leona",
        region: "AF",
        timezone: "Africa/Freetown",
        facts: [
            "Es famosa por sus diamantes y su puerto natural.",
            "Freetown fue fundada por esclavos liberados.",
            "Tiene playas tropicales impresionantes."
        ]
    },
    "702": {
        name: "Singapur",
        region: "AS",
        timezone: "Asia/Singapore",
        facts: [
            "Es una de las tres únicas ciudades-estado del mundo.",
            "Tiene una cascada interior en su aeropuerto.",
            "Masticar chicle está prohibido (salvo receta médica)."
        ]
    },
    "703": {
        name: "Eslovaquia",
        region: "EU",
        timezone: "Europe/Bratislava",
        facts: [
            "Tiene la mayor cantidad de castillos y palacios per cápita.",
            "Bratislava es la única capital que limita con dos países.",
            "Tiene más de 6.000 cuevas."
        ]
    },
    "705": {
        name: "Eslovenia",
        region: "EU",
        timezone: "Europe/Ljubljana",
        facts: [
            "Más de la mitad del país está cubierto de bosques.",
            "Tiene un oso en su escudo de armas.",
            "El lago Bled tiene una iglesia en una isla en el centro."
        ]
    },
    "090": {
        name: "Islas Salomón",
        region: "OC",
        timezone: "Pacific/Guadalcanal",
        facts: [
            "Tiene una de las lagunas más grandes del mundo.",
            "Fue escenario de importantes batallas en la Segunda Guerra Mundial.",
            "El buceo es una de las principales atracciones."
        ]
    },
    "706": {
        name: "Somalia",
        region: "AF",
        timezone: "Africa/Mogadishu",
        facts: [
            "Tiene la costa más larga de África continental.",
            "Es conocida como la 'Nación de los Poetas'.",
            "Las pinturas rupestres de Laas Geel tienen 5.000 años."
        ]
    },
    "710": {
        name: "Sudáfrica",
        region: "AF",
        timezone: "Africa/Johannesburg",
        facts: [
            "Tiene tres capitales: Pretoria, Ciudad del Cabo y Bloemfontein.",
            "Es el único país que ha albergado mundiales de fútbol, rugby y cricket.",
            "Table Mountain es una de las montañas más antiguas."
        ]
    },
    "728": {
        name: "Sudán del Sur",
        region: "AF",
        timezone: "Africa/Juba",
        facts: [
            "Es el país más joven del mundo, independizado en 2011.",
            "El Nilo Blanco atraviesa el país.",
            "Tiene una de las mayores migraciones de vida silvestre."
        ]
    },
    "724": {
        name: "España",
        region: "EU",
        timezone: "Europe/Madrid",
        facts: [
            "Es el mayor productor de aceite de oliva del mundo.",
            "Tiene el restaurante más antiguo del mundo, Sobrino de Botín.",
            "Es el país con más bares por habitante de la UE."
        ]
    },
    "144": {
        name: "Sri Lanka",
        region: "AS",
        timezone: "Asia/Colombo",
        facts: [
            "Es conocida como la 'Lágrima de la India'.",
            "Es el primer productor mundial de canela.",
            "El té de Ceilán es famoso mundialmente."
        ]
    },
    "729": {
        name: "Sudán",
        region: "AF",
        timezone: "Africa/Khartoum",
        facts: [
            "Tiene más pirámides que Egipto.",
            "Jartum es donde se unen el Nilo Azul y el Nilo Blanco.",
            "Fue el hogar de los faraones negros."
        ]
    },
    "740": {
        name: "Surinam",
        region: "SA",
        timezone: "America/Paramaribo",
        facts: [
            "Es el país más boscoso del mundo (por porcentaje).",
            "Es el único país de América donde el holandés es oficial.",
            "Tiene una gran diversidad étnica y religiosa."
        ]
    },
    "748": {
        name: "Esuatini",
        region: "AF",
        timezone: "Africa/Mbabane",
        facts: [
            "Es una de las últimas monarquías absolutas de África.",
            "Es famoso por la danza de las cañas (Umhlanga).",
            "Tiene la mina de hierro más antigua del mundo."
        ]
    },
    "752": {
        name: "Suecia",
        region: "EU",
        timezone: "Europe/Stockholm",
        facts: [
            "Importa basura de otros países para generar energía.",
            "El grupo ABBA es uno de sus mayores exportadores musicales.",
            "El premio Nobel se entrega aquí (excepto el de la Paz)."
        ]
    },
    "756": {
        name: "Suiza",
        region: "EU",
        timezone: "Europe/Zurich",
        facts: [
            "Tiene refugios nucleares capaces de albergar a toda su población.",
            "Tiene cuatro idiomas oficiales.",
            "El chocolate y los relojes son sus productos más famosos."
        ]
    },
    "760": {
        name: "Siria",
        region: "AS",
        timezone: "Asia/Damascus",
        facts: [
            "Damasco es la capital habitada más antigua del mundo.",
            "El alfabeto ugarítico se descubrió aquí.",
            "Alepo fue una de las ciudades más grandes de la Ruta de la Seda."
        ]
    },
    "158": {
        name: "Taiwán",
        region: "AS",
        timezone: "Asia/Taipei",
        facts: [
            "El Taipei 101 fue el edificio más alto del mundo hasta 2010.",
            "Es el mayor fabricante de chips semiconductores.",
            "Los mercados nocturnos son una parte esencial de su cultura."
        ]
    },
    "762": {
        name: "Tayikistán",
        region: "AS",
        timezone: "Asia/Dushanbe",
        facts: [
            "Más del 90% del país es montañoso.",
            "Tiene la segunda presa más alta del mundo, Nurek.",
            "La carretera del Pamir es una de las más altas del mundo."
        ]
    },
    "834": {
        name: "Tanzania",
        region: "AF",
        timezone: "Africa/Dar_es_Salaam",
        facts: [
            "El Monte Kilimanjaro es la montaña independiente más alta del mundo.",
            "El cráter de Ngorongoro es la caldera volcánica intacta más grande.",
            "Zanzíbar es famosa por sus especias."
        ]
    },
    "764": {
        name: "Tailandia",
        region: "AS",
        timezone: "Asia/Bangkok",
        facts: [
            "Es el único país del sudeste asiático que nunca fue colonizado por europeos.",
            "Bangkok es la ciudad más visitada del mundo.",
            "El nombre real de Bangkok es el nombre de lugar más largo del mundo."
        ]
    },
    "768": {
        name: "Togo",
        region: "AF",
        timezone: "Africa/Lome",
        facts: [
            "Su capital, Lomé, es conocida como la 'París de África Occidental'.",
            "El mercado de fetiches de Akodessewa es el más grande del mundo.",
            "Es uno de los países más estrechos del mundo."
        ]
    },
    "780": {
        name: "Trinidad y Tobago",
        region: "NA",
        timezone: "America/Port_of_Spain",
        facts: [
            "Es el lugar de origen del tambor metálico (steelpan).",
            "El calipso y la soca son géneros musicales originarios de aquí.",
            "Tiene el lago de asfalto natural más grande del mundo."
        ]
    },
    "788": {
        name: "Túnez",
        region: "AF",
        timezone: "Africa/Tunis",
        facts: [
            "Alberga las ruinas de la antigua Cartago.",
            "El anfiteatro de El Djem es uno de los mejor conservados.",
            "Star Wars filmó escenas de Tatooine aquí."
        ]
    },
    "792": {
        name: "Turquía",
        region: "AS",
        timezone: "Europe/Istanbul",
        facts: [
            "Estambul es la única ciudad del mundo ubicada en dos continentes.",
            "Santa Claus (San Nicolás) nació en Patara, Turquía.",
            "El café turco es Patrimonio Inmaterial de la Humanidad."
        ]
    },
    "795": {
        name: "Turkmenistán",
        region: "AS",
        timezone: "Asia/Ashgabat",
        facts: [
            "Tiene el cráter de gas de Darvaza, conocido como la 'Puerta del Infierno'.",
            "Ashgabat tiene la mayor concentración de edificios de mármol blanco.",
            "El caballo Akhal-Teke es el emblema nacional."
        ]
    },
    "800": {
        name: "Uganda",
        region: "AF",
        timezone: "Africa/Kampala",
        facts: [
            "Es uno de los países más jóvenes del mundo por edad media.",
            "Es el hogar de casi la mitad de los gorilas de montaña del mundo.",
            "El Nilo comienza su viaje aquí, en el lago Victoria."
        ]
    },
    "804": {
        name: "Ucrania",
        region: "EU",
        timezone: "Europe/Kiev",
        facts: [
            "Tiene la estación de metro más profunda del mundo (Arsenalna).",
            "Es conocido como el 'granero de Europa'.",
            "El avión más grande del mundo, el Antonov An-225, fue construido aquí."
        ]
    },
    "784": {
        name: "EAU",
        region: "AS",
        timezone: "Asia/Dubai",
        facts: [
            "Alberga el edificio más alto del mundo, el Burj Khalifa.",
            "Tiene islas artificiales en forma de palmera y mapamundi.",
            "La policía de Dubai usa superdeportivos como patrullas."
        ]
    },
    "826": {
        name: "Reino Unido",
        region: "EU",
        timezone: "Europe/London",
        facts: [
            "El té es la bebida más popular después del agua.",
            "Londres fue la primera ciudad en tener un sistema de metro.",
            "La Reina no necesitaba pasaporte para viajar."
        ]
    },
    "840": {
        name: "Estados Unidos",
        region: "NA",
        timezone: "America/New_York",
        facts: [
            "Tiene la economía más grande del mundo.",
            "El Gran Cañón es visible desde el espacio.",
            "No tiene un idioma oficial a nivel federal."
        ]
    },
    "858": {
        name: "Uruguay",
        region: "SA",
        timezone: "America/Montevideo",
        facts: [
            "Fue el primer país en albergar la Copa Mundial de la FIFA.",
            "Tiene el himno nacional más largo del mundo.",
            "Es el país más secular de América del Sur."
        ]
    },
    "860": {
        name: "Uzbekistán",
        region: "AS",
        timezone: "Asia/Tashkent",
        facts: [
            "Es uno de los dos únicos países doblemente sin salida al mar.",
            "Samarcanda es una de las ciudades más antiguas de Asia Central.",
            "El metro de Tashkent es conocido por su belleza artística."
        ]
    },
    "862": {
        name: "Venezuela",
        region: "SA",
        timezone: "America/Caracas",
        facts: [
            "Tiene el Salto Ángel, la cascada ininterrumpida más alta del mundo.",
            "Tiene las reservas de petróleo probadas más grandes del mundo.",
            "El relámpago del Catatumbo es un fenómeno meteorológico único."
        ]
    },
    "704": {
        name: "Vietnam",
        region: "AS",
        timezone: "Asia/Ho_Chi_Minh",
        facts: [
            "Es el segundo mayor exportador de café del mundo.",
            "La cueva Son Doong es la más grande del mundo.",
            "El apellido Nguyen es usado por el 40% de la población."
        ]
    },
    "732": {
        name: "Sahara Occ.",
        region: "AF",
        timezone: "Africa/El_Aaiun",
        facts: [
            "Es una de las regiones más escasamente pobladas del mundo.",
            "Su estatus político es disputado.",
            "Tiene ricos yacimientos de fosfatos."
        ]
    },
    "887": {
        name: "Yemen",
        region: "AS",
        timezone: "Asia/Aden",
        facts: [
            "Socotra es conocida como las 'Galápagos del Océano Índico'.",
            "Shibam es llamada la 'Manhattan del desierto' por sus rascacielos de barro.",
            "El café Mocha toma su nombre del puerto de Moca en Yemen."
        ]
    },
    "894": {
        name: "Zambia",
        region: "AF",
        timezone: "Africa/Lusaka",
        facts: [
            "Las Cataratas Victoria son una de las siete maravillas naturales.",
            "El río Zambeze es el cuarto más largo de África.",
            "Es uno de los países más seguros para visitar en África."
        ]
    },
    "716": {
        name: "Zimbabue",
        region: "AF",
        timezone: "Africa/Harare",
        facts: [
            "Tiene una de las tasas de alfabetización más altas de África.",
            "El Gran Zimbabue es una antigua ciudad de piedra impresionante.",
            "Tiene una de las mayores poblaciones de elefantes."
        ]
    }
};

export const GLOBAL_FACTS = [
    "La Tierra rota a una velocidad de 1670 km/h en el ecuador.",
    "El Océano Pacífico cubre más área que toda la tierra firme combinada.",
    "Hay más de 7000 idiomas hablados en el mundo hoy en día.",
    "El lugar más seco de la Tierra es el Desierto de Atacama en Chile.",
    "Rusia tiene 11 zonas horarias, más que cualquier otro país.",
    "El Amazonas produce el 20% del oxígeno de la Tierra.",
    "África es el único continente que se extiende por los cuatro hemisferios.",
    "La Antártida es el desierto más grande del mundo.",
    "El 90% de la población mundial vive en el hemisferio norte.",
    "Canadá tiene más lagos que el resto del mundo combinado."
];

export const REGION_COLORS = {
    "AF": "#fcd34d", // Africa (Yellow/Amber)
    "AS": "#f87171", // Asia (Red)
    "EU": "#60a5fa", // Europe (Blue)
    "NA": "#4ade80", // North America (Green)
    "SA": "#a78bfa", // South America (Purple)
    "OC": "#2dd4bf"  // Oceania (Teal)
};
