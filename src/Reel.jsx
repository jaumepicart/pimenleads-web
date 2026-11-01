import React from 'react';
import {AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {loadFont as cargarTitular} from '@remotion/google-fonts/BricolageGrotesque';
import {loadFont as cargarTexto} from '@remotion/google-fonts/PublicSans';

export const FPS = 30;

const {fontFamily: TITULAR} = cargarTitular('normal', {weights: ['800'], subsets: ['latin', 'latin-ext']});
const {fontFamily: TEXTO} = cargarTexto('normal', {weights: ['500', '700'], subsets: ['latin', 'latin-ext']});

// Colores de la web (assets/styles.css).
const C = {
	papel: '#f2f6f5',
	blanco: '#ffffff',
	tinta: '#0f1f1e',
	apagado: '#4a5d5b',
	linea: '#cfdcd9',
	teal: '#0d5c58',
	tealOscuro: '#093f3c',
	acento: '#f0b429',
	sobreTeal: '#eaf5f3',
	error: '#b3261e',
};

// Las interfaces de Instagram y TikTok tapan arriba, abajo y el lado derecho.
const MARGEN = {arriba: 250, abajo: 430, izquierda: 80, derecha: 130};

export const duracionEnFrames = (datos) =>
	datos.escenas.reduce((total, e) => total + Math.round(e.segundos * FPS), 0);

const useEntrada = (retraso = 0) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	// Empieza ya avanzado: sin esto, el primer fotograma de cada escena sale vacío.
	return spring({frame: frame - retraso + 5, fps, config: {damping: 16, stiffness: 130}});
};

const Aparece = ({retraso = 0, children, style}) => {
	const e = useEntrada(retraso);
	return (
		<div style={{opacity: e, transform: `translateY(${interpolate(e, [0, 1], [46, 0])}px)`, ...style}}>
			{children}
		</div>
	);
};

// **así** resalta una parte del texto.
const Resaltado = ({texto, color}) =>
	texto.split('**').map((parte, i) =>
		i % 2 ? (
			<span key={i} style={{color}}>
				{parte}
			</span>
		) : (
			<span key={i}>{parte}</span>
		)
	);

const Marca = ({oscuro}) => {
	const colores = oscuro
		? [C.teal, C.acento, C.teal, C.teal]
		: [C.sobreTeal, C.acento, C.sobreTeal, C.sobreTeal];
	return (
		<div style={{display: 'flex', alignItems: 'center', gap: 20}}>
			<div style={{display: 'grid', gridTemplateColumns: '26px 26px', gap: 5}}>
				{colores.map((c, i) => (
					<div key={i} style={{width: 26, height: 26, borderRadius: 7, background: c}} />
				))}
			</div>
			<div style={{fontFamily: TITULAR, fontWeight: 800, fontSize: 40, color: oscuro ? C.tinta : C.sobreTeal}}>
				Pimen Reformas
			</div>
		</div>
	);
};

const Lienzo = ({fondo, oscuro, justificar = 'center', children}) => (
	<AbsoluteFill style={{background: fondo, fontFamily: TEXTO}}>
		<div
			style={{
				position: 'absolute',
				top: MARGEN.arriba,
				bottom: MARGEN.abajo,
				left: MARGEN.izquierda,
				right: MARGEN.derecha,
				display: 'flex',
				flexDirection: 'column',
			}}
		>
			<Marca oscuro={oscuro} />
			<div style={{flex: 1, display: 'flex', flexDirection: 'column', justifyContent: justificar, paddingTop: 40}}>
				{children}
			</div>
		</div>
	</AbsoluteFill>
);

const Gancho = ({texto, apoyo}) => {
	const frame = useCurrentFrame();
	const zoom = interpolate(frame, [0, 120], [1, 1.04], {extrapolateRight: 'clamp'});
	return (
		<Lienzo fondo={C.tealOscuro}>
			<div style={{transform: `scale(${zoom})`, transformOrigin: 'left center'}}>
				<Aparece>
					<div style={{fontFamily: TITULAR, fontWeight: 800, fontSize: 104, lineHeight: 1.06, letterSpacing: -2, color: C.blanco}}>
						<Resaltado texto={texto} color={C.acento} />
					</div>
				</Aparece>
				{apoyo ? (
					<Aparece retraso={14} style={{marginTop: 44}}>
						<div style={{fontSize: 50, fontWeight: 500, color: C.sobreTeal}}>{apoyo}</div>
					</Aparece>
				) : null}
			</div>
		</Lienzo>
	);
};

