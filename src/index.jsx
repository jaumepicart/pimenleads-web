import React from 'react';
import {Composition, registerRoot} from 'remotion';
import {Reel, duracionEnFrames, FPS} from './Reel.jsx';

// Cada archivo de videos/ se convierte en un vídeo con el mismo nombre.
const contexto = require.context('../videos', false, /\.json$/);
const videos = contexto.keys().map((clave) => ({
	id: clave.replace('./', '').replace('.json', ''),
	datos: contexto(clave),
}));

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
	</>
);

registerRoot(Raiz);
