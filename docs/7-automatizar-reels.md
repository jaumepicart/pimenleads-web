# Plan para automatizar la creación de reels y TikToks (31 oct 2026)

**Esta rama es pública en GitHub. No la fusionéis con `main`.** Sigue a [6-redes-sociales.md](6-redes-sociales.md). Los umbrales y las predicciones son **criterio mío**, hasta que haya datos vuestros.

## 1. Mi recomendación

**Automatizad toda la producción y mantened tres controles humanos cortos.** Cada semana sale un lote de vídeos listos para subir, con portada y texto, y vosotros solo los revisáis y los subís. Un mismo archivo sirve para Instagram y TikTok, tal como proponías: se genera sin marca de agua y con el texto dentro de la zona que no tapan ninguna de las dos.

**Lo que hay que probar de verdad es si un vídeo sin personas consigue confianza.** Es la gran duda de automatizarlo todo. En una obra de 30.000 €, y sin marca conocida, sospecho que vuestras caras convertirán mejor, pero no lo sé. Por eso la primera ronda de pruebas enfrenta los formatos automáticos con uno en el que salís vosotros, que solo cuesta 15 minutos por lote.

**Automatizar baja el coste de cada vídeo, pero no garantiza leads.** Siguen valiendo las expectativas de [6-redes-sociales.md](6-redes-sociales.md): 0–2 leads al mes al principio.

## 2. Qué se automatiza y qué no

| Paso | Quién | Tiempo semanal |
|---|---|---|
| Elegir temas según la prueba en curso | Claude | 0 |
| Escribir guion, gancho y texto | Claude | 0 |
| Montar vídeo, portada y texto para pegar | Generador | 0 (corre solo) |
| Anotar qué se está probando en cada vídeo | Generador | 0 |
| **Control 1:** aprobar precios y datos, una sola vez y al cambiar | Vosotros, con 2–3 reformistas | Puntual |
| **Control 2:** revisar el lote | Vosotros | 5–10 min |
| Subir a las dos plataformas | Vosotros | 10–15 min |
| **Control 3:** pasar las estadísticas | Vosotros (capturas o tabla) | 5 min |
| Analizar y decidir el siguiente lote | Claude | 0 |

**Total para vosotros: unos 30 minutos a la semana,** más 15 minutos cada lote si el formato con cara gana.

**Por qué no quitar la revisión:** un dato falso en un vídeo publicado con vuestro nombre cuesta más que esos 10 minutos. Además, Claude no puede saber si algo ha cambiado en vuestras condiciones.

## 3. Qué ya funciona

Generador en esta rama. Cada vídeo es un archivo de texto en `videos/`, con sus escenas. Para crear uno nuevo solo hay que añadir un archivo:

```bash
npm run generar
```

Deja en `salida/<vídeo>/` el `.mp4` (1080×1920), `portada.png` y `texto.txt`, y actualiza `salida/catalogo.csv` con lo que prueba cada vídeo.

- **Vídeos 001 a 006:** formato de impacto, al estilo de Alex Hormozi, cada uno con un gancho distinto. Alex descartó el primer estilo, de diapositivas.
- **Coste:** Remotion es gratis, también para uso comercial, en empresas de hasta 3 empleados. Si pasáis de ahí, hace falta licencia.

## 4. Formatos

| # | Formato | Qué hacéis vosotros | Estado | Hipótesis |
|---|---|---|---|---|
| F1 | Impacto: letras grandes palabra a palabra | Nada | **Listo** | Retiene, pero da poca confianza sin una persona |
| F3 | Precios con barras | Validar rangos | Por construir | El que más responde a lo que se busca |
| F4 | Vuestra voz sobre animación | Grabar audio con el móvil, 10 min por lote | Por construir | Buen equilibrio entre coste y confianza |
| F5 | Vosotros a cámara, con cortes y subtítulos automáticos | Grabar 15 min por lote | Por construir | **El que más confianza y leads dará** |
| F6 | Fotos reales de obras | Conseguir fotos con permiso | Por construir | Fuerte, pero depende de las empresas |

**Formatos que descarto:**

