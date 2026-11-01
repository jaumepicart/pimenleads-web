import React from 'react';
import {Composition, registerRoot} from 'remotion';
import {Publicacion, Reel, duracionEnFrames, FPS} from './Reel.jsx';

// Cada archivo de videos/ se convierte en un vídeo con el mismo nombre.
const leer = (contexto) =>
	contexto.keys().map((clave) => ({
		id: clave.replace('./', '').replace('.json', ''),
		datos: contexto(clave),
	}));
const videos = leer(require.context('../videos', false, /\.json$/));
// Y cada archivo de publicaciones/, en un carrusel o una imagen: una lámina por fotograma.
const publicaciones = leer(require.context('../publicaciones', false, /\.json$/));

const Raiz = () => (
	<>
		{videos.map(({id, datos}) => (
			<Composition
				key={id}
				id={id}
				component={Reel}
				width={1080}
				height={1920}
				fps={FPS}
				durationInFrames={duracionEnFrames(datos)}
				defaultProps={{datos}}
			/>
		))}
		{publicaciones.map(({id, datos}) => (
			<Composition
				key={id}
				id={id}
				component={Publicacion}
				width={1080}
				height={1350}
				fps={FPS}
				durationInFrames={datos.laminas.length}
				defaultProps={{datos}}
			/>
		))}
	</>
);

registerRoot(Raiz);