const Paso = ({n, total, titulo, detalle}) => (
	<Lienzo fondo={C.tealOscuro} justificar="flex-start">
		<Aparece style={{marginTop: 170}}>
			<div style={{display: 'flex', gap: 12, marginBottom: 56}}>
				{Array.from({length: total}).map((_, i) => (
					<div key={i} style={{flex: 1, height: 12, borderRadius: 6, background: i < n ? C.acento : C.teal}} />
				))}
			</div>
			<div style={{fontFamily: TITULAR, fontWeight: 800, fontSize: 70, color: C.acento, marginBottom: 22}}>{n}</div>
			<div style={{fontFamily: TITULAR, fontWeight: 800, fontSize: 96, lineHeight: 1.06, letterSpacing: -2, color: C.blanco}}>
				{titulo}
			</div>
		</Aparece>
		<Aparece retraso={12} style={{marginTop: 44}}>
			<div style={{fontSize: 52, lineHeight: 1.28, fontWeight: 500, color: C.sobreTeal}}>{detalle}</div>
		</Aparece>
	</Lienzo>
);

const Fila = ({etiqueta, valor, retraso, marca}) => (
	<Aparece retraso={retraso}>
		<div
			style={{
				display: 'flex',
				justifyContent: 'space-between',
				alignItems: 'center',
				gap: 24,
				padding: '30px 0',
				borderBottom: `3px solid ${C.linea}`,
				fontSize: 46,
				lineHeight: 1.2,
				fontWeight: 700,
				color: C.tinta,
			}}
		>
			<span style={{display: 'flex', alignItems: 'center', gap: 22}}>
				{marca ? <span style={{color: C.teal, fontSize: 52}}>✓</span> : null}
				{etiqueta}
			</span>
			{valor ? <span style={{whiteSpace: 'nowrap'}}>{valor}</span> : null}
		</div>
	</Aparece>
);

const Documento = ({titular, nota, filas, aviso, marcar}) => {
	const e = useEntrada(0);
	return (
		<Lienzo fondo={C.tealOscuro}>
			<Aparece>
				<div style={{fontFamily: TITULAR, fontWeight: 800, fontSize: 76, lineHeight: 1.08, letterSpacing: -1, color: C.blanco, marginBottom: 44}}>
					<Resaltado texto={titular} color={C.acento} />
				</div>
			</Aparece>
			<div
				style={{
					background: C.blanco,
					borderRadius: 28,
					padding: '44px 48px',
					transform: `scale(${interpolate(e, [0, 1], [0.96, 1])})`,
					opacity: e,
				}}
			>
				<div style={{display: 'flex', justifyContent: 'space-between', fontSize: 32, fontWeight: 700, color: C.apagado, letterSpacing: 2}}>
					<span>PRESUPUESTO</span>
					{nota ? <span>{nota}</span> : null}
				</div>
				{filas.map((f, i) => (
					<Fila key={i} etiqueta={f.etiqueta} valor={f.valor} marca={marcar} retraso={10 + i * (f.pausa ?? 16)} />
				))}
				{aviso ? (
					<Aparece retraso={34}>
						<div style={{marginTop: 34, fontSize: 48, fontWeight: 700, color: C.error}}>{aviso}</div>
					</Aparece>
				) : null}
			</div>
		</Lienzo>
	);
};

const Cierre = ({titular, lineas, accion}) => (
	<Lienzo fondo={C.papel} oscuro>
		<Aparece>
			<div style={{fontFamily: TITULAR, fontWeight: 800, fontSize: 92, lineHeight: 1.06, letterSpacing: -2, color: C.tinta}}>
				<Resaltado texto={titular} color={C.teal} />
			</div>
		</Aparece>
		{lineas.map((l, i) => (
			<Aparece key={i} retraso={12 + i * 8} style={{marginTop: i ? 16 : 44}}>
				<div style={{fontSize: 48, lineHeight: 1.25, fontWeight: 500, color: C.apagado}}>{l}</div>
			</Aparece>
		))}
		<Aparece retraso={32} style={{marginTop: 56}}>
			<div
				style={{
					display: 'inline-block',
					padding: '30px 46px',
					borderRadius: 22,
					background: C.acento,
					color: '#1a1405',
					fontSize: 52,
					fontWeight: 700,
				}}
			>
				{accion}
			</div>
		</Aparece>
	</Lienzo>
);

const ESCENAS = {gancho: Gancho, paso: Paso, documento: Documento, cierre: Cierre};

export const Reel = ({datos}) => {
	let inicio = 0;
	return (
		<AbsoluteFill>
			{datos.escenas.map(({tipo, segundos, ...props}, i) => {
				const Escena = ESCENAS[tipo];
				const duracion = Math.round(segundos * FPS);
				const desde = inicio;
				inicio += duracion;
				return (
					<Sequence key={i} from={desde} durationInFrames={duracion}>
						<Escena {...props} />
					</Sequence>
				);
			})}
		</AbsoluteFill>
	);
};