- **Avatares de IA o clones de Alex y Jaume:** vuestra promesa es «hablas con personas reales». Fingirlo la destruye. Además, TikTok exige etiquetar el contenido realista hecho con IA, y el artículo 50 del Reglamento de IA europeo ya obliga a avisar de los deepfakes.
- **Renders de IA de reformas o «antes y después» inventados:** presentados como obras, son publicidad engañosa.
- **Voz sintética:** la dejo fuera de la primera ronda. La de vuestro propio móvil es gratis y es la vuestra. Solo la probaría, etiquetada, si grabar audio resulta ser el freno.
- **Decenas de vídeos al día:** Instagram limita a quien publica sobre todo contenido no original. Vuestras piezas sí son originales, pero publicar en masa desde una cuenta pequeña solo produce datos más ruidosos. Con 4 por semana basta.

## 5. Cómo probar estrategias sin engañarse

Con pocas visualizaciones, el azar pesa mucho: un vídeo puede multiplicar por diez a otro igual. Hay que respetar tres reglas:

1. **Una variable por ronda.**
2. **Al menos 3 vídeos por opción, comparando medianas,** nunca un vídeo contra otro.
3. **Mismas condiciones:** mismo tipo de tema, duración parecida, y días y horas alternos.

| Ronda | Qué se prueba | Opciones | Vídeos | Semanas |
|---|---|---|---|---|
| 1 | **Formato** | F1, F4, F5 | 9 | 3 |
| 2 | **Gancho** | Pregunta de precio · Aviso («no firmes») · Curiosidad · Barrio concreto | 12 | 3 |
| 3 | **Tema y público** | Precios · Evitar sustos · Comprar piso a reformar · Obras reales | 12 | 3 |
| 4 | **Llamada a la acción** | Enlace · Palabra por mensaje · Revisar tu presupuesto por WhatsApp | 9 | 3 |

**12 semanas y 42 vídeos** dan una fórmula con base real. F3 entra cuando los precios estén validados; F6, cuando haya fotos.

### Qué mirar y en qué orden

Hasta la ronda 4 habrá muy pocos leads para decidir por ellos, así que usamos señales intermedias:

| Medida | Por qué | Ganador |
|---|---|---|
| Retención media | Si no lo ven, nada más importa | 1,5 veces la mediana de las demás opciones |
| Envíos + guardados por 1.000 visualizaciones | Mosseri cita los envíos como señal clave para llegar a quien no os sigue | Ídem |
| Visitas al perfil por 1.000 visualizaciones | La señal más cercana a un lead | Ídem |
| Público de Barcelona | Las vistas de fuera no sirven | 40 % o más en la cuenta |
| **Leads válidos** | Lo único que paga. **Manda sobre todo lo demás en cuanto haya suficientes** | Panel |

**Si nada gana,** se queda la opción más barata de producir. **Si un formato gana en visualizaciones pero solo otro trae leads,** gana el que trae leads.

**Cuándo parar (semana 12):** menos de 3 leads válidos y menos de un 40 % de público de Barcelona. En ese caso, bajaríamos a 1 vídeo semanal, como escaparate, y el tiempo iría a prescriptores.

### Saber qué vídeo trajo cada lead

Un enlace en la bio no distingue el vídeo. Se resuelve así:

- **Palabra distinta en cada ronda** («escribe PRECIO», «escribe BAÑO»), si es por mensaje.
- **Texto de WhatsApp propio** para Instagram y TikTok.
- **Preguntar en la llamada:** «¿Qué vídeo viste?». Anotadlo en el panel. Es lo más fiable y no cuesta nada.

## 6. La rutina semanal

| Día | Qué pasa |
|---|---|
| Lunes | Se genera el lote: 4 vídeos con portada y texto |
| Lunes o martes | Revisáis (10 min). Lo que no guste se corrige por escrito y se regenera |
| Martes a viernes | Subís un vídeo en cada plataforma. Añadid audio de la biblioteca de la app si no lleva voz |
| Domingo | Pasáis capturas de las estadísticas de la semana. Instagram da los datos pasados unos días, así que el vídeo del viernes se mide la semana siguiente |
| Lunes | Claude lo analiza y prepara el siguiente lote |

**Audio:** los vídeos F1 y F2 salen sin sonido. Lo más sencillo es añadir un audio de la biblioteca comercial de cada aplicación al subirlos. Si preferís no hacerlo, se puede incluir una pista con licencia en el generador.

## 7. Normas que debe cumplir cada vídeo

Claude las aplica al escribir y vosotros las comprobáis al revisar:

- **Sin precios sin validar.** Hoy los rangos no cuadran. Hasta que estén en un archivo aprobado por vosotros, solo se usan importes de ejemplo y marcados como tal.
- **Solo promesas que ya hace la web:** «primero hablas con Alex o Jaume», «gratis», «sin compromiso», «hasta 3 presupuestos».
- **Sin «empresas revisadas»** hasta haber comprobado cada empresa.
- **Sin «te pagamos» ni la bonificación** sin sus condiciones al lado.
- **Sin clientes, reseñas ni obras inventadas.**
- **Sin datos legales o técnicos no comprobados** (permisos, plazos, normativa).
- **Barcelona o un barrio en la primera frase.**

