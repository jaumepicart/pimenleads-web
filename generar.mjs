// Genera lo que falte de cada archivo de videos/: vídeo, portada y texto para pegar al publicar.
// Uso: npm run generar            (todos los que falten)
//      npm run generar -- 003     (solo los que empiecen por 003, aunque ya existan)
//
// El ffmpeg que trae Remotion exige macOS 15. Por eso Remotion solo saca los fotogramas
// y el vídeo se codifica con ffmpeg-static, que funciona también en Macs más antiguos.
import {execFileSync} from 'node:child_process';
import {existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync} from 'node:fs';
import ffmpeg from 'ffmpeg-static';

const filtro = process.argv[2];
// El navegador recién descargado puede tardar demasiado en arrancar la primera vez: se reintenta.
const INTENTOS = 3;
const remotion = (...args) => {
	for (let intento = 1; ; intento++) {
		try {
			return execFileSync('npx', ['remotion', ...args], {stdio: 'inherit'});
		} catch (error) {
			if (intento === INTENTOS) throw error;
			console.log(`Ha fallado el intento ${intento} de ${INTENTOS}. Se vuelve a probar...`);
		}
	}
};
const celda = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`;

const archivos = readdirSync('videos').filter((a) => a.endsWith('.json')).sort();
const filas = [['video', 'serie', 'formato', 'gancho', 'publico', 'segundos'].join(',')];

function codificar(fotogramas, destino) {
	const primero = readdirSync(fotogramas).filter((a) => a.endsWith('.jpeg')).sort()[0];
	const cifras = primero.match(/(\d+)\.jpeg$/)[1].length;
	const patron = primero.replace(/\d+\.jpeg$/, `%0${cifras}d.jpeg`);
	execFileSync(ffmpeg, [
		'-y', '-v', 'error',
		'-framerate', '30', '-start_number', String(Number(primero.match(/(\d+)\.jpeg$/)[1])), '-i', `${fotogramas}/${patron}`,
		// Pista de audio en silencio: algunas aplicaciones van mejor con una, y al subir se puede sustituir.
		'-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
		'-shortest', '-c:v', 'libx264', '-crf', '20', '-preset', 'medium', '-pix_fmt', 'yuv420p',
		'-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart',
		destino,
	], {stdio: 'inherit'});
}

for (const archivo of archivos) {
	const id = archivo.replace('.json', '');
	const datos = JSON.parse(readFileSync(`videos/${archivo}`, 'utf8'));
	const segundos = datos.escenas.reduce((t, e) => t + e.segundos, 0);
	const {serie, formato, gancho, publico} = datos.prueba;
	filas.push([id, serie, formato, gancho, publico, segundos].map(celda).join(','));

	const carpeta = `salida/${id}`;
	const elegido = filtro ? id.startsWith(filtro) : !existsSync(`${carpeta}/${id}.mp4`);
	if (!elegido) continue;

	const fotogramas = `${carpeta}/_fotogramas`;
	rmSync(fotogramas, {recursive: true, force: true});
	mkdirSync(carpeta, {recursive: true});
	remotion('render', 'src/index.jsx', id, fotogramas, '--sequence', '--image-format=jpeg', '--jpeg-quality=95');
	codificar(fotogramas, `${carpeta}/${id}.mp4`);
	rmSync(fotogramas, {recursive: true});
	remotion('still', 'src/index.jsx', id, `${carpeta}/portada.png`, '--frame=45');
	writeFileSync(`${carpeta}/texto.txt`, `${datos.texto}\n`);
}

writeFileSync('salida/catalogo.csv', `${filas.join('\n')}\n`);