## 8. Temas para las primeras rondas

**Sin precios (se pueden publicar ya):**

1. 5 preguntas antes de firmar un presupuesto *(hecho)*
2. Si tu presupuesto pone esto, no firmes *(hecho)*
3. Cómo comparar 3 presupuestos de reforma
4. El presupuesto más barato no siempre lo es
5. Qué pedirle a una empresa de reformas antes de contratarla
6. Señales de que una empresa de reformas no es seria
7. Qué pasa si aparece un imprevisto en mitad de la obra
8. Cómo pagar una reforma por partes
9. Bañera o plato de ducha: qué tener en cuenta
10. Vas a comprar un piso para reformar: 5 cosas que mirar antes de las arras
11. Cómo saber si un piso a reformar te sale a cuenta
12. Si es gratis, ¿de qué ganamos dinero? *(revisar con vuestros acuerdos)*

**Con precios validados:**

13. Cuánto cuesta reformar un baño de 5 m² en Barcelona
14. Cuánto cuesta reformar una cocina en Barcelona
15. Cuánto cuesta reformar un piso de 80 m² en Barcelona
16. Dónde se va el dinero en una reforma
17. Por qué dos presupuestos del mismo baño son tan distintos

**Necesitan comprobación de un dato legal:**

18. ¿Necesitas permiso de obras en Barcelona para reformar un baño?
19. ¿Hay ayudas para reformar en Barcelona?
20. Reforma en una comunidad de vecinos: qué tienes que avisar

## 9. Qué hay que construir

| Fase | Qué | Cuándo |
|---|---|---|
| 1 | Generar y publicar del 001 al 006, y revisarlos antes en un móvil | Semana 1 |
| 2 | **F5 y F4:** recibir vuestras grabaciones, transcribirlas, quitar silencios y poner subtítulos, marca y cierre. Requiere instalar un transcriptor local (Whisper) | Semana 1–2, antes de empezar la ronda 1 |
| 3 | Tabla de estadísticas e informe semanal con ganadores | Semana 2 |
| 4 | Lote de los lunes como tarea programada, para que aparezca solo si el Mac está encendido | Semana 3 |
| 5 | F3 y F6, cuando haya precios validados y fotos | Según lleguen |
| Más adelante | Leer estadísticas por API y publicar solo. No lo haría aún: exige cuentas de empresa conectadas y aprobación, y subir a mano solo cuesta unos minutos | Si llega a compensar |

## 10. Riesgos

- **Dónde generar:** en el Mac con M5 de Jaume. También funciona en el Mac Intel de Alex, con macOS 13: allí un lote de 4 tarda unos 10 minutos. Remotion pide macOS 15, por eso sus fotogramas los codifica `ffmpeg-static`. No se ha probado aún en Apple Silicon.
- **F4 y F5:** se construyen en el Mac con M5 y con una grabación real, donde sí funciona el codificador de Remotion.
- **Reglas de las plataformas y legales:** cambian a menudo, y casi todo lo publicado viene de blogs. Consultad con el gestor el etiquetado de IA y cómo anunciar la bonificación si se usan.
- **Empresas:** el panel marca 0 activas. Sin ellas, un lead se pierde. Sigue siendo lo primero.

## Fuentes

- [Reglamento de IA: art. 50 y Digital Omnibus (Orrick)](https://www.orrick.com/en/Insights/2026/05/EUs-Digital-Omnibus-on-AI-7-Key-Changes-You-Need-to-Know)
- [Normas de TikTok sobre contenido de IA, resumen de terceros](https://www.echotik.live/blog/tiktok-ai-content-labeling-rules-2026/)
- [Etiquetar contenido de IA en redes (Metricool)](https://metricool.com/how-to-label-ai-content/)
- [Instagram limita las cuentas de contenido no original (eMarketer)](https://www.emarketer.com/content/instagram-s-algorithm-clamps-down-on-repurposed--unoriginal-photos-posts)
- [IAB Spain 2026, resumen de PPC Land](https://ppc.land/spains-social-media-users-jump-to-7-2-platforms-but-42-quit-at-least-one/)
- [Licencia de Remotion](https://www.remotion.dev/docs/license)
